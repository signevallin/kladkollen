// Enkla på/av-flaggor för funktioner som tillfälligt döljs (t.ex. inför ett
// App Store-bygge) utan att koden tas bort. Slå på igen genom att sätta true.

// "Skanna flera plagg" (add-garment): multi-detektering ur en bild via
// api/detect-garments. Återinförd efter 1.0.1. Träffsäkerheten på beskärningen
// beror på hur väl bildmodellen lokaliserar varje plagg – funkar bäst när
// plaggen ligger UTLAGDA med mellanrum mot en enfärgad bakgrund, inte som en
// buren/överlappande outfit (då går plaggen inte att särskilja i en ruta).
export const SCAN_MULTIPLE_ENABLED = true
