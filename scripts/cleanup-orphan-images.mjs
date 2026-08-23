#!/usr/bin/env node
/**
 * Städar bort föräldralösa bilder ur garments-bucketen.
 *
 * En bild är föräldralös när INGEN rad i databasen refererar den. Det händer
 * varje gång ett plagg beskärs, får bakgrunden borttagen eller byter foto:
 * utils/storage.uploadUserImage() skapar alltid en NY sökväg, och ingen kod
 * raderar den gamla. Filerna blir alltså kvar för alltid – både en
 * lagringskostnad och kvarglömda personuppgifter (GDPR art. 5.1(e)).
 *
 * KÖRS I TORRLÄGE SOM STANDARD. Radering kräver --delete och en bekräftelse.
 *
 *   node scripts/cleanup-orphan-images.mjs                  # lista, radera inget
 *   node scripts/cleanup-orphan-images.mjs --json > out.json # manifest för granskning
 *   node scripts/cleanup-orphan-images.mjs --backup ../skrud-backup   # bara kopia
 *   node scripts/cleanup-orphan-images.mjs --backup ../skrud-backup --delete --yes
 *   node scripts/cleanup-orphan-images.mjs --delete --yes    # radera utan kopia
 *
 * Kräver:
 *   SUPABASE_URL                (eller EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY   (finns som miljövariabel i Vercel)
 *
 * Referenserna läses om vid VARJE körning – ett manifest hinner bli inaktuellt.
 */

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const BUCKET = 'garments'
const PAGE = 1000

const args = new Set(process.argv.slice(2))
const DO_DELETE = args.has('--delete')
// --backup <mapp>: ladda ner varje föräldralös fil innan något raderas. Körs den
// tillsammans med --delete raderas BARA filer som säkerhetskopierats – en fil som
// inte gick att ladda ner lämnas kvar i lagringen hellre än att förloras.
const backupArg = process.argv.slice(2).indexOf('--backup')
const BACKUP_DIR = backupArg !== -1 ? process.argv.slice(2)[backupArg + 1] : null
const CONFIRMED = args.has('--yes')
const AS_JSON = args.has('--json')

const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const log = (...a) => { if (!AS_JSON) console.log(...a) }

/** Alla kolumner som kan innehålla en bildreferens. Missas en enda raderar vi levande bilder. */
const REFERENCE_SOURCES = [
  { table: 'garments',        column: 'image_url' },
  { table: 'wishlist',        column: 'image_url' },
  { table: 'moodboard',       column: 'image_url' },
  { table: 'pending_imports', column: 'image_url' },
  { table: 'people',          column: 'avatar_url' },
  { table: 'profiles',        column: 'avatar_url' },
  { table: 'outfits',         column: 'image_urls' }, // text[]
  { table: 'collages',        column: 'items' },      // jsonb
  { table: 'trips',           column: 'data' },       // jsonb
]

/** Listar hela bucketen. storage.list() ger max 100 poster utan explicit limit. */
async function listAll(prefix = '') {
  const files = []
  const folders = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: PAGE, offset })
    if (error) throw new Error(`Kunde inte lista "${prefix}": ${error.message}`)
    if (!data?.length) break
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name
      // Mappar saknar id i Supabase Storage.
      if (e.id == null) folders.push(path)
      else files.push(path)
    }
    if (data.length < PAGE) break
  }
  for (const f of folders) files.push(...await listAll(f))
  return files
}

/** Plockar ut varje storage-sökväg som förekommer i ett godtyckligt värde. */
function collectRefs(value, into) {
  if (value == null) return
  if (Array.isArray(value)) { for (const v of value) collectRefs(v, into); return }
  if (typeof value === 'object') { collectRefs(JSON.stringify(value), into); return }
  const text = String(value)
  const m = text.match(/\/storage\/v1\/object\/(?:public|sign)\/garments\/([^?"'\s\\]+)/g)
  if (m) for (const hit of m) into.add(decodeURIComponent(hit.split('/garments/')[1]))
  // Rena sökvägar (nya uppladdningar lagrar sökvägen, inte en URL).
  const bare = text.match(/(?:[0-9a-f-]{36}|public|moodboard|avatars)\/[^\s"',\\]+\.[a-z0-9]{2,5}/gi)
  if (bare) for (const hit of bare) into.add(hit)
}

async function loadReferenced() {
  const refs = new Set()
  for (const { table, column } of REFERENCE_SOURCES) {
    const { data, error } = await db.from(table).select(column)
    if (error) {
      if (error.code === '42P01') { log(`  (tabellen ${table} finns inte – hoppar över)`); continue }
      throw new Error(`Kunde inte läsa ${table}.${column}: ${error.message}`)
    }
    for (const row of data || []) collectRefs(row[column], refs)
    log(`  ${table}.${column}: ${data?.length ?? 0} rader`)
  }
  return refs
}

/**
 * Laddar ner filerna till BACKUP_DIR med sökvägsstrukturen bevarad.
 * Returnerar de sökvägar som säkerhetskopierades UTAN fel.
 */
async function backupAll(paths) {
  const ok = []
  let failed = 0
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    try {
      const { data, error } = await db.storage.from(BUCKET).download(path)
      if (error || !data) throw new Error(error?.message || 'tom nedladdning')
      const dest = join(BACKUP_DIR, path)
      await mkdir(dirname(dest), { recursive: true })
      await writeFile(dest, Buffer.from(await data.arrayBuffer()))
      ok.push(path)
    } catch (e) {
      failed++
      console.error(`  MISSLYCKADES ${path}: ${e.message}`)
    }
    if ((i + 1) % 25 === 0 || i === paths.length - 1) log(`  ${i + 1}/${paths.length}`)
  }
  if (failed) log(`  ${failed} fil(er) kunde inte laddas ner – de raderas inte.`)
  return ok
}

const main = async () => {
  log('Läser referenser ur databasen…')
  const referenced = await loadReferenced()
  log(`  → ${referenced.size} unika refererade sökvägar\n`)

  log('Listar bucketen…')
  const objects = await listAll()
  log(`  → ${objects.length} objekt\n`)

  const orphans = objects.filter(p => !referenced.has(p))
  const inUse = objects.length - orphans.length

  if (AS_JSON) {
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      totals: { objects: objects.length, inUse, orphans: orphans.length },
      orphans,
    }, null, 2))
    if (!DO_DELETE) return
  }

  log(`Objekt totalt:  ${objects.length}`)
  log(`Används:        ${inUse}`)
  log(`Föräldralösa:   ${orphans.length}\n`)

  if (!orphans.length) { log('Inget att städa.'); return }

  // Skyddsräcke: om nästan allt ser föräldralöst ut har referensinläsningen
  // sannolikt gått fel (t.ex. en tabell som inte gick att läsa). Radera inte.
  const share = orphans.length / objects.length
  if (share > 0.8) {
    console.error(`\nAVBRYTER: ${Math.round(share * 100)} % av objekten ser föräldralösa ut.`)
    console.error('Det tyder på att referensinläsningen misslyckades, inte på att bucketen är skräp.')
    process.exit(1)
  }

  if (BACKUP_DIR && !DO_DELETE) {
    log(`Säkerhetskopierar ${orphans.length} filer till ${BACKUP_DIR}…`)
    const saved = await backupAll(orphans)
    log(`\n${saved.length}/${orphans.length} säkerhetskopierade. Inget raderat.`)
    return
  }

  if (!DO_DELETE) {
    log('Föräldralösa filer (torrläge – inget raderas):')
    for (const p of orphans.slice(0, 40)) log('  ' + p)
    if (orphans.length > 40) log(`  … och ${orphans.length - 40} till`)
    log('\nGranska listan. Kör med --delete --yes för att radera på riktigt.')
    return
  }

  if (!CONFIRMED) {
    console.error('--delete kräver även --yes. Raderingen är oåterkallelig.')
    process.exit(1)
  }

  // Säkerhetskopiera först. Bara det som faktiskt hamnade på disk raderas.
  let deletable = orphans
  if (BACKUP_DIR) {
    log(`Säkerhetskopierar ${orphans.length} filer till ${BACKUP_DIR}…`)
    deletable = await backupAll(orphans)
    log(`  ${deletable.length}/${orphans.length} säkerhetskopierade\n`)
    if (!deletable.length) { console.error('Inget kunde säkerhetskopieras – avbryter.'); process.exit(1) }
  }

  log(`Raderar ${deletable.length} filer…`)
  let removed = 0
  for (let i = 0; i < deletable.length; i += 100) {
    const chunk = deletable.slice(i, i + 100)
    const { error } = await db.storage.from(BUCKET).remove(chunk)
    if (error) { console.error(`  Misslyckades för ${chunk.length} filer: ${error.message}`); continue }
    removed += chunk.length
    log(`  ${removed}/${deletable.length}`)
  }
  log(`\nKlart. ${removed} filer raderade.`)
}

main().catch(e => { console.error('Fel:', e.message); process.exit(1) })
