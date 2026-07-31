// Delade hjälpfunktioner för API-endpoints.
// Filer som börjar med "_" exponeras inte som routes av Vercel.

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type AuthedUser = { id: string; email?: string }

// Enkel best-effort rate limit per användare (nollställs när edge-instansen byts).
const hits = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20

function rateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = hits.get(userId)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(userId, { count: 1, windowStart: now })
    return false
  }
  entry.count++
  return entry.count > MAX_PER_WINDOW
}

/**
 * Verifierar Supabase-JWT:n i Authorization-headern.
 * Returnerar användaren, eller ett Response (401/429/500) som ska skickas direkt.
 */
export async function requireUser(request: Request): Promise<AuthedUser | Response> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Inte inloggad' }, 401)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Supabase-konfiguration saknas på servern' }, 500)
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return json({ error: 'Ogiltig eller utgången session' }, 401)

  const user = (await res.json()) as AuthedUser
  if (!user?.id) return json({ error: 'Ogiltig session' }, 401)

  // Beständig rate limit i databasen (överlever edge-instansbyten och stoppar
  // därför ihållande spam mot de dyra AI-endpointsen). Faller tillbaka på den
  // minnesbaserade räknaren om RPC:n inte finns eller inte svarar.
  try {
    const rl = await fetch(`${supabaseUrl}/rest/v1/rpc/bump_rate_limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ max_calls: MAX_PER_WINDOW, window_seconds: 60 }),
    })
    if (rl.ok) {
      const allowed = await rl.json()
      if (allowed === false) return json({ error: 'För många förfrågningar – vänta en stund' }, 429)
      return user
    }
  } catch { /* faller tillbaka på minnesräknaren nedan */ }

  if (rateLimited(user.id)) return json({ error: 'För många förfrågningar – vänta en stund' }, 429)
  return user
}

// Gratis-AI-kvot per vecka. Premium-användare (giltig entitlement) räknas inte
// och får alltid true (obegränsat) – det avgörs i RPC:n use_ai_credit, som är
// den enda pålitliga källan (klienten kan inte skriva entitlements).
export const FREE_AI_PER_WEEK = 3
const WEEK_SECONDS = 7 * 24 * 60 * 60

// Drar en gratis-AI-kredit för den inloggade användaren. Returnerar false när
// gratis-taket nåtts (och användaren inte är Premium). Fail-open: om RPC:n
// saknas/inte svarar släpper vi igenom (blockerar aldrig en betalande/legitim
// användare pga infra-strul).
export async function useAiCredit(request: Request): Promise<boolean> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !supabaseUrl || !anonKey) return true
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/use_ai_credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ max_free: FREE_AI_PER_WEEK, window_seconds: WEEK_SECONDS }),
    })
    if (!res.ok) return true
    const allowed = await res.json()
    return allowed !== false
  } catch {
    return true
  }
}

/** Plockar ut och parsar JSON-objektet ur ett AI-svar (hanterar ```-staket och omgivande text). */
export function parseAiJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI-svaret innehöll ingen giltig JSON')
  return JSON.parse(cleaned.slice(start, end + 1))
}

// Standardmodell för OpenAI-anropen. gpt-4.1-mini ger ~6× lägre kostnad än
// gpt-4o med bibehållen kvalitet och bildstöd, och är en drop-in (stödjer
// max_tokens + temperature). Kan överstyras med miljövariabeln OPENAI_MODEL
// utan kodändring – t.ex. till en reasoning-modell (gpt-5.6-luna) som hanteras
// automatiskt nedan.
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'

// Beprövad, icke-reasoning-modell att falla tillbaka på om den valda modellen
// ger tomt svar eller strular. Måste själv vara en drop-in-modell.
const FALLBACK_MODEL = 'gpt-4.1-mini'

// Reasoning-modeller (o-serien och gpt-5-familjen, inkl. gpt-5.6-luna) beter
// sig annorlunda: de kräver max_completion_tokens i stället för max_tokens,
// stödjer inte fritt temperature, och bränner reasoning-tokens som räknas mot
// output. Vi upptäcker dem för att skicka rätt parametrar.
export function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/.test(model)
}

/** Anropar OpenAI chat completions och returnerar svarstexten. */
export async function openaiChat(messages: any[], model: string, maxTokens: number, temperature?: number): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY saknas på servern')

  async function call(useModel: string): Promise<string | undefined> {
    const reasoning = isReasoningModel(useModel)
    const body = reasoning
      ? {
          model: useModel,
          messages,
          // Extra utrymme så reasoning-tokens inte svälter det synliga svaret.
          max_completion_tokens: maxTokens + 2000,
          reasoning_effort: 'low',
        }
      : {
          model: useModel,
          messages,
          max_tokens: maxTokens,
          ...(temperature != null ? { temperature } : {}),
        }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message || 'OpenAI API-fel')
    return data.choices?.[0]?.message?.content
  }

  // Försök med den valda modellen. Om den ger tomt svar eller kastar (t.ex. en
  // ny reasoning-modell som beter sig oväntat) faller vi tillbaka på den
  // beprövade modellen – så det är riskfritt att testa nya modeller i prod.
  let text: string | undefined
  try {
    text = await call(model)
  } catch (e) {
    if (model === FALLBACK_MODEL) throw e
    text = undefined
  }
  if (!text && model !== FALLBACK_MODEL) {
    text = await call(FALLBACK_MODEL)
  }
  if (!text) throw new Error('Tomt svar från AI')
  return text
}

// Språknamn per kod – används för att bygga AI-instruktionen. Lägg till en rad
// här när ett nytt språk läggs till i appen (klienten skickar `lang` i bodyn).
const LANG_NAMES: Record<string, string> = {
  en: 'ENGLISH', de: 'GERMAN (Deutsch)', fr: 'FRENCH (français)',
  es: 'SPANISH (español)', it: 'ITALIAN (italiano)',
}

/**
 * Instruktion till AI:n om vilket språk svaret ska vara på. Klienten skickar
 * `lang` i bodyn utifrån användarens valda appspråk. Default: svenska.
 */
export function langInstruction(lang: unknown): string {
  const code = String(lang || 'sv')
  if (code === 'sv') {
    return 'VIKTIGT: Svara på SVENSKA. All text du genererar (namn, meddelanden, motiveringar, beskrivningar) ska vara på naturlig svenska.'
  }
  const name = LANG_NAMES[code] || 'ENGLISH'
  return `IMPORTANT: Respond in ${name}. All generated text (names, messages, reasons, descriptions, summaries) must be written in natural ${name}.`
}

/** Trunkerar en sträng från klienten så att promptar inte kan växa obegränsat. */
export function clip(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : ''
}
