import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiPost } from './api'
import type { SongData } from '../components/SongCard'

// "Dagens låt" delas av tre flöden: egen outfit (hem), par-outfit och
// Familjen idag. Logiken låg tidigare inbakad i hemskärmen; den ligger här så
// att alla tre minns samma låtar och undviker samma upprepningar.
//
// Låten är alltid bonus – misslyckas något returneras null och outfiten visas
// ändå. Den ska aldrig kunna sänka en generering.

const RECENT_SONGS_KEY = 'kladkollen_recent_songs'
const KEEP = 50

export type RawSong = { title?: string; artist?: string; reason?: string }

// Underlag till prompten: vilka låtar AI:n ska undvika och vilken som kom sist.
export async function songHistory(): Promise<{ avoidSongs: string; previousSong: string }> {
  try {
    const recent: string[] = JSON.parse((await AsyncStorage.getItem(RECENT_SONGS_KEY)) || '[]')
    return { avoidSongs: recent.slice(0, KEEP).join(', '), previousSong: recent[0] || '' }
  } catch {
    return { avoidSongs: '', previousSong: '' }
  }
}

// Minns låten och hämtar Apple Music-preview. Returnerar null när det inte
// finns någon låt att visa – anropande skärm renderar då ingenting.
export async function resolveSong(raw: RawSong | null | undefined): Promise<SongData | null> {
  if (!raw?.title) return null

  // Minns som "Titel – Artist" så nästa generering kan undvika både samma låt
  // och samma artist.
  try {
    const entry = raw.artist ? `${raw.title} – ${raw.artist}` : raw.title
    const recent: string[] = JSON.parse((await AsyncStorage.getItem(RECENT_SONGS_KEY)) || '[]')
    const next = [entry, ...recent.filter(s => s !== entry)].slice(0, KEEP)
    await AsyncStorage.setItem(RECENT_SONGS_KEY, JSON.stringify(next))
  } catch { /* historiken är en bekvämlighet, inte ett krav */ }

  try {
    const { song } = await apiPost('/api/song-preview', { title: raw.title, artist: raw.artist })
    return song ? { ...song, reason: raw.reason } : null
  } catch {
    return null
  }
}
