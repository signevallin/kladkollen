// Enda källa för appens domäntyper. Byggda direkt på det genererade
// Supabase-schemat (types/supabase.ts) så de aldrig glider isär från databasen
// – fältnamnsbuggar (t.ex. archive_reason vs archiveReason) fångas då av tsc.
//
// Använd dessa i stället för `any` när du hanterar rader från tabellerna.
// Row = så data ser ut när den läses; Insert/Update = för skrivningar.
import type { Tables, TablesInsert, TablesUpdate } from './supabase'

export type Garment = Tables<'garments'>
export type Outfit = Tables<'outfits'>
export type WishItem = Tables<'wishlist'>
export type Profile = Tables<'profiles'>
export type Trip = Tables<'trips'>
export type CalendarEntry = Tables<'outfit_calendar'>

export type GarmentInsert = TablesInsert<'garments'>
export type GarmentUpdate = TablesUpdate<'garments'>
export type WishItemInsert = TablesInsert<'wishlist'>
export type ProfileUpdate = TablesUpdate<'profiles'>

export type { Database, Json } from './supabase'
