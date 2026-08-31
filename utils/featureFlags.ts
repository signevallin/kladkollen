// Enkla på/av-flaggor för funktioner som tillfälligt döljs (t.ex. inför ett
// App Store-bygge) utan att koden tas bort. Slå på igen genom att sätta true.

// "Skanna flera plagg" (add-garment): multi-detektering ur en bild via
// api/detect-garments. Tillfälligt dold – träffsäkerheten behöver förbättras.
// Koden (scanMultiple, start=scan, api/detect-garments) finns kvar; dölj bara
// ingångarna. Sätt true för att visa den igen.
export const SCAN_MULTIPLE_ENABLED = false
