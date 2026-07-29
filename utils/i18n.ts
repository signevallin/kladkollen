// Enkel i18n för appen. Språket väljs i profilen och lagras via useSettings().
// Nya strängar läggs till här (sv + en). Saknas en engelsk nyckel faller vi
// tillbaka på svenskan, så appen aldrig visar en tom text under utrullningen.

export type Lang = 'sv' | 'en'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'sv', label: 'Svenska' },
  { code: 'en', label: 'English' },
]

type Dict = Record<string, string>

const sv: Dict = {
  // Bottennavigering
  'nav.home': 'Hem',
  'nav.wardrobe': 'Garderob',
  'nav.add': 'Lägg till',
  'nav.outfits': 'Outfits',
  'nav.inspo': 'Inspo',

  // Lägg till-menyn
  'add.garment': 'Lägg till plagg',
  'add.outfit': 'Lägg till outfit',
  'add.inspo': 'Lägg till inspirationsbild',

  // Gemensamt
  'common.save': 'Spara',
  'common.cancel': 'Avbryt',
  'common.done': 'Klar',
  'common.delete': 'Ta bort',
  'common.back': 'Tillbaka',
  'common.add': 'Lägg till',
  'common.all': 'Alla',
  'common.close': 'Stäng',

  // Profil – inställningar
  'profile.language': 'Språk',
  'profile.currency': 'Valuta',
  'profile.temperature': 'Temperatur',
  'profile.notifications': 'Notiser',
}

const en: Dict = {
  'nav.home': 'Home',
  'nav.wardrobe': 'Wardrobe',
  'nav.add': 'Add',
  'nav.outfits': 'Outfits',
  'nav.inspo': 'Inspo',

  'add.garment': 'Add garment',
  'add.outfit': 'Add outfit',
  'add.inspo': 'Add inspiration photo',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.done': 'Done',
  'common.delete': 'Delete',
  'common.back': 'Back',
  'common.add': 'Add',
  'common.all': 'All',
  'common.close': 'Close',

  'profile.language': 'Language',
  'profile.currency': 'Currency',
  'profile.temperature': 'Temperature',
  'profile.notifications': 'Notifications',
}

// ── Engelska överättningar nycklade på den svenska källsträngen ──────────────
// För text som också är data (kategorier, kontexter, säsonger, väder) eller som
// bara finns hårdkodad i en skärm låter vi den svenska strängen vara nyckel.
// I svenskt läge faller translate() tillbaka på nyckeln = originaltexten, så vi
// behöver bara fylla i engelskan här. Namn m.m. interpoleras i koden.
const enBySource: Dict = {
  // Hälsning + väder (hemskärmen)
  'God morgon': 'Good morning',
  'Hej': 'Hi',
  'God kväll': 'Good evening',
  'Klart': 'Clear',
  'Halvklart': 'Partly cloudy',
  'Dimma': 'Fog',
  'Regn': 'Rain',
  'Snö': 'Snow',
  'Skurar': 'Showers',
  'Åska': 'Thunderstorm',
  'Okänt': 'Unknown',

  // Kontexter (outfit-generering)
  'Jobb': 'Work',
  'Skola': 'School',
  'Ledig': 'Casual',
  'Aktiv': 'Active',
  'Date': 'Date',
  'Fest': 'Party',

  // Hemskärmen – knappar och etiketter
  'Min profil': 'My profile',
  'Kontext:': 'Context:',
  'Anpassa efter väder': 'Adapt to weather',
  'Utgår från plagg': 'Based on garment',
  'Utgå från ett plagg': 'Base on a garment',
  'Valfritt – bygg outfiten kring ett plagg': 'Optional – build the outfit around a garment',
  'Ta bort utgångsplagg': 'Remove base garment',
  'Generera outfit': 'Generate outfit',
  'Generera outfits för mig och': 'Generate outfits for me and',
  'Lägg till': 'Add',
  'Byt ut': 'Swap',
  'Vad tyckte du om looken?': 'What did you think of the look?',
  'Betyg': 'Rating',
  'av': 'of',
  'Spara outfit': 'Save outfit',
  'Dela outfit': 'Share outfit',
  'Outfit sparad': 'Outfit saved',
  'Sparad': 'Saved',
  'Spara båda': 'Save both',
  'Vald för idag': 'Chosen for today',
  'Vill ha på mig idag': 'Wear today',
  'Lånar:': 'Borrowing:',
  'Jag': 'Me',
  'partner': 'partner',

  // Plagg-väljare / byt-ut-modal (hemskärmen)
  'Sök plagg eller färg...': 'Search garment or colour...',
  'Kategori': 'Category',
  'Typ': 'Type',
  'Färg': 'Colour',
  'Säsong': 'Season',
  'Rensa': 'Clear',
  'Alla': 'All',
  'Inga plagg matchar filtren': 'No garments match the filters',
  'Lägg till plagg': 'Add garment',
  'Ta bort ur outfiten': 'Remove from outfit',
  'Inga andra plagg i samma kategori': 'No other garments in the same category',

  // Hemskärmen – aviseringar (showAlert)
  'Lägg till plagg i garderoben först!': 'Add garments to your wardrobe first!',
  'Något gick fel': 'Something went wrong',
  'AI:n gav inget giltigt förslag – försök igen.': 'The AI didn’t return a valid suggestion – please try again.',
  'Dela din outfit': 'Share your outfit',
  'Min outfit': 'My outfit',
  'Delning stöds inte här': 'Sharing isn’t supported here',
  'Öppna appen på din telefon för att dela din outfit.': 'Open the app on your phone to share your outfit.',
  'Kunde inte dela': 'Couldn’t share',
  'För få plagg': 'Too few garments',
  'Ni behöver båda ha plagg i garderoben.': 'You both need garments in your wardrobe.',
  'Sparat!': 'Saved!',
  'Outfitsen sparades hos både dig och': 'The outfits were saved for both you and',
  'Outfit sparad!': 'Outfit saved!',
  'Du hittar den under Outfits.': 'You’ll find it under Outfits.',
  'Vald för idag!': 'Chosen for today!',
  'Outfit vald för idag!': 'Outfit chosen for today!',
  'Den syns nu i din kalender och plaggen räknas som använda.': 'It now shows in your calendar and the garments count as worn.',
  'Looken lades i kalendern hos både dig och': 'The look was added to the calendar for both you and',
}

Object.assign(en, enBySource)

export const translations: Record<Lang, Dict> = { sv, en }

export function translate(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.sv[key] ?? key
}
