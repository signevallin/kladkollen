import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { MaterialIcons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { goBack } from '../utils/nav'

// Statusgrupper i barnets garderob – speglar hand-me-down-flödet.
const GROUPS: { key: string; label: string; match: (status: string | null) => boolean }[] = [
  { key: 'in_use', label: 'Används', match: s => !s || s === 'in_use' },
  { key: 'stored', label: 'Sparad i låda', match: s => s === 'stored' },
  { key: 'outgrown', label: 'Urvuxen', match: s => s === 'outgrown' },
]

export default function ChildCloset() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { child: childId, name } = useLocalSearchParams<{ child?: string; name?: string }>()
  const [garments, setGarments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => { load() /* läs om vid varje fokus (efter redigering/tillägg) */ }, [childId]),
  )

  async function load() {
    if (!childId) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('garments')
        .select('*')
        .eq('person_id', childId)
        .eq('sold', false)
      setGarments(data || [])
    } finally {
      setLoading(false)
    }
  }

  const childName = name || 'Barnet'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/family')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{childName}s garderob</Text>

        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-garment')}>
          <MaterialIcons name="add" size={18} color={t.onPrimary} />
          <Text style={styles.addBtnText}>Lägg till plagg</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : garments.length === 0 ? (
          <Text style={styles.empty}>Inga plagg än. Lägg till plagg och märk dem med {childName} – eller använd "Lägg in en hel låda" i inmatningen.</Text>
        ) : (
          GROUPS.map(group => {
            const list = garments.filter(g => group.match(g.status))
            if (list.length === 0) return null
            return (
              <View key={group.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{group.label} ({list.length})</Text>
                <View style={styles.grid}>
                  {list.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={styles.card}
                      onPress={() => router.push(`/garment-detail?id=${g.id}`)}
                      activeOpacity={0.8}
                    >
                      {g.image_url ? <SignedImage path={g.image_url} style={styles.cardImg} /> : <View style={styles.cardImgEmpty} />}
                      <Text style={styles.cardName} numberOfLines={1}>{g.name}</Text>
                      {g.size_cm ? <Text style={styles.cardSize}>stl {g.size_cm}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 12 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 24, color: t.textPrimary, marginBottom: 16 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.primary, borderRadius: 14, paddingVertical: 12, marginBottom: 20 },
  addBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  empty: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 30, fontStyle: 'italic', lineHeight: 21, paddingHorizontal: 16 },

  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 12, letterSpacing: 1, color: t.textSecondary, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '30%', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: t.border },
  cardImg: { width: '100%', height: 84, borderRadius: 10, marginBottom: 4 },
  cardImgEmpty: { width: '100%', height: 84, borderRadius: 10, backgroundColor: t.surface, marginBottom: 4 },
  cardName: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textPrimary, textAlign: 'center' },
  cardSize: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: t.textSecondary, textAlign: 'center', marginTop: 1 },
})
