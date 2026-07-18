import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { Ionicons } from '@expo/vector-icons'
import { router, usePathname } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Ljusblå plusknapp – samma i både ljust och mörkt läge (som användaren bad om).
const PLUS_BLUE = '#DDE6ED'
const PLUS_ICON = '#402D21'

// Fyra flikar + en upphöjd plusknapp i mitten (Statistik nås numera via Profil).
const tabs = [
  { name: 'home',        label: 'Hem',      icon: 'home',     iconOutline: 'home-outline',     path: '/home' },
  { name: 'wardrobe',    label: 'Garderob', icon: 'shirt',    iconOutline: 'shirt-outline',    path: '/wardrobe' },
  { name: 'my-outfit',   label: 'Outfits',  icon: 'sparkles', iconOutline: 'sparkles-outline', path: '/my-outfit' },
  { name: 'inspiration', label: 'Inspo',    icon: 'camera',   iconOutline: 'camera-outline',   path: '/inspiration' },
]

const addOptions = [
  { label: 'Lägg till plagg',            icon: 'shirt-outline',    path: '/add-garment' },
  { label: 'Lägg till outfit',           icon: 'sparkles-outline', path: '/my-outfit?create=1' },
  { label: 'Lägg till inspirationsbild', icon: 'camera-outline',   path: '/inspiration' },
]

// onAddGarment: låter en skärm (t.ex. garderoben) ta över vad "Lägg till plagg"
// gör – t.ex. öppna köp-/sälj-flödet beroende på vilken flik man är på.
export default function BottomNav({ onAddGarment }: { onAddGarment?: () => void } = {}) {
  const t = useTheme()
  const styles = makeStyles(t)
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  function renderTab(tab: typeof tabs[number]) {
    const active = pathname === tab.path
    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => router.push(tab.path as any)}
        accessibilityLabel={tab.label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Ionicons
          name={(active ? tab.icon : tab.iconOutline) as any}
          size={22}
          color={active ? t.primary : t.textFaint}
        />
        <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
      </TouchableOpacity>
    )
  }

  function go(path: string) {
    setMenuOpen(false)
    router.push(path as any)
  }

  return (
    <View style={styles.wrapper}>
      {/* Popup ovanför nav-baren – nav-baren själv ändrar aldrig utseende. */}
      {menuOpen && (
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.cardTitle}>Lägg till</Text>
            {addOptions.map((o, i) => (
              <TouchableOpacity
                key={o.path + i}
                style={[styles.optionRow, i === 0 ? styles.optionRowFirst : styles.optionRowRest]}
                onPress={() => {
                  if (o.path === '/add-garment' && onAddGarment) { setMenuOpen(false); onAddGarment() }
                  else go(o.path)
                }}
                accessibilityRole="button"
                accessibilityLabel={o.label}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name={o.icon as any} size={20} color="#2B2320" />
                </View>
                <Text style={styles.optionLabel}>{o.label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#6B605A" />
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      )}

      <View style={styles.nav}>
        {renderTab(tabs[0])}
        {renderTab(tabs[1])}

        <View style={styles.plusSlot}>
          <TouchableOpacity
            style={styles.plusBtn}
            onPress={() => setMenuOpen(o => !o)}
            accessibilityLabel={menuOpen ? 'Stäng' : 'Lägg till'}
            accessibilityRole="button"
          >
            <Ionicons name={menuOpen ? 'close' : 'add'} size={27} color={PLUS_ICON} />
          </TouchableOpacity>
        </View>

        {renderTab(tabs[2])}
        {renderTab(tabs[3])}
      </View>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrapper: { position: 'relative' },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.bg,
    borderTopWidth: 1,
    borderTopColor: t.border,
    height: 58,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  plusSlot: { width: 64, alignItems: 'center' },
  plusBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: PLUS_BLUE,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ translateY: -16 }],
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: { fontSize: 11, color: t.textFaint, fontWeight: '500' },
  labelActive: { color: t.textPrimary, fontWeight: '700' },

  // ── Popup ovanför nav-baren ──
  overlay: {
    position: 'absolute', left: 0, right: 0, bottom: '100%',
    height: 1200, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 16,
    paddingBottom: 12, // litet mellanrum mellan popup och nav-bar
  },
  card: { backgroundColor: PLUS_BLUE, borderRadius: 28, padding: 14 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#2B2320', marginBottom: 12, marginLeft: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 20, marginBottom: 8 },
  optionRowFirst: { backgroundColor: '#FFFFFF' },
  optionRowRest: { backgroundColor: 'rgba(255,255,255,0.55)' },
  optionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#2B2320' },
})
