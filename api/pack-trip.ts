import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser, useAiCredit, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  try {
    const body = (await request.json()) as any
    const destination = clip(body.destination, 120)
    const dateLabel = clip(body.dateLabel, 80)
    const monthLabel = clip(body.monthLabel, 60)
    const days = Math.max(1, Math.min(60, Number(body.days) || 1))
    const weatherSummary = clip(body.weatherSummary, 300)
    const groupedList = clip(body.groupedList, 8000)
    const vibe = clip(body.vibe, 200)
    // audience 'child' → packa till ett barn (bekvämt/praktiskt/väderanpassat före
    // mode; bebisar behöver inga skor). Default 'adult'.
    const audience = body.audience === 'child' ? 'child' : 'adult'

    // Freemium: gratis-användare får ett fåtal packningar per vecka, Premium är
    // obegränsat. Kvoten dras BARA på vuxenanropet – en familjeresa gör ett
    // extra anrop per barn, och de hör till samma packning. Klienten anropar
    // alltid vuxenvägen först, så en resa kostar exakt en kredit.
    if (audience === 'adult' && !(await useAiCredit(request, 'trip'))) {
      return json({ error: 'Gratiskvoten för packningar är slut den här veckan.', code: 'quota_exceeded' }, 402)
    }
    const childName = clip(body.childName, 40)
    const babyMode = body.babyMode === true
    // Åldersanpassade förnödenheter (klienten bygger texten utifrån barnets ålder).
    const childExtrasHint = clip(body.childExtrasHint, 300)
    const childHeadwear = clip(body.childHeadwear, 400)
    // Användarens personliga färgpalett (färganalys), om hen valt att väga in den.
    const colorPalette = audience === 'child' ? '' : clip(body.colorPalette, 500)

    if (!destination) return json({ error: 'Destination saknas' }, 400)
    if (!groupedList) return json({ error: 'Garderobslista saknas' }, 400)

    // Antal outfitsförslag: ungefär en per dag, men rimligt tak.
    const outfitCount = Math.max(2, Math.min(days, 7))
    const reuse = days > 4

    const weatherLine = weatherSummary
      ? `Väder på destinationen under perioden: ${weatherSummary}`
      : `Ingen exakt prognos finns (resan ligger längre fram än 16 dagar). Utgå från ditt kunnande om TYPISKT väder i ${destination} under ${monthLabel} – nämn ungefärlig temperatur och om det brukar regna.`

    const reuseLine = reuse
      ? `Resan är längre än 4 dagar (${days} dagar) → ÅTERANVÄND plaggen. Bygg en kapsel där samma nederdelar och överdelar återkommer i flera olika outfits. Packa INTE ett nytt unikt plagg för varje dag – variera i stället genom att kombinera om ett fåtal plagg på nya sätt.`
      : `Håll packningen liten – återanvänd gärna nederdelar/skor mellan outfits.`

    const vibeLine = vibe
      ? `KÄNSLA: Resan ska ha känslan "${vibe}". Låt den genomsyra BÅDE outfitsen och packlistan – välj plagg som förstärker den känslan och undvik sådant som bryter den.`
      : ''

    const personaLine = audience === 'child'
      ? `Du hjälper en förälder att packa till sitt barn${childName ? ` (${childName})` : ''} inför en resa till ${destination} under ${dateLabel} (${days} dagar). Prioritera bekvämt, praktiskt och väderanpassat framför mode – barnet ska kunna leka och röra sig fritt, och varken frysa eller bli för varmt.${babyMode ? ' Detta är en bebis som inte går själv än – packa INGA skor (strumpor/sockor räcker).' : ''}`
      : `Du är en personlig stylist och reseexpert. Användaren ska resa till ${destination} under ${dateLabel} (${days} dagar) och behöver hjälp att packa RÄTT plagg ur sin egen garderob.`

    const prompt = `${personaLine}

${weatherLine}
${vibeLine}

GARDEROB (välj ENDAST plagg härifrån, exakt som de heter):
${groupedList}

Din uppgift:
1. PACKLISTA: Välj ut en smart, mix-and-match-vänlig uppsättning plagg ur garderoben som räcker för ${days} dagar utan att man packar för mycket. Prioritera plagg som passar vädret och som går att kombinera med varandra. Ta med lämpliga skor och ytterplagg om vädret kräver. ${reuseLine}
2. OUTFITS: Sätt ihop ${outfitCount} färdiga, kompletta outfits av de packade plaggen. Ge varje outfit ett kort namn som antyder tillfälle (t.ex. "Middag ute", "Sightseeing", "Resedag").
${audience === 'child'
  ? `3. EXTRAS: Lista BARA barn-specifika förnödenheter som INTE är plagg (t.ex. blöjor, våtservetter, extra ombyten, napp, haklappar, badkläder, solskydd, gosedjur). Ta INTE med delade hushållssaker som laddare, adapter, powerbank, necessär eller reseadapter – de packas i den vuxnes lista.${childExtrasHint ? ` Ta OVILLKORLIGEN med åldersanpassade förnödenheter: ${childExtrasHint}` : ''}`
  : `3. EXTRAS: Lista praktiska saker att inte glömma som INTE är plagg i garderoben (t.ex. underkläder, strumpor, pyjamas, necessär, laddare, adapter, badkläder om relevant) – anpassa efter destination och väder.`}

OBLIGATORISKA REGLER FÖR VARJE OUTFIT – följ EXAKT (samma som vid vanlig outfit-generering):
1. ${babyMode ? 'SKOR: en bebis behöver inga skor – hoppa över skor helt (strumpor/sockor räcker).' : 'SKOR: Varje outfit MÅSTE ha exakt ETT par skor. En outfit utan skor är ogiltig.'}
2. NEDERDEL: Varje outfit MÅSTE ha byxor, kjol eller shorts – SÅVIDA du inte väljer en klänning.
3. ÖVERDEL: Varje outfit MÅSTE ha exakt EN överdel (topp/tröja/skjorta/body) – SÅVIDA du inte väljer en klänning.
4. Väljer du en KLÄNNING → lägg INTE till separat nederdel eller överdel (klänningen ersätter båda).
${childHeadwear ? '5b. ' + childHeadwear + '\n' : ''}5. HÖGST ETT plagg per roll: ALDRIG två överdelar (t.ex. inte "T-shirt" + "body" samtidigt – båda är överdelar), aldrig två nederdelar, aldrig två par skor. Ett extra ytterlager (kavaj/jacka/kofta) OVANPÅ överdelen är ok, men basen är EN överdel.
6. Bygg looken kring en sammanhållen färgpalett; kombinera inte flera skarpt konkurrerande starka färger.
${colorPalette ? `7. PERSONLIG FÄRGPALETT (från användarens färganalys) – väg in den tydligt: ${colorPalette}. Prioritera plagg nära bas- och komplementfärgerna, använd accentfärgerna som statement och undvik "undvik"-färgerna när garderoben tillåter.` : ''}

VIKTIGT:
- Använd EXAKT samma plaggnamn som i garderoben (för både packlista och outfits).
- Anpassa TYDLIGT efter vädret: inga tjocka vinterplagg till en varm destination, och tvärtom.
- Packlistan ska innehålla varje plagg som används i outfitsen, plus ev. extra basplagg.

${langInstruction(body.lang)} OBS: "packingList" och "outfits[].items" ska vara plaggens namn EXAKT som i garderoben (översätt dem INTE). Språkvalet gäller "climateNote", "outfits[].name" och "extras".

Svara ENDAST med JSON, inga backticks:
{"climateNote": "1–2 meningar om vädret på plats och vad det betyder för packningen", "packingList": ["exakt plaggnamn", "..."], "outfits": [{"name": "outfitnamn", "items": ["exakt plaggnamn", "..."]}], "extras": ["Underkläder ×${days}", "Laddare", "..."]}`

    const text = await openaiChat([{ role: 'user', content: prompt }], OPENAI_MODEL, 1300, 0.7)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.packingList)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    if (!Array.isArray(parsed.outfits)) parsed.outfits = []
    if (!Array.isArray(parsed.extras)) parsed.extras = []
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
