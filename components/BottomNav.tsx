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
          >
            <Ionicons
              name={(active ? tab.icon : tab.iconOutline) as any}
              size={22}
              color={active ? '#DDA0A7' : '#DDA0A7'}
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
  label: {
    fontSize: 9,
    color: '#DDA0A7',
    fontWeight: '500',
  },
  labelActive: {
    color: '#DDA0A7',
    fontWeight: '700',
  },
})