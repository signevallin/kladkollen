/**
 * Genererar basplaggs-flatlays för Snabbstart-biblioteket.
 *
 * Flöde per (kön, plagg, färg) ur utils/basics.ts:
 *   1. Flux (Replicate) genererar en flatlay på vit botten.
 *   2. Samma rembg-modell som appen (cjwbw/rembg) tar bort bakgrunden → PNG med alpha.
 *   3. Bilden laddas upp till garments-bucketen på exakt sökväg
 *      (basics/{kön}/{id}/{färg-slug}.png) – samma som appen läser.
 *
 * Kör LOKALT (inte i appen). Sandbox/CI når inte Replicate/Supabase.
 *
 * Krav:
 *   - Node 18+ (global fetch).
 *   - npx tsx (körs som TypeScript): `npx tsx scripts/generate-basics.ts`
 *   - Env:
 *       REPLICATE_API_TOKEN=...             (från replicate.com)
 *       SUPABASE_URL=https://<ref>.supabase.co
 *       SUPABASE_SERVICE_ROLE_KEY=...       (Service role – server-nyckel, dela ALDRIG)
 *
 * Flaggor:
 *   --force            Generera om och skriv över även bilder som redan finns.
 *   --only=<filter>    Kör bara poster vars id ELLER kön matchar (t.ex. --only=women, --only=w-tshirt).
 *   --model=<path>     Byt Flux-modell (default black-forest-labs/flux-1.1-pro).
 *   --concurrency=<n>  Antal parallella (default 3).
 *   --dry              Skriv bara ut prompterna, generera/ladda inte upp.
 *
 * Exempel:
 *   REPLICATE_API_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/generate-basics.ts --only=women
 */

import { createClient } from '@supabase/supabase-js'

// basics.ts använder RN-globalen __DEV__ i en dev-sanity-check. Sätt den innan
// vi dynamiskt importerar filen (statisk import skulle köra modulen först och
// kasta ReferenceError).
;(globalThis as any).__DEV__ = false

const BUCKET = 'garments'
const REPLICATE = 'https://api.replicate.com/v1'
const REMBG_MODEL = process.env.REPLICATE_MODEL || 'cjwbw/rembg'

// ── Argument ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const has = (f: string) => args.includes(f)
const val = (f: string) => { const a = args.find(x => x.startsWith(`${f}=`)); return a ? a.split('=').slice(1).join('=') : undefined }
const FORCE = has('--force')
const DRY = has('--dry')
const ONLY = val('--only')?.toLowerCase()
// Rikta in på enskilda färger (färg-slugs, komma-separerat), t.ex. --color=gra,morkbla
const ONLY_COLORS = val('--color')?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
// Slå om med ny slumpseed (den fasta seed:en kan fastna på en dålig komposition
// för vissa färger). Kombinera med --only/--color/--force för att bara göra om
// de plagg/färger som blev dåliga.
const REROLL = has('--reroll')
// Färga om en BEFINTLIG basplaggsbild till målfärgen i stället för att generera
// från grunden. --from=<färg-slug> = källbilden (samma plagg, annan färg som
// redan blev bra). Behåller form/komposition, byter bara färg (Flux Kontext).
// Ex: --only=m-balte --color=svart --from=brun --force
const FROM = val('--from')?.trim().toLowerCase()
const KONTEXT_MODEL = val('--edit-model') || 'black-forest-labs/flux-kontext-pro'
const FLUX_MODEL = val('--model') || 'black-forest-labs/flux-1.1-pro'
const CONCURRENCY = Math.max(1, Number(val('--concurrency') || 2))
// Replicate strypter konton med < $5 kredit till 6 skapade prediktioner/minut
// (burst 1). Vi pacar därför ALLA skapa-anrop globalt. Höj med --rpm när du har
// kredit (t.ex. --rpm=60 --concurrency=5).
const RPM = Math.max(1, Number(val('--rpm') || 6))
const MIN_GAP_MS = Math.ceil(60000 / RPM)

// ── Prompt-ordböcker (svensk källa → engelsk prompt-term) ───────────────────
const COLOR_EN: Record<string, string> = {
  'Svart': 'black', 'Vit': 'white', 'Grå': 'light heather grey (soft grey marl)',
  'Beige': 'beige', 'Brun': 'brown', 'Blå': 'blue', 'Mörkblå': 'dark navy blue',
}
const GARMENT_EN: Record<string, string> = {
  'T-shirt': 't-shirt', 'Linne': 'tank top', 'Blus': 'blouse', 'Skjorta': 'button-up shirt',
  'Stickad tröja': 'knit sweater', 'Sweatshirt': 'sweatshirt', 'Kofta': 'cardigan',
  'Jeans': 'jeans', 'Kostymbyxor': 'tailored trousers', 'Chinos': 'chinos', 'Leggings': 'leggings',
  'Midikjol': 'midi skirt', 'Vardagsklänning': 'casual day dress', 'Festklänning': 'cocktail dress',
  'Blazer': 'blazer', 'Trenchcoat': 'trench coat', 'Kappa': 'wool coat', 'Vinterjacka': 'winter jacket',
  'Läderjacka': 'leather jacket', 'Sneakers': 'pair of sneakers', 'Boots': 'pair of ankle boots',
  'Pumps': 'pair of pump heels', 'Ballerinaskor': 'pair of ballet flats', 'Handväska': 'handbag',
  'Halsduk': 'scarf', 'Piké': 'polo shirt', 'Hoodie': 'hoodie', 'Mjukisbyxor': 'sweatpants',
  'Chinosshorts': 'chino shorts', 'Kavaj': 'suit blazer', 'Kostymjacka': 'suit jacket',
  'Pufferjacka': 'puffer jacket', 'Loafers': 'pair of loafers', 'Ryggsäck': 'backpack',
  'Bälte': 'belt', 'Keps': 'baseball cap', 'Mössa': 'beanie',
}

// Plagg där grå ska vara enfärgat (vävt) snarare än gråmelerat (jersey).
const SOLID_GREY = new Set(['Jeans', 'Kostymbyxor', 'Chinos', 'Kavaj', 'Kostymjacka'])

function promptFor(genderEn: string, colorSv: string, item: { name: string; promptHint?: string }): string {
  let color = COLOR_EN[colorSv] || colorSv.toLowerCase()
  if (colorSv === 'Grå' && SOLID_GREY.has(item.name)) color = 'solid mid grey (not heather)'
  const garment = GARMENT_EN[item.name] || item.name.toLowerCase()
  return [
    `Top-down flatlay of a single ${color} ${genderEn} ${garment},`,
    item.promptHint ? `${item.promptHint},` : '',
    'laid flat and perfectly centered on a plain pure white seamless background,',
    'front view, symmetrical, realistic seams and natural fabric folds,',
    'soft even studio lighting, no person, no hanger, no props, no text, no logo, minimal shadow,',
    'photorealistic e-commerce catalogue product photo.',
  ].filter(Boolean).join(' ')
}

// Långa plagg (byxor/leggings) genereras i stående format så modellen kan lägga
// dem i full längd i stället för att vika ihop dem (huvudorsaken till vikta/
// felvända byxor i fyrkantigt format).
const TALL = new Set(['Jeans', 'Kostymbyxor', 'Chinos', 'Leggings', 'Mjukisbyxor'])
function aspectFor(name: string): string { return TALL.has(name) ? '3:4' : '1:1' }

// Deterministisk seed per (id,färg) så omkörningar blir reproducerbara.
function seedFrom(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return Math.abs(h) % 2_000_000_000
}

// ── Replicate ───────────────────────────────────────────────────────────────
function reqEnv(name: string): string {
  const v = process.env[name]
  if (!v) { console.error(`✗ Saknar env-variabel ${name}`); process.exit(1) }
  return v
}

const RC_TOKEN = DRY ? '' : reqEnv('REPLICATE_API_TOKEN')

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Global takt-grind: minst MIN_GAP_MS mellan varje skapat prediktions-anrop
// (throttlen gäller ALLA create-anrop, dvs både Flux och rembg).
let nextSlot = 0
async function rateGate() {
  const now = Date.now()
  const wait = Math.max(0, nextSlot - now)
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS
  if (wait) await sleep(wait)
}

// Hämtar (och cachar) en modells senaste version-id. Behövs för community-
// modeller (t.ex. cjwbw/rembg) som inte går att köra via modell-scopade
// endpointen – bara via /v1/predictions med version (samma som appen gör).
const versionCache = new Map<string, string>()
async function resolveVersion(modelPath: string): Promise<string> {
  if (versionCache.has(modelPath)) return versionCache.get(modelPath)!
  const r = await fetch(`${REPLICATE}/models/${modelPath}`, { headers: { Authorization: `Bearer ${RC_TOKEN}` } })
  const j: any = await r.json()
  const v = j?.latest_version?.id
  if (!v) throw new Error(`Ingen körbar version hittad för ${modelPath}`)
  versionCache.set(modelPath, v)
  return v
}

// Skapar en prediktion med takt-grind + retry vid strypning (429/"throttled").
// Provar först den modell-scopade endpointen (funkar för officiella modeller som
// Flux). Ger den 404 (community-modell) → faller tillbaka på version-endpointen.
async function createPrediction(modelPath: string, input: Record<string, unknown>): Promise<any> {
  const MAX_RETRIES = 8
  let useVersion = false
  for (let attempt = 0; ; attempt++) {
    await rateGate()
    let res: Response
    if (useVersion) {
      const version = await resolveVersion(modelPath)
      res = await fetch(`${REPLICATE}/predictions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RC_TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
        body: JSON.stringify({ version, input }),
      })
    } else {
      res = await fetch(`${REPLICATE}/models/${modelPath}/predictions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RC_TOKEN}`, 'Content-Type': 'application/json', Prefer: 'wait' },
        body: JSON.stringify({ input }),
      })
    }
    const body: any = await res.json()
    if (res.ok) return body
    const detail = String(body?.detail || res.status)
    // Modell-scopad endpoint saknas för modellen → byt till version-endpointen.
    if (!useVersion && (res.status === 404 || /could not be found|not found/i.test(detail))) {
      useVersion = true
      continue
    }
    const throttled = res.status === 429 || /throttl/i.test(detail)
    if (throttled && attempt < MAX_RETRIES) {
      const m = detail.match(/resets in ~?(\d+)\s*s/i)
      const waitMs = (m ? Number(m[1]) : Math.min(30, 2 ** attempt)) * 1000 + 1000
      await sleep(waitMs)
      continue
    }
    throw new Error(`Replicate ${modelPath}: ${detail}`)
  }
}

async function replicateRun(modelPath: string, input: Record<string, unknown>): Promise<string> {
  // Modell-scopad endpoint använder modellens senaste version automatiskt.
  let pred: any = await createPrediction(modelPath, input)

  // Poll tills terminal status (om Prefer: wait inte hann klart).
  while (pred.status !== 'succeeded' && pred.status !== 'failed' && pred.status !== 'canceled') {
    await new Promise(r => setTimeout(r, 2000))
    const p = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${RC_TOKEN}` } })
    pred = await p.json()
  }
  if (pred.status !== 'succeeded') throw new Error(`Replicate ${modelPath} ${pred.status}: ${pred?.error || ''}`)

  const out = pred.output
  const url = Array.isArray(out) ? out[0] : out
  if (typeof url !== 'string') throw new Error(`Replicate ${modelPath}: oväntat output`)
  return url
}

// ── Supabase ────────────────────────────────────────────────────────────────
const supa = DRY ? null : createClient(reqEnv('SUPABASE_URL'), reqEnv('SUPABASE_SERVICE_ROLE_KEY'))

const listCache = new Map<string, Set<string>>()
async function fileExists(dir: string, file: string): Promise<boolean> {
  if (!supa) return false
  if (!listCache.has(dir)) {
    const { data } = await supa.storage.from(BUCKET).list(dir)
    listCache.set(dir, new Set((data || []).map(f => f.name)))
  }
  return listCache.get(dir)!.has(file)
}

// ── Enkel concurrency-pool ──────────────────────────────────────────────────
async function pMap<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx) }
  })
  await Promise.all(workers)
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const basics = await import('../utils/basics') as typeof import('../utils/basics')
  const genders: import('../utils/basics').BasicGender[] = ['women', 'men']

  type Job = { gender: import('../utils/basics').BasicGender; genderEn: string; item: import('../utils/basics').BasicItem; color: string; path: string; dir: string; file: string }
  const jobs: Job[] = []
  for (const gender of genders) {
    const genderEn = gender === 'men' ? "men's" : "women's"
    for (const item of basics.basicsFor(gender)) {
      for (const color of item.colors) {
        if (ONLY && !(item.id.toLowerCase().includes(ONLY) || gender === ONLY)) continue
        const path = basics.basicImagePath(gender, item, color)
        const slash = path.lastIndexOf('/')
        const file = path.slice(slash + 1)
        if (ONLY_COLORS && !ONLY_COLORS.includes(file.replace(/\.png$/i, ''))) continue
        jobs.push({ gender, genderEn, item, color, path, dir: path.slice(0, slash), file })
      }
    }
  }

  console.log(`${jobs.length} bilder att processa (Flux: ${FLUX_MODEL}, rembg: ${REMBG_MODEL}, force=${FORCE}, dry=${DRY})\n`)

  let done = 0, skipped = 0, failed = 0
  await pMap(jobs, CONCURRENCY, async (job) => {
    const label = `${job.path}`
    const prompt = promptFor(job.genderEn, job.color, job.item)
    if (DRY) { console.log(`· ${label}\n   ${prompt}`); return }
    try {
      if (!FORCE && await fileExists(job.dir, job.file)) { skipped++; console.log(`↷ finns redan, hoppar: ${label}`); return }
      let whiteUrl: string
      if (FROM) {
        // Färga om en befintlig bild i stället för att generera från grunden.
        const srcPath = `basics/${job.gender}/${job.item.id}/${FROM}.png`
        const signed = await supa!.storage.from(BUCKET).createSignedUrl(srcPath, 900)
        if (signed.error || !signed.data?.signedUrl) throw new Error(`källbild saknas: ${srcPath}`)
        const colorEn = COLOR_EN[job.color] || job.color.toLowerCase()
        const garmentEn = GARMENT_EN[job.item.name] || job.item.name.toLowerCase()
        const editPrompt = `Change only the colour of this ${garmentEn} to solid ${colorEn}. Keep the exact same shape, angle, composition, metal buckle and hardware, stitching, framing and background identical — recolour the leather/fabric only, do not change anything else.`
        whiteUrl = await replicateRun(KONTEXT_MODEL, { prompt: editPrompt, input_image: signed.data.signedUrl, output_format: 'png' })
      } else {
        whiteUrl = await replicateRun(FLUX_MODEL, {
          prompt,
          aspect_ratio: aspectFor(job.item.name),
          output_format: 'png',
          prompt_upsampling: false,
          seed: REROLL ? Math.floor(Math.random() * 2_000_000_000) : seedFrom(`${job.gender}:${job.item.id}:${job.color}`),
        })
      }
      const cutUrl = await replicateRun(REMBG_MODEL, { image: whiteUrl })
      const bytes = new Uint8Array(await (await fetch(cutUrl)).arrayBuffer())
      const { error } = await supa!.storage.from(BUCKET).upload(job.path, bytes, { contentType: 'image/png', upsert: true })
      if (error) throw error
      done++; console.log(`✓ ${label}`)
    } catch (e: any) {
      failed++; console.error(`✗ ${label}: ${e?.message || e}`)
    }
  })

  console.log(`\nKlart. ${done} skapade, ${skipped} hoppade, ${failed} misslyckade.`)
  if (failed) process.exitCode = 1
}

main().catch(e => { console.error(e); process.exit(1) })
