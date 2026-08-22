import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

// Skapar TVÅ koordinerade outfits – en till varje partner – ur bådas garderober.
// Plagg markerade [LÅN] får lånas av den andra personen.
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const nameA = clip(body.nameA, 40) || 'Person 1'
    const nameB = clip(body.nameB, 40) || 'Person 2'
    const listA = clip(body.listA, 6000)
    const listB = clip(body.listB, 6000)
    const contextLabel = clip(body.contextLabel, 40)
    const contextLogic = clip(body.contextLogic, 200)
    const weatherSummary = clip(body.weatherSummary, 300)
    const weatherRules = clip(body.weatherRules, 600)
    // Var sitt lager: samma väder känns olika beroende på köldkänslighet.
    // Faller tillbaka på den gemensamma regeln så en äldre app som bara skickar
    // weatherRules fortsätter fungera – servern och appen deployas var för sig.
    const colorPaletteA = clip(body.colorPaletteA, 500)
    const colorPaletteB = clip(body.colorPaletteB, 500)
    const weatherRulesA = clip(body.weatherRulesA, 600) || weatherRules
    const weatherRulesB = clip(body.weatherRulesB, 600) || weatherRules
    // Skiljer de sig inte åt är det samma sak – skriv den då en gång, så
    // prompten inte antyder en skillnad som inte finns.
    const weatherBlock = !weatherRulesA && !weatherRulesB
      ? ''
      : weatherRulesA === weatherRulesB
        ? `\nVÄDERREGLER (gäller BÅDA):\n${weatherRulesA}`
        : `\nVÄDERREGLER – skiljer sig åt, de är olika känsliga för kyla.`
          + ` Följ VAR OCH EN för rätt person och blanda dem inte:`
          + `\n${nameA}:\n${weatherRulesA}\n${nameB}:\n${weatherRulesB}`
    const styleRules = clip(body.styleRules, 1200)
    const avoid = clip(body.avoid, 400)
    const contextNote = clip(body.contextNote, 400)
    const season = clip(body.season, 20)
    const baseA = clip(body.baseA, 120)
    // Dagens låt: hoppas över helt när användaren dolt den (Profil → Musik) –
    // då slipper vi både tokens och ett svarsfält ingen tittar på.
    const wantSong = body.wantSong !== false
    const musicGenres = clip(body.musicGenres, 200)
    const previousSong = clip(body.previousSong, 120)
    const avoidSongs = clip(body.avoidSongs, 1500)

    if (!listA || !listB) return json({ error: 'Bådas garderober behövs' }, 400)

    const prompt = `Du är en personlig stylist för ett PAR som ska gå bort TILLSAMMANS. Sätt ihop TVÅ outfits – en till var och en – som harmoniserar men INTE är identiska (inte matchande uniformer).

Tillfälle: ${contextLabel || 'Fest/date'}${contextLogic ? ` – ${contextLogic}` : ''}
${season ? `Årstid: det är ${season}.` : ''}
${weatherSummary}
${contextNote ? `Användarens egen önskan för "${contextLabel}": ${contextNote} (väg in det).` : ''}

TILLGÄNGLIGT FÖR ${nameA} (välj ${nameA}s outfit ENDAST härifrån):
${listA}

TILLGÄNGLIGT FÖR ${nameB} (välj ${nameB}s outfit ENDAST härifrån):
${listB}

VIKTIGT: Varje persons outfit får ENDAST innehålla plagg ur den personens EGEN lista ovan. Plagg markerade [LÅN] är partnerns plagg som lånats in i den här personens lista – de FÅR användas, och ska då anges i "borrowed". Ta ALDRIG ett plagg som inte står i personens egen lista.
${baseA ? `\nUTGÅNGSPLAGG FÖR ${nameA} (MÅSTE VARA MED): Bygg ${nameA}s outfit KRING plagget "${baseA}". Det ska ingå i ${nameA}s "items" exakt som det heter i listan, och resten av ${nameA}s look väljs för att matcha och lyfta just det plagget. Lägg inte till ett annat plagg av samma typ. ${nameB}s outfit koordineras sedan mot ${nameA}s.\n` : ''}
OBLIGATORISKA REGLER FÖR VARJE OUTFIT:
1. SKOR: EXAKT ETT par skor per person. ALDRIG två par (t.ex. inte både loafers och sneakers). Detta är absolut.
2. NEDERDEL: byxor/kjol/shorts – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: exakt en – SÅVIDA du inte väljer klänning (då ingen separat över/underdel).
4. INGA DUBBLETTER: aldrig två plagg av samma kategori. Två skjortor räknas som TVÅ överdelar och är FÖRBJUDET – välj bara EN överdel (en topp/skjorta). Lager är ok endast om det är OLIKA kategorier (t.ex. en skjorta + en stickad tröja/kofta), aldrig två plagg av samma slag. Inte heller två par skor, två nederdelar eller två klänningar. Kontrollera detta innan du svarar.

PARREGLER:
- De två looksen ska kännas ihop: samma formalitetsnivå och en GEMENSAM färgtråd (en delad accent- eller neutralton), men spegla varsin person.
- Undvik att båda bär exakt samma starka statementfärg om det blir "matchande".
- Använd EXAKT samma plaggnamn som i garderoberna.
${weatherBlock}
${colorPaletteA || colorPaletteB ? `\nPERSONLIGA FÄRGPALETTER (från färganalysen) – väg in dem tydligt, men de gäller VAR SIN person:${colorPaletteA ? `\n${nameA}: ${colorPaletteA}` : ''}${colorPaletteB ? `\n${nameB}: ${colorPaletteB}` : ''}\nVälj i första hand plagg vars färger ligger nära respektive persons bas- och komplementfärger, och använd deras accentfärger som statement. Undvik deras "undvik"-färger när garderoben tillåter. Den GEMENSAMMA färgtråden ska väljas så att den fungerar i BÅDAS paletter – tvinga inte in en färg som en av dem ska undvika.` : ''}
${styleRules ? `\nSTILREGLER (gäller BÅDA, väger tungt):\n${styleRules}` : ''}
${avoid ? `\nUNDVIK (respektera för båda): ${avoid}` : ''}

${wantSong ? `
Föreslå också EN låt som matchar parets gemensamma känsla och kontexten. Välj en
riktig, känd låt som går att hitta på Apple Music.
LÅTREGLER:
- VARIERA! Fastna inte i självklara klichéer. Överraska med olika artister och årtionden VARJE gång.
- Låten ska matcha känslan i just "${contextLabel}" – välj INTE samma stämning oavsett tillfälle.
${musicGenres ? `- Användaren lyssnar helst på: ${musicGenres}. Välj ENDAST en låt som hör hemma i någon av dessa genrer.` : '- Variera mellan olika genrer från gång till gång.'}
${previousSong ? `- Du föreslog ALLDELES NYSS "${previousSong}". Det är FÖRBJUDET att föreslå den låten igen OCH förbjudet att välja en annan låt av samma artist.` : ''}
${avoidSongs ? `- FÖRBJUDET att föreslå någon av dessa nyligen använda låtar eller en annan låt av samma artister: ${avoidSongs}` : ''}
` : ''}
${langInstruction(body.lang)} OBS: "items" och "borrowed" ska vara plaggens namn EXAKT som i garderoberna ovan (översätt dem INTE). Språkvalet gäller bara "vibe", "tip"${wantSong ? ' och "song.reason"' : ''}.

Svara ENDAST med JSON, inga backticks:
{"vibe":"1 mening om den gemensamma känslan","outfits":[{"person":"${nameA}","items":["exakt plaggnamn","..."],"borrowed":["ev. plagg lånat från partnern"]},{"person":"${nameB}","items":["..."],"borrowed":[]}],"tip":"kort parstyling-tips (1 mening)"${wantSong ? ',"song":{"title":"låttitel","artist":"artist","reason":"kort varför den passar er känsla (max 1 mening)"}' : ''}}`

    const text = await openaiChat([{ role: 'user', content: prompt }], OPENAI_MODEL, wantSong ? 820 : 700, 0.8)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.outfits)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    parsed.outfits = parsed.outfits.map((o: any) => ({
      person: String(o?.person || ''),
      items: Array.isArray(o?.items) ? o.items : [],
      borrowed: Array.isArray(o?.borrowed) ? o.borrowed : [],
    }))
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
