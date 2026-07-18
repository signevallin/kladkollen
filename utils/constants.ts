// Enda källa för kategorier, typer, färger och säsonger. Importeras överallt
// så listorna aldrig glider isär mellan skärmar/filter/AI.

export const CATEGORIES = [
  'Toppar', 'Tröjor', 'Byxor', 'Shorts', 'Kjolar', 'Klänningar',
  'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer',
]

export const SUBCATEGORIES: Record<string, string[]> = {
  'Toppar': ['Linne', 'T-shirt', 'Piké', 'Långärmad topp', 'Body', 'Blus', 'Skjorta'],
  'Tröjor': ['Sweatshirt', 'Hoodie', 'Stickad tröja', 'Collegetröja', 'Kofta'],
  'Byxor': ['Jeans', 'Chinos', 'Kostymbyxor', 'Leggings', 'Mjukisbyxor'],
  'Shorts': ['Jeansshorts', 'Chinosshorts', 'Linneshorts', 'Träningsshorts', 'Skräddade shorts'],
  'Kjolar': ['Minikjol', 'Midikjol', 'Maxikjol', 'Plisserad kjol', 'Pennkjol'],
  'Klänningar': ['Miniklänning', 'Midiklänning', 'Maxiklänning', 'Festklänning', 'Vardagsklänning'],
  'Kavajer': ['Kavaj', 'Blazer', 'Kostymjacka'],
  'Ytterkläder': ['Kappa', 'Vinterjacka', 'Regnrock', 'Trenchcoat', 'Pufferjacka', 'Läderjacka', 'Dunjacka'],
  'Skor': ['Sneakers', 'Boots', 'Pumps', 'Sandaler', 'Loafers', 'Ballerinaskor', 'Tofflor'],
  'Väskor': ['Handväska', 'Ryggsäck', 'Tote bag', 'Kuvertväska', 'Crossbody'],
  'Accessoarer': ['Halsduk', 'Sjal', 'Bälte', 'Hatt', 'Keps', 'Mössa', 'Smycken', 'Solglasögon', 'Håraccessoarer'],
}

// Ordnad färglista med hex – ordningen används i väljare, filter och sortering.
export const COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'Svart', hex: '#1A1A1A' },
  { name: 'Vit', hex: '#F5F5F5' },
  { name: 'Grå', hex: '#9E9E9E' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Brun', hex: '#795548' },
  { name: 'Röd', hex: '#E53935' },
  { name: 'Vinröd', hex: '#7B2D3A' },
  { name: 'Rosa', hex: '#EC407A' },
  { name: 'Lila', hex: '#8E24AA' },
  { name: 'Blå', hex: '#1E88E5' },
  { name: 'Ljusblå', hex: '#81D4FA' },
  { name: 'Turkos', hex: '#26C6DA' },
  { name: 'Grön', hex: '#43A047' },
  { name: 'Olivgrön', hex: '#708238' },
  { name: 'Gul', hex: '#FDD835' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Guld', hex: '#C9A96E' },
  { name: 'Silver', hex: '#BFC1C2' },
]

export const COLOR_NAMES = COLOR_OPTIONS.map(c => c.name)
export const COLOR_HEX: Record<string, string> = Object.fromEntries(COLOR_OPTIONS.map(c => [c.name, c.hex]))

export const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']

// Färggrupper för stil-statistiken (Min stil).
export const COLOR_GROUPS: Record<string, string[]> = {
  'Mörka neutraler': ['Svart'],
  'Neutraler': ['Vit', 'Grå', 'Beige', 'Brun', 'Silver'],
  'Varmt & kraftfullt': ['Röd', 'Vinröd', 'Orange', 'Gul', 'Guld'],
  'Svalt & lugnt': ['Blå', 'Ljusblå', 'Turkos', 'Grön', 'Olivgrön'],
  'Romantiskt': ['Rosa', 'Lila'],
}
