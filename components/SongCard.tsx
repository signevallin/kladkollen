import { Ionicons } from '@expo/vector-icons'
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { useEffect } from 'react'
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useSettings } from '../utils/settings'
import AppleMusicBadge from './AppleMusicBadge'
import SpotifyLogo from './SpotifyLogo'

export type SongData = {
  title: string
  artist: string
  reason?: string
  previewUrl?: string | null
  artwork?: string | null
  appleMusicUrl?: string | null
}

// Visar dagens matchande låt med 30-sekunders-preview från Apple (iTunes Search API).
export default function SongCard({ song }: { song: SongData }) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const player = useAudioPlayer(song.previewUrl ? { uri: song.previewUrl } : null)
  const status = useAudioPlayerStatus(player)
  const playing = !!status?.playing

  // Spela även när telefonens ljudomkopplare står på tyst (annars händer inget
  // på iOS när man trycker play).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
  }, [])

  function togglePlay() {
    if (!song.previewUrl) return
    if (playing) {
      player.pause()
    } else {
      player.seekTo(0)
      player.play()
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.header}>{tr('Dagens låt')}</Text>
      <View style={styles.row}>
        {song.artwork
          ? <Image source={{ uri: song.artwork }} style={styles.artwork} />
          : <View style={[styles.artwork, styles.artworkEmpty]} />
        }
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{song.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
        </View>
        {song.previewUrl ? (
          <TouchableOpacity
            style={styles.playBtn}
            onPress={togglePlay}
            accessibilityLabel={playing ? 'Pausa preview' : 'Spela preview'}
            accessibilityRole="button"
          >
            <Ionicons name={playing ? 'pause' : 'play'} size={22} color={t.onPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Motiveringen på egen rad i full bredd så hela texten syns */}
      {song.reason ? <Text style={styles.reason}>{song.reason}</Text> : null}

      {/* Apple Music alltid FÖRST i raden (Apple §1.3). Clear space runt badgen
          säkras av appleBadge-paddingen (≥1/10 av höjden, §1.4). */}
      <View style={styles.links}>
        {song.appleMusicUrl ? (
          <TouchableOpacity
            style={styles.appleBadge}
            onPress={() => Linking.openURL(song.appleMusicUrl!)}
            accessibilityLabel="Lyssna på Apple Music"
            accessibilityRole="link"
          >
            <AppleMusicBadge height={30} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.badge}
          onPress={() => Linking.openURL(`https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artist}`)}`)}
          accessibilityLabel="Lyssna på Spotify"
          accessibilityRole="link"
        >
          <SpotifyLogo size={18} />
          <Text style={styles.badgeText}>Spotify</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  card: { backgroundColor: t.surfaceMuted, borderRadius: t.radius.lg, padding: 14, gap: 12, borderWidth: 1, borderColor: t.borderSoft },
  header: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  artwork: { width: 56, height: 56, borderRadius: 10 },
  artworkEmpty: { backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  artist: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary },
  reason: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textFaint, fontStyle: 'italic', lineHeight: 19 },
  playBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Clear space runt Apple-badgen (≥1/10 av 30px-höjden = 3px, §1.4).
  appleBadge: { padding: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#000', borderRadius: 19, paddingHorizontal: 14, height: 38 },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff' },
})
