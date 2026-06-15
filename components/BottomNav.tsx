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
  const pathname = usePathname()

  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const active = pathname === tab.path
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.path)}
            accessibilityLabel={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {active && <View style={styles.activeIndicator} />}
            <Ionicons
              name={(active ? tab.icon : tab.iconOutline) as any}
              size={22}
              color={active ? '#FBF3EF' : 'rgba(221,160,167,0.45)'}
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

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6,0,3,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,115,122,0.08)',
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
    backgroundColor: '#9E2035',
  },
  label: {
    fontSize: 11,
    color: 'rgba(221,160,167,0.45)',
    fontWeight: '500',
  },
  labelActive: {
    color: '#FBF3EF',
    fontWeight: '700',
  },
})