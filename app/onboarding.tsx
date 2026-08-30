import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import { useRef, useState } from 'react'
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import { useSettings } from '../utils/settings'

// Nyckeln som markerar att onboardingen är sedd. Läses i app/_layout.tsx för
// att avgöra om en inloggad användare ska mötas av introt. Sätts när användaren
// slutför eller hoppar över – då visas det inte igen på den här enheten.
export const ONBOARDING_DONE_KEY = 'skrud.onboardingDone'

type Slide = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }

// Innehållet leder medvetet med IMPORT (inte kameran) enligt docs/marketing.md:
// den lägsta tröskeln att komma igång ska synas först.
const SLIDES: Slide[] = [
  {
    icon: 'sparkles-outline',
    title: 'Välkommen till Skrud',
    body: 'Din digitala garderob – för hela livet. Slut på känslan av att inte ha något att ha på sig.',
  },
  {
    icon: 'cloud-download-outline',
    title: 'Fyll garderoben på minuter',
    body: 'Du behöver inte fota allt. Bocka i dina basplagg, importera från kvitton och butiker, eller fota en favorit – Skrud fyller i namn, färg och säsong åt dig.',
  },
  {
    icon: 'shirt-outline',
    title: 'Färdig outfit på morgonen',
    body: 'Välj Jobb, Ledig eller Fest och tryck en gång. Skrud bygger en komplett look ur din garderob, anpassad efter hela dagens väder – och påminner dig om regnjackan.',
  },
  {
    icon: 'people-outline',
    title: 'En garderob för hela livet',
    body: 'Börja med din egen garderob. Dela med din partner. Samla hela familjens kläder på ett ställe – samma app, oavsett var i livet du är.',
  },
]

export default function Onboarding() {
  const t = useTheme()
  const { t: tr } = useSettings()
  const { width } = useWindowDimensions()
  const styles = makeStyles(t)
  const scrollRef = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)
  const isLast = index === SLIDES.length - 1

  // replay=1 = uppspelning från "Om Skrud" (inte första gången). Då ska vi gå
  // TILLBAKA dit man kom ifrån, inte tvinga till /home, och inte röra done-nyckeln.
  const { replay } = useLocalSearchParams<{ replay?: string }>()
  const isReplay = replay === '1'

  async function finish(target?: string) {
    if (!isReplay) { try { await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1') } catch {} }
    if (isReplay) {
      if (target) router.replace(target as any)
      else router.back()
      return
    }
    router.replace('/home')
    // Öppna ev. import-/fotoflödet ovanpå hemskärmen så bakåt landar rätt.
    if (target) setTimeout(() => router.push(target as any), 0)
  }

  function next() {
    const to = Math.min(index + 1, SLIDES.length - 1)
    scrollRef.current?.scrollTo({ x: to * width, animated: true })
    setIndex(to)
  }

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width)
    if (i !== index) setIndex(i)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={() => finish()} hitSlop={12}>
            <Text style={styles.skip}>{tr('Hoppa över')}</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={s.icon} size={44} color={t.primary} />
            </View>
            <Text style={styles.title}>{tr(s.title)}</Text>
            <Text style={styles.body}>{tr(s.body)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => finish('/quick-start')}>
              <Ionicons name="checkbox-outline" size={18} color={t.onPrimary} />
              <Text style={styles.primaryBtnText}>{tr('Bocka i mina basplagg')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => finish('/import-purchases')}>
              <Ionicons name="cloud-download-outline" size={18} color={t.primary} />
              <Text style={styles.secondaryBtnText}>{tr('Importera mina plagg')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => finish('/add-garment')}>
              <Ionicons name="camera-outline" size={18} color={t.primary} />
              <Text style={styles.secondaryBtnText}>{tr('Fota ett plagg')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => finish()} hitSlop={10}>
              <Text style={styles.laterText}>{tr('Jag gör det senare')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={next}>
            <Text style={styles.primaryBtnText}>{tr('Nästa')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

function makeStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    topBar: { height: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20 },
    skip: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textSecondary },
    pager: { flex: 1 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
    iconCircle: {
      width: 104, height: 104, borderRadius: 52, backgroundColor: t.surface,
      alignItems: 'center', justifyContent: 'center', marginBottom: 36,
      borderWidth: 1, borderColor: t.border,
    },
    title: {
      fontFamily: 'Poppins_700Bold', fontSize: 26, color: t.textPrimary,
      textAlign: 'center', marginBottom: 16, letterSpacing: -0.3,
    },
    body: {
      fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 25,
      color: t.textSecondary, textAlign: 'center', maxWidth: 360,
    },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.border },
    dotActive: { backgroundColor: t.primary, width: 22 },
    footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: t.primary, borderRadius: 999, paddingVertical: 17,
    },
    primaryBtnText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: t.onPrimary },
    secondaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: 'transparent', borderRadius: 999, paddingVertical: 16,
      borderWidth: 1, borderColor: t.border,
    },
    secondaryBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.primary },
    laterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textSecondary, textAlign: 'center', paddingVertical: 8 },
  })
}
