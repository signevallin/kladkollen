import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { Ionicons } from '@expo/vector-icons'
import { router, usePathname } from 'expo-router'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

// Ljusblå plusknapp – samma i både ljust och mörkt läge (som användaren bad om).
const PLUS_BLUE = '#DDE6ED'
// Mörk ikon för god kontrast mot den ljusa knappen.
const PLUS_ICON = '#402D21'

// Fyra flikar + en upphöjd plusknapp i mitten (Statistik nås numera via Profil).
const tabs = [
  { name: 'home',        label: 'Hem',      icon: 'home',     iconOutline: 'home-outline',     path: '/home' },
  { name: 'wardrobe',    label: 'Garderob', icon: 'shirt',    iconOutline: 'shirt-outline',    path: '/wardrobe' },
  { name: 'my-outfit',   label: 'Outfits',  icon: 'sparkles', iconOutline: 'sparkles-outline', path: '/my-outfit' },
  { name: 'inspiration', label: 'Inspo',    icon: 'camera',   iconOutline: 'camera-outline',   path: '/inspiration' },
]

const addOptions = [
  { label: 'Lägg till plagg',           icon: 'shirt-outline',    path: '/add-garment' },
  { label: 'Lägg till outfit',          icon: 'sparkles-outline', path: '/collage' },
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
          <View style={styles.menuCard}>
            {addOptions.map((o, i) => (
              <TouchableOpacity
                key={o.path + i}
                style={[styles.menuRow, i > 0 && styles.menuRowBorder]}
                onPress={() => go(o.path)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={o.icon as any} size={20} color={t.primary} />
                </View>
                <Text style={styles.menuLabel}>{o.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={t.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
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

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', paddingBottom: 96, paddingHorizontal: 24 },
  menuCard: { backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  menuRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
})
