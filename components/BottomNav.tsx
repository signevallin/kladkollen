import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { Ionicons } from '@expo/vector-icons'
import { router, usePathname } from 'expo-router'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Ljusblå plusknapp – samma i både ljust och mörkt läge (som användaren bad om).
const PLUS_BLUE = '#DDE6ED'
const PLUS_ICON = '#402D21'
// Mörk pill-nav i öppet läge – fast mörk oavsett tema (som referensen).
const PILL_DARK = '#1F1813'
const PILL_ICON = '#F3ECE4'

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

export default function BottomNav() {
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
          size={24}
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
    <View style={styles.nav}>
      {renderTab(tabs[0])}
      {renderTab(tabs[1])}

      <View style={styles.plusSlot}>
        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Lägg till"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={30} color={PLUS_ICON} />
        </TouchableOpacity>
      </View>

      {renderTab(tabs[2])}
      {renderTab(tabs[3])}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {/* Kort med alternativ */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Lägg till</Text>
              {addOptions.map((o, i) => (
                <TouchableOpacity
                  key={o.path + i}
                  style={[styles.optionRow, i === 0 ? styles.optionRowFirst : styles.optionRowRest]}
                  onPress={() => go(o.path)}
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
            </View>

            {/* Stäng-knapp som ligger mellan kortet och pill-navet */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setMenuOpen(false)}
              accessibilityLabel="Stäng"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#2B2320" />
            </TouchableOpacity>

            {/* Mörk pill-nav */}
            <View style={styles.pill}>
              {tabs.map(tab => (
                <TouchableOpacity
                  key={tab.name}
                  style={styles.pillTab}
                  onPress={() => go(tab.path)}
                  accessibilityLabel={tab.label}
                  accessibilityRole="button"
                >
                  <Ionicons name={tab.iconOutline as any} size={24} color={PILL_ICON} />
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: t.bg,
    borderTopWidth: 1,
    borderTopColor: t.border,
    paddingBottom: 24,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 4, height: 48 },
  plusSlot: { width: 72, alignItems: 'center' },
  plusBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PLUS_BLUE,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ translateY: -18 }],
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: { fontSize: 12, color: t.textFaint, fontWeight: '500' },
  labelActive: { color: t.textPrimary, fontWeight: '700' },

  // ── Öppet läge ──
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 16, paddingBottom: 28, alignItems: 'stretch' },
  card: { backgroundColor: PLUS_BLUE, borderRadius: 28, padding: 14, paddingBottom: 34 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#2B2320', marginBottom: 12, marginLeft: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 20, marginBottom: 8 },
  optionRowFirst: { backgroundColor: '#FFFFFF' },
  optionRowRest: { backgroundColor: 'rgba(255,255,255,0.55)' },
  optionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  optionLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#2B2320' },

  closeBtn: {
    alignSelf: 'center', width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    marginTop: -26, marginBottom: -26, zIndex: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },

  pill: { flexDirection: 'row', backgroundColor: PILL_DARK, borderRadius: 32, height: 68, alignItems: 'center', paddingTop: 14, paddingHorizontal: 16 },
  pillTab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
