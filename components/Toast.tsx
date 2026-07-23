import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'

type ToastVariant = 'success' | 'error'
type ToastData = { id: number; title: string; subtitle?: string; variant: ToastVariant }

// Enkel imperativ toast: anropa toast(...) var som helst, <ToastHost/> (som
// ligger i root-layouten) visar en snygg temaanpassad ruta som tonar bort själv.
let emit: ((d: ToastData) => void) | null = null
let counter = 0
export function toast(title: string, subtitle?: string, variant: ToastVariant = 'success') {
  emit?.({ id: ++counter, title, subtitle, variant })
}

export function ToastHost() {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const styles = makeStyles(t)
  const [data, setData] = useState<ToastData | null>(null)
  const anim = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    emit = (d) => setData(d)
    return () => { emit = null }
  }, [])

  useEffect(() => {
    if (!data) return
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 14 }).start()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(dismiss, 2800)
    return () => { if (timer.current) clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  function dismiss() {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setData(null))
  }

  if (!data) return null
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-140, 0] })
  const isError = data.variant === 'error'

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8, opacity: anim, transform: [{ translateY }] }]}
    >
      <TouchableOpacity activeOpacity={0.92} onPress={dismiss} style={[styles.card, isError && styles.cardError]}>
        <View style={styles.iconWrap}>
          <Ionicons name={isError ? 'alert' : 'checkmark'} size={20} color={t.onPrimary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>{data.title}</Text>
          {data.subtitle ? <Text style={styles.subtitle}>{data.subtitle}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 1000, alignItems: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.primary, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16,
    width: '100%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardError: { backgroundColor: t.danger },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.onPrimary },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 12.5, color: t.onPrimary, opacity: 0.85, lineHeight: 18 },
})
