import { clip, json, langInstruction, openaiChat, parseAiJson, requireUser, useAiCredit, OPENAI_MODEL } from './_utils'

export const config = { runtime: 'edge' }

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  const auth = await requireUser(request)
  if (auth instanceof Response) return auth

  // Freemium: gratis-användare har en veckokvot; Premium är obegränsat. Koden
  // 'quota_exceeded' talar om för klienten att visa paywall.
  if (!(await useAiCredit(request))) {
    return json({ error: 'Gratiskvoten för AI-outfits är slut den här veckan.', code: 'quota_exceeded' }, 402)
  }

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
    const previousSong = clip(body.previousSong, 120)
    const contextNote = clip(body.contextNote, 400)
    const musicGenres = clip(body.musicGenres, 200)
    const recentOutfits = clip(body.recentOutfits, 1500)
    const styleRules = clip(body.styleRules, 1200)
    const previousItems = clip(body.previousItems, 400)
    const baseGarment = clip(body.baseGarment, 120)
    const baseSet = clip(body.baseSet, 400)
    const pregnancy = clip(body.pregnancy, 700)
    const retry = body.retry === true
    // audience 'child' → förenklad barn-prompt (väder/komfort/rätt storlek före
    // mode, ingen låt, inga stil-/formalitetsregler). Default 'adult'.
    const audience = body.audience === 'child' ? 'child' : 'adult'
    const childName = clip(body.childName, 40)

    if (!groupedList) return json({ error: 'Garderobslista saknas' }, 400)

    const retryInstruction = retry
      ? '\nVIKTIGT: Föregående försök saknade obligatoriska plagg. Se till att inkludera SKOR och NEDERDEL (eller klänning) denna gång.'
      : ''

    // ── Barn-outfit: logistik före styling ──────────────────────────────────
    if (audience === 'child') {
      const childPrompt = `Du hjälper en förälder att välja dagens outfit till sitt barn${childName ? ` (${childName})` : ''} ur barnets garderob nedan.
Prioritera i denna ordning: (1) rätt för vädret så barnet varken fryser eller blir för varmt, (2) bekvämt och rörelsevänligt för lek/förskola/skola, (3) att det passar årstiden. Snygg färgmatchning är en bonus, inte huvudsaken – välj hellre praktiskt och bekvämt.

${season ? `Årstid: det är ${season}.` : ''}
${weatherSummary}
${previousItems ? `Föregående förslag var: ${previousItems}. Ge ett annorlunda förslag denna gång.` : ''}
${recentOutfits ? `Nyligen föreslaget (upprepa inte samma kombination):\n${recentOutfits}` : ''}
${avoid}
${retryInstruction}

GARDEROB (välj ENDAST plagg från listan nedan, exakt som de heter):

${groupedList}

OBLIGATORISKA REGLER – följ dessa EXAKT:
1. SKOR: Du MÅSTE välja ett par skor. Outfit utan skor är ogiltig.
2. NEDERDEL: Du MÅSTE välja byxor/shorts eller kjol – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: Du MÅSTE välja topp eller tröja – SÅVIDA du inte väljer klänning.
4. Väljer du klänning → lägg inte till separata byxor/kjol/topp.
5. INGA DUBBLETTER: exakt EN överdel och EN nederdel, ett par skor. (Ett medvetet lager, t.ex. en tröja över en topp när det är svalt, är ok.)
${weatherRules ? '6. VÄDER: ' + weatherRules : ''}
${season ? `7. ÅRSTID: Det är ${season}. Välj plagg som passar årstiden.` : ''}
8. BEKVÄMT: undvik opraktiska plagg för en aktiv dag om bekvämare alternativ finns.

${langInstruction(body.lang)} OBS: Fälten "items" ska ALLTID vara plaggens namn EXAKT som de står i garderobslistan ovan (översätt dem INTE) – språkvalet gäller bara "outfitName" och "message".

Svara ENDAST med JSON, inga backticks:
{"outfitName": "kort namn på looken", "items": ["exakt plaggnamn 1", "exakt plaggnamn 2", "exakt plaggnamn 3"], "message": "Kort, varmt tips till föräldern om dagens outfit och varför den passar vädret (1–2 meningar)."}`

      const text = await openaiChat([{ role: 'user', content: childPrompt }], OPENAI_MODEL, 300, 0.8)
      const parsed = parseAiJson(text)
      if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
      return json(parsed)
    }

    const prompt = `Du är en personlig stylist. Välj en komplett outfit från garderoben nedan.

Kontext: ${contextLabel} – ${contextLogic}
${contextNote ? `Användarens egen önskan för "${contextLabel}": ${contextNote}\n(Väg in detta tydligt – det är användarens personliga instruktion för just detta tillfälle.)` : ''}
Intensitet: ${intensity}
${season ? `Årstid: det är ${season}.` : ''}
${weatherSummary}
${pregnancy ? '\n' + pregnancy + '\n' : ''}
VIKTIGT: Anpassa valet TYDLIGT efter kontexten "${contextLabel}". En festoutfit
ska skilja sig markant från en vardags-/jobboutfit – annan känsla, andra plagg.
Välj inte samma look oavsett tillfälle.
Varje plagg visas med sin typ inom parentes (t.ex. "(Festklänning, Svart)"). Använd
typen för att matcha formalitetsnivån: välj INTE utpräglade festplagg (t.ex.
Festklänning) till en ledig/vardaglig kontext, och inte utpräglat vardagliga plagg
till en festkontext.
${previousItems ? `Föregående förslag var: ${previousItems}. Ge ett TYDLIGT ANNORLUNDA förslag denna gång – byt ut minst hälften av plaggen (samma plagg får återkomma bara om garderoben är för liten för alternativ).` : ''}
${recentOutfits ? `DINA SENASTE FÖRSLAG (upprepa dem INTE – ge en ny kombination, särskilt INTE samma nederdel+överdel-par som nyligen):\n${recentOutfits}\nVariera från gång till gång precis som en riktig stylist – återanvänd bara ett plagg om garderoben saknar rimliga alternativ i rätt kategori.` : ''}
${avoid}${feedback ? `\nSmakprofil:\n${feedback}` : ''}
${retryInstruction}

GARDEROB (välj ENDAST plagg från listan nedan, exakt som de heter):

${groupedList}
${baseGarment ? `\nUTGÅNGSPLAGG (MÅSTE VARA MED): Bygg hela outfiten KRING plagget "${baseGarment}". Det plagget SKA ingå i "items" exakt som det heter i listan, och resten av looken ska väljas för att matcha och lyfta just det plagget (färg, stil, formalitet). Lägg INTE till ett annat plagg av samma typ/roll som utgångsplagget.\n` : ''}
${baseSet ? `\nUTGÅNGSSET (MÅSTE VARA MED): Följande plagg hör ihop som ett set och ska ALLA ingå i "items", exakt som de heter i listan: ${baseSet}. Bygg resten av outfiten (t.ex. skor och ev. saknad över-/nederdel) runt setet så helheten blir komplett och snygg. Lägg inte till plagg som krockar med setet.\n` : ''}
OBLIGATORISKA REGLER – följ dessa EXAKT:
1. SKOR: Du MÅSTE välja ett par skor. Outfit utan skor är ogiltig.
2. NEDERDEL: Du MÅSTE välja byxor eller kjol – SÅVIDA du inte väljer klänning.
3. ÖVERDEL: Du MÅSTE välja topp eller tröja – SÅVIDA du inte väljer klänning.
4. Väljer du klänning → lägg inte till separata byxor/kjol/topp.
5. INGA DUBBLETTER: Välj ALDRIG två plagg av samma typ eller roll – t.ex. inte
   två skjortor, två toppar, två tröjor, två par byxor eller två par skor. Exakt
   EN överdel och EN nederdel. (Ett medvetet lager, t.ex. en skjorta UNDER en
   stickad tröja, är ok – men aldrig två av exakt samma plaggtyp.)
${weatherRules ? '6. VÄDER: ' + weatherRules : ''}
${season ? `7. ÅRSTID: Det är ${season}. Välj plagg som passar årstiden – inga tunga vinterplagg på sommaren eller tunna sommarplagg på vintern.` : ''}

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
${styleRules ? `\nANVÄNDARENS EGNA STILREGLER – följ dessa NOGA, de väger tungt:\n${styleRules}` : ''}

Föreslå också EN låt som matchar outfitens känsla och kontexten. Välj en riktig,
känd låt som går att hitta på Apple Music.
LÅTREGLER:
- VARIERA! Fastna inte i självklara klichéer (t.ex. Uptown Funk, Happy, Good as Hell).
  Överraska med olika artister och årtionden VARJE gång.
- Låten ska matcha känslan i just "${contextLabel}" – en låt för en jobbdag ska
  låta annorlunda än en för fest eller date. Välj INTE samma stämning oavsett tillfälle.
${musicGenres ? `- Användaren lyssnar helst på: ${musicGenres}. Välj ENDAST en låt som hör hemma i någon av dessa genrer.` : '- Variera mellan olika genrer från gång till gång.'}
${previousSong ? `- Du föreslog ALLDELES NYSS "${previousSong}". Det är FÖRBJUDET att föreslå den låten igen OCH förbjudet att välja en annan låt av samma artist – välj en HELT annan artist och en helt annan låt.` : ''}
${avoidSongs ? `- FÖRBJUDET att föreslå någon av dessa nyligen använda låtar eller en annan låt av samma artister (välj en helt annan): ${avoidSongs}` : ''}

${langInstruction(body.lang)} OBS: Fälten "items" ska ALLTID vara plaggens namn EXAKT som de står i garderobslistan ovan (översätt dem INTE) – språkvalet gäller bara den text du själv skapar: "outfitName", "message" och "song.reason".

Svara ENDAST med JSON, inga backticks:
{"outfitName": "namn", "items": ["exakt plaggnamn 1", "exakt plaggnamn 2", "exakt plaggnamn 3"], "message": "Personligt, emotionellt budskap om looken (1–2 meningar).", "song": {"title": "låttitel", "artist": "artist", "reason": "kort varför den passar dagens känsla (max 1 mening)"}}`

    const text = await openaiChat([{ role: 'user', content: prompt }], OPENAI_MODEL, 350, 0.9)
    const parsed = parseAiJson(text)
    if (!Array.isArray(parsed.items)) return json({ error: 'AI:n gav ett ogiltigt svar' }, 502)
    return json(parsed)
  } catch (e: any) {
    return json({ error: e.message }, 500)
  }
}
