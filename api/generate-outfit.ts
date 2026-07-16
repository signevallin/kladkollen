import { clip, json, openaiChat, parseAiJson, requireUser } from './_utils'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const contextLabel = clip(body.contextLabel, 40)
    const contextLogic = clip(body.contextLogic, 200)
    const intensity = clip(body.intensity, 40)
    const weatherSummary = clip(body.weatherSummary, 300)
    const weatherRules = clip(body.weatherRules, 600)
    const avoid = clip(body.avoid, 400)
    const feedback = clip(body.feedback, 800)
    const groupedList = clip(body.groupedList, 8000)
    const season = clip(body.season, 20)
    const avoidSongs = clip(body.avoidSongs, 600)
    const previousItems = clip(body.previousItems, 400)
    const retry = body.retry === true

    if (!groupedList) return json({ error: 'Garderobslista saknas' }, 400)

    const retryInstruction = retry
      ? '\nVIKTIGT: Föregående försök saknade obligatoriska plagg. Se till att inkludera SKOR och NEDERDEL (eller klänning) denna gång.'
      : ''

    const prompt = `Du är en personlig stylist. Välj en komplett outfit från garderoben nedan.

Kontext: ${contextLabel} – ${contextLogic}
Intensitet: ${intensity}
${season ? `Årstid: det är ${season}.` : ''}
${weatherSummary}
VIKTIGT: Anpassa valet TYDLIGT efter kontexten "${contextLabel}". En festoutfit
ska skilja sig markant från en vardags-/jobboutfit – annan känsla, andra plagg.
Välj inte samma look oavsett tillfälle.
${previousItems ? `Föregående förslag var: ${previousItems}. Ge ett TYDLIGT ANNORLUNDA förslag denna gång – byt ut minst hälften av plaggen (samma plagg får återkomma bara om garderoben är för liten för alternativ).` : ''}
${avoid}${feedback ? `\nSmakprofil:\n${feedback}` : ''}
${retryInstruction}

GARDEROB (välj ENDAST plagg från listan nedan, exakt som de heter):

${groupedList}

OBLIGATORISKA REGLER – följ dessa EXAKT:
1. SKOR: Du MÅSTE välja ett par skor. Outfit utan skor är ogiltig.
2. NEDERDEL: Du MÅSTE välja byxor eller kjol – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: Du MÅSTE välja topp eller tröja – SÅVIDA du inte väljer klänning.
4. Väljer du klänning → lägg inte till separata byxor/kjol/topp.
${weatherRules ? '5. VÄDER: ' + weatherRules : ''}
${season ? `6. ÅRSTID: Det är ${season}. Välj plagg som passar årstiden – inga tunga vinterplagg på sommaren eller tunna sommarplagg på vintern.` : ''}

STILREGLER – lika viktiga, det här avgör om looken är snygg:
A. FÄRGHARMONI ÄR AVGÖRANDE. Bygg looken kring EN sammanhållen färgpalett.
B. Använd HÖGST en stark/mättad statementfärg. Resten ska vara neutraler
   (svart, vitt, beige, grå, brun, marinblå, denim) eller nyanser i samma färgfamilj.
C. Kombinera ALDRIG flera konkurrerande starka färger som skär sig
   (t.ex. burgundy + grönt + rött, eller rosa + orange + lila). Hellre neutralt.
D. Skor och accessoarer ska tona in i paletten – inte sticka ut i en tredje stark färg.
E. LÄDER & ACCESSOARER ska samspela: matcha bälte till den dominerande neutralen
   eller till skorna. Blanda ALDRIG svart och brunt läder (t.ex. brunt bälte till
   svarta plagg – välj svart bälte istället). Är looken svartdominerad → svart bälte.
F. Sträva efter en balanserad, genomtänkt look som en riktig stylist vore stolt över.
   Om två plagg inte passar färgmässigt, välj hellre ett neutralt alternativ – eller
   hoppa över en valfri accessoar helt om den inte lyfter looken.

Föreslå också EN låt som matchar outfitens känsla och kontexten. Välj en riktig,
känd låt som går att hitta på Apple Music.
LÅTREGLER:
- VARIERA! Fastna inte i självklara klichéer (t.ex. Uptown Funk, Happy, Good as Hell).
  Överraska gärna – olika artister, genrer och årtionden från gång till gång.
- Välj en låt som verkligen passar just "${contextLabel}" och looken.
${avoidSongs ? `- Föreslå INTE någon av dessa nyligen använda låtar: ${avoidSongs}` : ''}

Svara ENDAST med JSON, inga backticks:
{"outfitName": "namn", "items": ["exakt plaggnamn 1", "exakt plaggnamn 2", "exakt plaggnamn 3"], "message": "Personligt, emotionellt budskap om looken (1–2 meningar).", "song": {"title": "låttitel", "artist": "artist", "reason": "kort varför den passar dagens känsla (max 1 mening)"}}`

    const text = await openaiChat([{ role: 'user', content: prompt }], 'gpt-4o', 350, 0.9)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
