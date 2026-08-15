// Gör om en sparad färganalys (profiles.color_analysis, JSON) till en kort
// svensk palett-sträng som AI-prompterna (outfit- och rese-generering) kan väga
// in. Tom sträng om ingen palett finns. Delad mellan hem- och rese-flödet.
export function colorPalettePrompt(ca: any): string {
  const p = ca?.palett
  if (!p) return ''
  const names = (arr: any[]) => (arr || []).map((c: any) => c?.namn).filter(Boolean).join(', ')
  const parts = [
    names(p.bas) && `Basfärger: ${names(p.bas)}`,
    names(p.kompletterande) && `Komplementfärger: ${names(p.kompletterande)}`,
    names(p.accent) && `Accentfärger: ${names(p.accent)}`,
    names(p.undvik) && `Undvik: ${names(p.undvik)}`,
  ].filter(Boolean)
  return parts.join('. ')
}
