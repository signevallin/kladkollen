 import { DancingScript_400Regular, useFonts } from '@expo-google-fonts/dancing-script'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../components/BottomNav'
import { supabase } from '../supabase'

export default function Stats() {
  const [fontsLoaded] = useFonts({ DancingScript_400Regular })
  const [garments, setGarments] = useState([])
  const [totalWorn, setTotalWorn] = useState(0)

  useFocusEffect(
    useCallback(() => {
      fetchStats()
    }, [])
  )

  async function fetchStats() {
    const { data } = await supabase
      .from('garments')
      .select('*')
      .eq('archived', false)
      .order('times_worn', { ascending: false })

    if (data) {
      setGarments(data)
      setTotalWorn(data.reduce((sum, g) => sum + (g.times_worn || 0), 0))
    }
  }

  async function markForSale(item: any) {
    const { error } = await supabase
      .from('garments')
      .update({ for_sale: true })
      .eq('id', item.id)

    if (error) {
      Alert.alert('Något gick fel', error.message)
    } else {
      Alert.alert('🍒 Lagt till i säljlistan!', `${item.name} finns nu under Sälj-fliken i din garderob.`)
      fetchStats()
    }
  }

  const mostWorn = garments.filter(g => g.times_worn > 0).slice(0, 5)
  const neverWorn = garments.filter(g => !g.times_worn || g.times_worn === 0)
  const maxWorn = mostWorn[0]?.times_worn || 1

  const vintedTips = garments.filter(g => {
    if (g.for_sale) return false
    if (!g.times_worn || g.times_worn === 0) return true
    if (!g.last_worn) return false
    const daysSince = Math.floor(
      (Date.now() - new Date(g.last_worn).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSince >= 180
  }).slice(0, 5)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>Statistik</Text>
        <Text style={[styles.subtitle, fontsLoaded && { fontFamily: 'DancingScript_400Regular', fontSize: 22 }]}>
          Senaste 30 dagarna
        </Text>

        <View style={styles.heroCard}>
          <View>
            <Text style={styles.heroNumber}>{totalWorn}</Text>
            <Text style={styles.heroLabel}>gånger har du använt dina kläder</Text>
          </View>
          <Text style={styles.heroIcon}>👗</Text>
        </View>

        <View style={styles.miniStatsRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>{garments.length}</Text>
            <Text style={styles.miniStatLabel}>plagg totalt</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>{garments.filter(g => g.times_worn > 0).length}</Text>
            <Text style={styles.miniStatLabel}>använda</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatNum}>{neverWorn.length}</Text>
            <Text style={styles.miniStatLabel}>oanvända</Text>
          </View>
        </View>

        <View style={styles.usageCard}>
          <Text style={styles.usagePercent}>
            {garments.length > 0 ? Math.round((garments.filter(g => g.times_worn > 0).length / garments.length) * 100) : 0}%
          </Text>
          <Text style={styles.usageLabel}>av din garderob används aktivt</Text>
        </View>

        {mostWorn.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mest använda plagg</Text>
            {mostWorn.map((item) => (
              <View key={item.id} style={styles.barRow}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.barImage} />
                ) : (
                  <View style={styles.barImageEmpty}>
                    <Text style={{ fontSize: 18 }}>👗</Text>
                  </View>
                )}
                <View style={styles.barInfo}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barName}>{item.name}</Text>
                    <Text style={styles.barCount}>{item.times_worn}×</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(item.times_worn / maxWorn) * 100}%` }]} />
                  </View>
                  <Text style={styles.barCategory}>{item.category}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {neverWorn.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aldrig använda</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalList}>
                {neverWorn.map((item) => (
                  <View key={item.id} style={styles.neverItem}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.neverImage} />
                    ) : (
                      <View style={styles.neverImageEmpty}>
                        <Text style={{ fontSize: 24 }}>👗</Text>
                      </View>
                    )}
                    <Text style={styles.neverName} numberOfLines={1}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {vintedTips.length > 0 && (
          <View style={styles.vintedSection}>
            <View style={styles.vintedHeader}>
              <Text style={styles.vintedTitle}>Sälj på Vinted</Text>
              <View style={styles.vintedBadge}>
                <Text style={styles.vintedBadgeText}>{vintedTips.length} tips</Text>
              </View>
            </View>
            <Text style={styles.vintedSubtitle}>
              Dessa plagg har inte använts på länge – dags att sälja?
            </Text>

            {vintedTips.map((item) => {
              const daysSince = item.last_worn
                ? Math.floor((Date.now() - new Date(item.last_worn).getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <View key={item.id} style={styles.vintedItem}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.vintedImage} />
                  ) : (
                    <View style={styles.vintedImageEmpty}>
                      <Text style={{ fontSize: 24 }}>👗</Text>
                    </View>
                  )}
                  <View style={styles.vintedInfo}>
                    <Text style={styles.vintedItemName}>{item.name}</Text>
                    <Text style={styles.vintedItemCategory}>{item.category}</Text>
                    <Text style={styles.vintedDays}>
                      {daysSince ? `Inte använd på ${daysSince} dagar` : 'Aldrig använd'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.vintedButton} onPress={() => markForSale(item)}>
                    <Text style={styles.vintedButtonText}>Sälj</Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}

      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FBF3EF', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#C4737A', marginBottom: 20, marginTop: 2 },
  heroCard: {
    backgroundColor: '#9E2035',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroNumber: { fontSize: 56, fontWeight: 'bold', color: '#FBF3EF', lineHeight: 60 },
  heroLabel: { fontSize: 13, color: 'rgba(251,243,239,0.7)', marginTop: 4, maxWidth: 160 },
  heroIcon: { fontSize: 48, opacity: 0.5 },
  miniStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  miniStat: {
    flex: 1,
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.15)',
  },
  miniStatNum: { fontSize: 24, fontWeight: 'bold', color: '#DDA0A7' },
  miniStatLabel: { fontSize: 10, color: '#C4737A', marginTop: 2, fontStyle: 'italic' },
  usageCard: {
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
  },
  usagePercent: { fontSize: 36, fontWeight: 'bold', color: '#DDA0A7' },
  usageLabel: { fontSize: 14, color: '#C4737A', flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FBF3EF', marginBottom: 12, letterSpacing: 0.5 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  barImage: { width: 44, height: 44, borderRadius: 10 },
  barImageEmpty: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  barInfo: { flex: 1 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barName: { fontSize: 13, color: '#FBF3EF', fontWeight: '500' },
  barCount: { fontSize: 13, color: '#DDA0A7', fontWeight: '600' },
  barTrack: { height: 5, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: '#C4737A' },
  barCategory: { fontSize: 10, color: 'rgba(196,115,122,0.6)', fontStyle: 'italic' },
  horizontalList: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  neverItem: { width: 80, alignItems: 'center', gap: 6 },
  neverImage: { width: 72, height: 72, borderRadius: 14 },
  neverImageEmpty: {
    width: 72, height: 72, borderRadius: 14,
    backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)',
  },
  neverName: { fontSize: 10, color: '#C4737A', textAlign: 'center' },
  vintedSection: {
    backgroundColor: 'rgba(221,160,167,0.08)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(221,160,167,0.2)', marginBottom: 20,
  },
  vintedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  vintedTitle: { fontSize: 18, fontWeight: 'bold', color: '#FBF3EF' },
  vintedBadge: { backgroundColor: '#9E2035', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  vintedBadgeText: { fontSize: 11, color: '#FBF3EF', fontWeight: '600' },
  vintedSubtitle: { fontSize: 12, color: '#C4737A', fontStyle: 'italic', marginBottom: 14 },
  vintedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
    backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 14, padding: 10,
  },
  vintedImage: { width: 52, height: 52, borderRadius: 10 },
  vintedImageEmpty: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: 'rgba(122,24,40,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  vintedInfo: { flex: 1 },
  vintedItemName: { fontSize: 14, color: '#FBF3EF', fontWeight: '500' },
  vintedItemCategory: { fontSize: 11, color: '#C4737A', marginTop: 1 },
  vintedDays: { fontSize: 10, color: 'rgba(196,115,122,0.6)', fontStyle: 'italic', marginTop: 2 },
  vintedButton: { backgroundColor: '#9E2035', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  vintedButtonText: { color: '#FBF3EF', fontSize: 13, fontWeight: '600' },
})






