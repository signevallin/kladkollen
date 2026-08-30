import { createClient } from '@supabase/supabase-js'

// Körs av Vercel Cron. Bygger en personlig notis per användare utifrån deras
// garderob + väder och skickar via Expo Push. Stödjer slot=morning|evening,
// men på Hobby-planen (max 2 cron-jobb, en körning/dygn) schemaläggs bara
// morgon-sloten dagligen – kväll-sloten finns kvar för manuellt anrop eller
// Vercel Pro. Kvällens "logga dagens outfit" täcks lokalt av utils/smartPush.
// Edge-runtime (som resten av api/): handlern använder den webb-baserade
// signaturen (request: Request) → new Response(). På nodejs-runtime får
// handlern i stället (req, res) och kraschar direkt vid request.headers.get
// ("is not a function") → 100 % fel och noll notiser. Service role + fetch
// fungerar på edge (samma mönster som delete-account/revenuecat-webhook).
export const config = { runtime: 'edge' }

type Garment = {
  id: string; name: string | null; brand: string | null; color: string | null
  category: string | null; season: string | null; price: number | null
  times_worn: number | null; last_worn: string | null; created_at: string
  for_sale: boolean | null; in_laundry: boolean | null
}

type Profile = {
  id: string; push_token: string | null; notif_enabled: boolean | null
  notif_prefs: Record<string, boolean> | null
  push_lat: number | null; push_lon: number | null
  last_notif_date: string | null
  last_notif_garment: string | null
  lang: string | null
}

// garmentId sätts av de notiser som pekar ut ett specifikt plagg, så att det
// kan uteslutas nästa gång och inte föreslås två gånger i rad.
type Notif = { kind: string; title: string; body: string; route: string; garmentId?: string }

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send'

function today(): string { return new Date().toISOString().slice(0, 10) }

// Delar upp en lista i mindre bitar. Används för att batcha .in()-frågor så
// URL:en inte blir för lång när användarantalet växer.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
const ID_CHUNK = 200

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity
  const d = new Date(dateStr).getTime()
  if (isNaN(d)) return Infinity
  return Math.floor((Date.now() - d) / 86400000)
}

// Månad → svensk säsong.
function currentSeason(): 'Vår' | 'Sommar' | 'Höst' | 'Vinter' {
  const m = new Date().getMonth() + 1
  if (m >= 3 && m <= 5) return 'Vår'
  if (m >= 6 && m <= 8) return 'Sommar'
  if (m >= 9 && m <= 11) return 'Höst'
  return 'Vinter'
}

// Notis-texter per språk. Fyller {platshållare}; faller tillbaka på svenska,
// sedan på nyckeln. Håll fristående (importera inte klientens i18n på edge).
const MSG: Record<string, Record<string, string>> = {
  sv: {
    'log.title': 'Vad hade du på dig idag? 📸', 'log.body': 'Tryck här för att logga dagens outfit på 2 sekunder.',
    'week.title': 'Din vecka i kläder 👗', 'week.body': 'Ditt mest burna plagg är {desc}. Öppna för hela din statistik.',
    'rain.title': 'Det ser ut att bli regn idag ☔️', 'rain.body': '{rain}% risk för regn – glöm inte {item}.', 'rain.itemOwned': 'din {desc}', 'rain.itemFallback': 'regnjackan eller paraplyet',
    'uv.title': 'UV-index {uv} idag ☀️', 'uv.body': 'Starkt solljus – plocka fram något luftigt och glöm inte solglasögonen.',
    'right.title': 'Perfekt väder idag ({temp}°C) 🌤', 'right.body': 'Äntligen läge för din {desc} som legat orörd ett tag.',
    'forgot.title': 'Glömd skatt i garderoben ✨', 'forgot.body': 'Din {desc} {when}. Ska vi styla den idag?', 'forgot.whenNever': 'har aldrig burits', 'forgot.whenDays': 'har legat orörd i {d} dagar',
    'ootd.title': 'Dagens outfit väntar 👀', 'ootd.body': 'Öppna Skrud för ett outfitförslag anpassat efter vädret.',
    'planned.title': 'Dagens outfit är planerad 👗', 'planned.body': '{name} står på schemat idag. Tryck för att se den.',
    'season.title': '{season} är här 🍂', 'season.body': 'Dags att arkivera förra säsongens plagg och lyfta fram de nya?',
    'from': 'från', 'Vår': 'Vår', 'Sommar': 'Sommar', 'Höst': 'Höst', 'Vinter': 'Vinter',
  },
  en: {
    'log.title': 'What did you wear today? 📸', 'log.body': 'Tap here to log today’s outfit in 2 seconds.',
    'week.title': 'Your week in clothes 👗', 'week.body': 'Your most-worn item is {desc}. Open for your full stats.',
    'rain.title': 'Looks like rain today ☔️', 'rain.body': '{rain}% chance of rain – don’t forget {item}.', 'rain.itemOwned': 'your {desc}', 'rain.itemFallback': 'a rain jacket or umbrella',
    'uv.title': 'UV index {uv} today ☀️', 'uv.body': 'Strong sun – pick something airy and don’t forget your sunglasses.',
    'right.title': 'Perfect weather today ({temp}°C) 🌤', 'right.body': 'Finally the moment for your {desc} that’s been untouched for a while.',
    'forgot.title': 'Forgotten gem in your wardrobe ✨', 'forgot.body': 'Your {desc} {when}. Shall we style it today?', 'forgot.whenNever': 'has never been worn', 'forgot.whenDays': 'has been untouched for {d} days',
    'ootd.title': 'Today’s outfit awaits 👀', 'ootd.body': 'Open Skrud for an outfit suggestion tailored to the weather.',
    'planned.title': 'Today’s outfit is planned 👗', 'planned.body': '{name} is on today’s schedule. Tap to see it.',
    'season.title': '{season} is here 🍂', 'season.body': 'Time to archive last season’s clothes and bring out the new?',
    'from': 'from', 'Vår': 'Spring', 'Sommar': 'Summer', 'Höst': 'Autumn', 'Vinter': 'Winter',
  },
  de: {
    'log.title': 'Was hast du heute getragen? 📸', 'log.body': 'Tippe hier, um das heutige Outfit in 2 Sekunden zu loggen.',
    'week.title': 'Deine Woche in Kleidung 👗', 'week.body': 'Dein meistgetragenes Teil ist {desc}. Öffne für deine ganze Statistik.',
    'rain.title': 'Heute sieht’s nach Regen aus ☔️', 'rain.body': '{rain}% Regenrisiko – vergiss {item} nicht.', 'rain.itemOwned': 'deine {desc}', 'rain.itemFallback': 'eine Regenjacke oder einen Schirm',
    'uv.title': 'UV-Index {uv} heute ☀️', 'uv.body': 'Starke Sonne – wähle etwas Luftiges und vergiss die Sonnenbrille nicht.',
    'right.title': 'Perfektes Wetter heute ({temp}°C) 🌤', 'right.body': 'Endlich der Moment für deine {desc}, die schon eine Weile ungetragen ist.',
    'forgot.title': 'Vergessenes Schmuckstück im Schrank ✨', 'forgot.body': 'Deine {desc} {when}. Sollen wir sie heute stylen?', 'forgot.whenNever': 'wurde noch nie getragen', 'forgot.whenDays': 'ist seit {d} Tagen ungetragen',
    'ootd.title': 'Das heutige Outfit wartet 👀', 'ootd.body': 'Öffne Skrud für einen wettergerechten Outfit-Vorschlag.',
    'planned.title': 'Das heutige Outfit ist geplant 👗', 'planned.body': '{name} steht heute auf dem Plan. Tippe, um es anzusehen.',
    'season.title': '{season} ist da 🍂', 'season.body': 'Zeit, die Teile der letzten Saison zu archivieren und die neuen hervorzuholen?',
    'from': 'von', 'Vår': 'Frühling', 'Sommar': 'Sommer', 'Höst': 'Herbst', 'Vinter': 'Winter',
  },
  es: {
    'log.title': '¿Qué te pusiste hoy? 📸', 'log.body': 'Toca aquí para registrar el look de hoy en 2 segundos.',
    'week.title': 'Tu semana en ropa 👗', 'week.body': 'Tu prenda más usada es {desc}. Abre para ver todas tus estadísticas.',
    'rain.title': 'Parece que hoy lloverá ☔️', 'rain.body': '{rain}% de probabilidad de lluvia: no olvides {item}.', 'rain.itemOwned': 'tu {desc}', 'rain.itemFallback': 'un chubasquero o un paraguas',
    'uv.title': 'Índice UV {uv} hoy ☀️', 'uv.body': 'Sol fuerte: elige algo ligero y no olvides las gafas de sol.',
    'right.title': 'Tiempo perfecto hoy ({temp}°C) 🌤', 'right.body': 'Por fin el momento para tu {desc}, que llevaba tiempo sin usarse.',
    'forgot.title': 'Tesoro olvidado en tu armario ✨', 'forgot.body': 'Tu {desc} {when}. ¿La combinamos hoy?', 'forgot.whenNever': 'nunca se ha usado', 'forgot.whenDays': 'lleva {d} días sin usarse',
    'ootd.title': 'El look de hoy te espera 👀', 'ootd.body': 'Abre Skrud para una sugerencia de look según el tiempo.',
    'planned.title': 'El look de hoy está planificado 👗', 'planned.body': '{name} está en la agenda de hoy. Toca para verlo.',
    'season.title': '{season} ya está aquí 🍂', 'season.body': '¿Hora de archivar la ropa de la temporada pasada y sacar la nueva?',
    'from': 'de', 'Vår': 'Primavera', 'Sommar': 'Verano', 'Höst': 'Otoño', 'Vinter': 'Invierno',
  },
  fr: {
    'log.title': 'Qu’as-tu porté aujourd’hui ? 📸', 'log.body': 'Touche ici pour enregistrer la tenue du jour en 2 secondes.',
    'week.title': 'Ta semaine en vêtements 👗', 'week.body': 'Ton vêtement le plus porté est {desc}. Ouvre pour toutes tes stats.',
    'rain.title': 'Il risque de pleuvoir aujourd’hui ☔️', 'rain.body': '{rain}% de risque de pluie – n’oublie pas {item}.', 'rain.itemOwned': 'ton {desc}', 'rain.itemFallback': 'un imperméable ou un parapluie',
    'uv.title': 'Indice UV {uv} aujourd’hui ☀️', 'uv.body': 'Soleil fort – choisis quelque chose de léger et n’oublie pas tes lunettes de soleil.',
    'right.title': 'Météo parfaite aujourd’hui ({temp}°C) 🌤', 'right.body': 'Enfin le moment pour ton {desc}, resté de côté un moment.',
    'forgot.title': 'Trésor oublié dans ta garde-robe ✨', 'forgot.body': 'Ton {desc} {when}. On le style aujourd’hui ?', 'forgot.whenNever': 'n’a jamais été porté', 'forgot.whenDays': 'est resté de côté depuis {d} jours',
    'ootd.title': 'La tenue du jour t’attend 👀', 'ootd.body': 'Ouvre Skrud pour une suggestion de tenue adaptée à la météo.',
    'planned.title': 'La tenue du jour est planifiée 👗', 'planned.body': '{name} est au programme aujourd’hui. Touche pour la voir.',
    'season.title': '{season} est là 🍂', 'season.body': 'Le moment d’archiver les vêtements de la saison passée et de sortir les nouveaux ?',
    'from': 'de', 'Vår': 'Le printemps', 'Sommar': 'L’été', 'Höst': 'L’automne', 'Vinter': 'L’hiver',
  },
}

function t(lang: string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  const l = lang && MSG[lang] ? lang : 'sv'
  let s = MSG[l][key] ?? MSG.sv[key] ?? key
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]))
  return s
}

function describe(g: Garment, lang: string): string {
  const parts = [g.color, g.name || g.category].filter(Boolean)
  const base = parts.join(' ').toLowerCase()
  return g.brand ? `${base} ${t(lang, 'from')} ${g.brand}` : base
}

async function getWeather(lat: number, lon: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,weathercode&daily=uv_index_max,precipitation_probability_max&timezone=auto`
    const r = await fetch(url)
    if (!r.ok) return null
    const d: any = await r.json()
    return {
      temp: Math.round(d?.current?.temperature_2m ?? NaN),
      code: d?.current?.weathercode ?? 0,
      uv: Math.round(d?.daily?.uv_index_max?.[0] ?? 0),
      rainChance: Math.round(d?.daily?.precipitation_probability_max?.[0] ?? 0),
    }
  } catch { return null }
}

// Väljer dagens notis för en användare. Prioriterad ordning, hoppar över
/**
 * Väljer bland de N mest bortglömda i stället för att alltid ta den översta.
 *
 * Sorteringen är deterministisk och last_worn ändras inte av att en notis
 * skickas, så `[0]` gav exakt samma plagg varje gång tills det faktiskt bars.
 * Poolen behåller avsikten – de längst oanvända prioriteras – men gör valet
 * varierat. Plagget som föreslogs senast utesluts helt.
 */
export function pickVaried<T extends { id: string }>(
  sorted: T[],
  excludeId: string | null,
  poolSize = 10,
): T | null {
  const pool = sorted.filter(g => g.id !== excludeId).slice(0, poolSize)
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

// kategorier användaren stängt av. Returnerar null om inget passar.
async function buildNotif(
  slot: 'morning' | 'evening',
  p: Profile,
  garments: Garment[],
  hasOutfitToday: boolean,
  plannedOutfitName: string | null,
): Promise<Notif | null> {
  const prefs = p.notif_prefs || {}
  const lang = p.lang || 'sv' // notistexten översätts till användarens språk
  // Arkiverade, sålda och tvättade är redan bortfiltrerade i databasfrågan.
  const active = garments
  const season = currentSeason()

  if (slot === 'evening') {
    // Kväll: påminn om att logga dagens outfit om inget loggats.
    if (prefs.logreminder && !hasOutfitToday && active.length > 0) {
      return { kind: 'logreminder', title: t(lang, 'log.title'), body: t(lang, 'log.body'), route: '/my-outfit' }
    }
    // Söndag kväll: veckans statistik (kräver att något burits).
    if (prefs.rediscovery && new Date().getDay() === 0) {
      const worn = active.filter(g => (g.times_worn || 0) > 0)
      if (worn.length > 0) {
        const top = [...worn].sort((a, b) => (b.times_worn || 0) - (a.times_worn || 0))[0]
        return { kind: 'weeklystats', title: t(lang, 'week.title'), body: t(lang, 'week.body', { desc: describe(top, lang) }), route: '/stats' }
      }
    }
    return null
  }

  // ── Morgon ──
  // Har användaren redan planerat dagens outfit i kalendern? Påminn om den och
  // skriv ut vilken det är. Går före väder-/förslagsnotiser eftersom valet är gjort.
  if (prefs.ootd && plannedOutfitName) {
    return {
      kind: 'planned',
      title: t(lang, 'planned.title'),
      body: t(lang, 'planned.body', { name: plannedOutfitName }),
      route: '/my-outfit',
    }
  }

  const weather = (prefs.weather && p.push_lat != null && p.push_lon != null)
    ? await getWeather(p.push_lat, p.push_lon)
    : null

  // Regnvarning: hög regnrisk under dagen → påminn om regnplagg. Ligger först
  // eftersom det är mer akut att missa regnjackan än ett solglasögontips.
  if (weather && prefs.weather && weather.rainChance >= 60) {
    const raincoat = active.find(g => /regn/i.test(`${g.name || ''} ${g.category || ''}`))
    const item = raincoat ? t(lang, 'rain.itemOwned', { desc: describe(raincoat, lang) }) : t(lang, 'rain.itemFallback')
    return {
      kind: 'rain',
      title: t(lang, 'rain.title'),
      body: t(lang, 'rain.body', { rain: weather.rainChance, item }),
      // Öppna det utpekade regnplagget om vi hittade ett, annars hem.
      route: raincoat ? `/garment-detail?id=${raincoat.id}` : '/home',
    }
  }

  // UV-varning på soliga sommardagar.
  if (weather && prefs.weather && weather.uv >= 6) {
    return { kind: 'uv', title: t(lang, 'uv.title', { uv: weather.uv }), body: t(lang, 'uv.body'), route: '/home' }
  }

  // "Äntligen rätt väder": ett säsongsplagg du inte burit på länge.
  if (weather && prefs.weather) {
    const cand = pickVaried(
      active
        .filter(g => (g.season || '').includes(season) && daysSince(g.last_worn) >= 30)
        .sort((a, b) => daysSince(b.last_worn) - daysSince(a.last_worn)),
      p.last_notif_garment,
    )
    if (cand) {
      return {
        kind: 'rightweather',
        title: t(lang, 'right.title', { temp: weather.temp }),
        body: t(lang, 'right.body', { desc: describe(cand, lang) }),
        route: `/garment-detail?id=${cand.id}`,
        garmentId: cand.id,
      }
    }
  }

  // Glömda skatter: plagget som legat orört längst.
  if (prefs.rediscovery) {
    const forgotten = pickVaried(
      active
        .filter(g => daysSince(g.last_worn) >= 45 && daysSince(g.created_at) >= 21)
        .sort((a, b) => daysSince(b.last_worn) - daysSince(a.last_worn)),
      p.last_notif_garment,
    )
    if (forgotten) {
      const d = daysSince(forgotten.last_worn)
      const when = d === Infinity ? t(lang, 'forgot.whenNever') : t(lang, 'forgot.whenDays', { d })
      return {
        kind: 'forgotten',
        title: t(lang, 'forgot.title'),
        body: t(lang, 'forgot.body', { desc: describe(forgotten, lang), when }),
        route: `/garment-detail?id=${forgotten.id}`,
        garmentId: forgotten.id,
      }
    }
  }

  // Dagens outfit-förslag.
  if (prefs.ootd && active.length >= 3) {
    return { kind: 'ootd', title: t(lang, 'ootd.title'), body: t(lang, 'ootd.body'), route: '/home' }
  }

  // Säsongsbyte de första dagarna i en ny säsong.
  if (prefs.seasonal && new Date().getDate() <= 3 && [3, 6, 9, 12].includes(new Date().getMonth() + 1)) {
    return {
      kind: 'seasonal',
      title: t(lang, 'season.title', { season: t(lang, season) }),
      body: t(lang, 'season.body'),
      route: '/wardrobe',
    }
  }

  return null
}

async function sendBatch(messages: any[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    try {
      await fetch(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(chunk),
      })
    } catch { /* fortsätt med nästa batch */ }
  }
}

export default async function handler(request: Request): Promise<Response> {
  // Skyddad av CRON_SECRET (Vercel Cron skickar den som Bearer-token).
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  const url = new URL(request.url)
  const qsSecret = url.searchParams.get('secret')
  if (secret && auth !== `Bearer ${secret}` && qsSecret !== secret) {
    return new Response('Unauthorized', { status: 401 })
  }

  const slot = (url.searchParams.get('slot') === 'evening') ? 'evening' : 'morning'
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return new Response('Missing config', { status: 500 })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Har push-token = användaren gav notistillstånd. registerForPush sätter inte
  // notif_enabled, så den kan vara null (aldrig öppnat notisinställningarna) –
  // behandla null som PÅ. Bara ett uttryckligt false stänger av.
  const baseCols = 'id, push_token, notif_enabled, notif_prefs, push_lat, push_lon, last_notif_date, last_notif_garment'
  let { data: profiles, error: profErr } = await admin
    .from('profiles').select(`${baseCols}, lang`)
    .not('push_token', 'is', null)
    .or('notif_enabled.is.null,notif_enabled.eq.true')
  // Resiliens: om lang-kolumnen inte körts än (migration saknas) faller vi
  // tillbaka på att hämta utan den → notiser skickas ändå (på svenska).
  if (profErr) {
    const r = await admin
      .from('profiles').select(baseCols)
      .not('push_token', 'is', null)
      .or('notif_enabled.is.null,notif_enabled.eq.true')
    profiles = r.data as any
  }

  const day = today()
  const slotTag = `${day}:${slot}`

  // Kandidater: har push-token och har inte redan fått en notis den här sloten
  // idag (max en notis per slot och dag, dedup lagras som "YYYY-MM-DD:slot").
  const eligible = ((profiles || []) as Profile[]).filter(
    p => p.push_token && p.last_notif_date !== slotTag
  )
  // Dedupa per push-token: en push-token identifierar en ENHET, inte ett konto.
  // Har någon varit inloggad på flera konton på samma telefon får den telefonen
  // annars en notis PER konto (dubbelnotiser). Skicka bara en per token.
  const seenTokens = new Set<string>()
  const candidates = eligible.filter(p => {
    const tok = p.push_token as string
    if (seenTokens.has(tok)) return false
    seenTokens.add(tok)
    return true
  })
  const ids = candidates.map(p => p.id)

  // Batcha plagg-hämtningen: EN fråga per id-batch i stället för en per
  // användare. Gruppera i minnet på user_id.
  const garmentsByUser = new Map<string, Garment[]>()
  for (const idsChunk of chunk(ids, ID_CHUNK)) {
    const { data } = await admin
      .from('garments')
      .select('user_id, id, name, brand, color, category, season, price, times_worn, last_worn, created_at, for_sale, in_laundry')
      .in('user_id', idsChunk)
      // Alla tre filtren hör hemma i frågan, inte i koden: annars hämtas rader
      // som ändå kastas, och kostnaden växer med antalet användare.
      //
      // "is not true" i stället för "eq false" är medvetet. archived och
      // for_sale är NULLBARA (default false gäller bara när kolumnen utelämnas),
      // och `col = false` är FALSKT även för NULL – sådana rader hade tyst
      // uteslutits ur hämtningen och aldrig kunnat föreslås.
      .not('archived', 'is', true)
      .not('for_sale', 'is', true)
      .eq('in_laundry', false)
    for (const g of (data || []) as (Garment & { user_id: string })[]) {
      const arr = garmentsByUser.get(g.user_id)
      if (arr) arr.push(g); else garmentsByUser.set(g.user_id, [g])
    }
  }

  // Kväll: batcha kalender-kollen på samma sätt → set med user_id som redan
  // loggat en outfit idag.
  const hasOutfitSet = new Set<string>()
  if (slot === 'evening') {
    for (const idsChunk of chunk(ids, ID_CHUNK)) {
      const { data: cal } = await admin
        .from('outfit_calendar')
        .select('user_id')
        .in('user_id', idsChunk)
        .eq('date', day)
      for (const c of (cal || []) as { user_id: string }[]) hasOutfitSet.add(c.user_id)
    }
  }

  // Morgon: hämta dagens planerade outfit (namn) per användare, så notisen kan
  // skriva ut vad det är. Två steg (kalender → outfit-namn) för att slippa join.
  const plannedByUser = new Map<string, string>()
  if (slot === 'morning') {
    const calRows: { user_id: string; outfit_id: string }[] = []
    for (const idsChunk of chunk(ids, ID_CHUNK)) {
      const { data: cal } = await admin
        .from('outfit_calendar')
        .select('user_id, outfit_id')
        .in('user_id', idsChunk)
        .eq('date', day)
      for (const c of (cal || []) as { user_id: string; outfit_id: string | null }[]) {
        if (c.outfit_id) calRows.push({ user_id: c.user_id, outfit_id: c.outfit_id })
      }
    }
    if (calRows.length) {
      const outfitIds = [...new Set(calRows.map(c => c.outfit_id))]
      const nameById = new Map<string, string>()
      for (const idsChunk of chunk(outfitIds, ID_CHUNK)) {
        const { data: outs } = await admin.from('outfits').select('id, name').in('id', idsChunk)
        for (const o of (outs || []) as { id: string; name: string | null }[]) if (o.name) nameById.set(o.id, o.name)
      }
      for (const c of calRows) {
        const nm = nameById.get(c.outfit_id)
        if (nm && !plannedByUser.has(c.user_id)) plannedByUser.set(c.user_id, nm)
      }
    }
  }

  const messages: any[] = []
  // Samla vilka användare som fick vilken notistyp, så dedup-uppdateringen kan
  // göras som en fråga per notistyp (max ~8) i stället för en per användare.
  const notifiedByKind = new Map<string, string[]>()
  const suggestedGarment = new Map<string, string>()

  for (const p of candidates) {
    const notif = await buildNotif(slot, p, garmentsByUser.get(p.id) || [], hasOutfitSet.has(p.id), plannedByUser.get(p.id) || null)
    if (!notif) continue

    messages.push({
      to: p.push_token,
      sound: 'default',
      title: notif.title,
      body: notif.body,
      data: { route: notif.route, kind: notif.kind },
    })
    const arr = notifiedByKind.get(notif.kind)
    if (arr) arr.push(p.id); else notifiedByKind.set(notif.kind, [p.id])
    // Plagg-id:t är olika per användare och kan därför inte batchas per
    // notistyp som raderna nedan. Samlas separat och skrivs i EN upsert.
    if (notif.garmentId) suggestedGarment.set(p.id, notif.garmentId)
  }

  if (messages.length) await sendBatch(messages)

  // Batcha dedup-uppdateringen: en update per notistyp (och id-batch) i stället
  // för en per användare.
  await Promise.all(
    [...notifiedByKind.entries()].flatMap(([kind, kindIds]) =>
      chunk(kindIds, ID_CHUNK).map(idsChunk =>
        admin.from('profiles')
          .update({ last_notif_date: slotTag, last_notif_kind: kind })
          .in('id', idsChunk)
      )
    )
  )

  // Vilket plagg som föreslogs skiljer sig per användare, så det kan inte gå i
  // samma batch som dedup-raderna ovan. En upsert räcker för alla – raderna
  // finns redan, så ON CONFLICT gör en update av just den här kolumnen.
  if (suggestedGarment.size) {
    const rows = [...suggestedGarment.entries()].map(([id, last_notif_garment]) => ({ id, last_notif_garment }))
    for (const part of chunk(rows, ID_CHUNK)) {
      await admin.from('profiles').upsert(part, { onConflict: 'id' })
    }
  }

  return new Response(JSON.stringify({ ok: true, slot, considered: candidates.length, sent: messages.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
