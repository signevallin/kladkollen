// Enkla på/av-flaggor för funktioner som tillfälligt döljs (t.ex. inför ett
// App Store-bygge) utan att koden tas bort. Slå på igen genom att sätta true.

// "Skanna flera plagg" (add-garment): multi-detektering ur en bild via
// api/detect-garments. Träffsäkerheten på beskärningen beror på hur väl
// bildmodellen lokaliserar varje plagg – funkar bäst när plaggen ligger
// UTLAGDA med mellanrum mot en enfärgad bakgrund, inte som en buren/
// överlappande outfit (då går plaggen inte att särskilja i en ruta).
//
// PÅ igen i 1.0.3. Var av i 1.0.2 därför att förbättringen i #466 inte hunnit
// handtestas – den ska med i en release som faktiskt provats. Testa mot en
// bild med plaggen UTLAGDA och isär innan bygget skickas in.
export const SCAN_MULTIPLE_ENABLED = true
