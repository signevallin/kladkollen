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

export const translations: Record<Lang, Dict> = { sv, en }

export function translate(lang: Lang, key: string): string {
  return translations[lang]?.[key] ?? translations.sv[key] ?? key
}
