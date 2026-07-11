import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { Ionicons } from '@expo/vector-icons'
import { router, usePathname } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const tabs = [
  { name: 'home',        label: 'Home',      icon: 'home',       iconOutline: 'home-outline',       path: '/home' },
  { name: 'wardrobe',    label: 'Garderob',  icon: 'shirt',      iconOutline: 'shirt-outline',      path: '/wardrobe' },
  { name: 'my-outfit',   label: 'Outfits',   icon: 'sparkles',   iconOutline: 'sparkles-outline',   path: '/my-outfit' },
  { name: 'inspiration', label: 'Inspo',     icon: 'camera',     iconOutline: 'camera-outline',     path: '/inspiration' },
  { name: 'stats',       label: 'Statistik', icon: 'bar-chart',  iconOutline: 'bar-chart-outline',  path: '/stats' },
]

export default function BottomNav() {
  const t = useTheme()
  const styles = makeStyles(t)
  const pathname = usePathname()

  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
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
            {active && <View style={styles.activeIndicator} />}
            <Ionicons
              name={(active ? tab.icon : tab.iconOutline) as any}
              size={22}
              color={active ? t.primary : t.textFaint}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(254,250,248,0.97)',
    borderTopWidth: 1,
    borderTopColor: t.border,
    paddingBottom: 24,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: t.primary,
  },
  label: {
    fontSize: 11,
    color: t.textFaint,
    fontWeight: '500',
  },
  labelActive: {
    color: t.textPrimary,
    fontWeight: '700',
  },
})