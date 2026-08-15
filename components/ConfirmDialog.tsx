import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useSettings } from '../utils/settings'

// Temaanpassad bekräftelse-dialog med samma imperativa mönster som toasten:
// anropa confirm(...) var som helst, <ConfirmHost/> (i root-layouten) visar en
// snygg ruta som följer appens design – i stället för systemets grå Alert.
export type ConfirmRequest = {
  title: string
  message?: string
  confirmText?: string
  destructive?: boolean
  onConfirm: () => void
}

let emit: ((d: ConfirmRequest | null) => void) | null = null
export function confirmDialog(d: ConfirmRequest): boolean {
  if (!emit) return false
  emit(d)
  return true
}

export function ConfirmHost() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const [data, setData] = useState<ConfirmRequest | null>(null)
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => { emit = setData; return () => { emit = null } }, [])

  useEffect(() => {
    if (data) {
      anim.setValue(0)
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 16 }).start()
    }
  }, [data, anim])

  function close() { setData(null) }
  function accept() { const cb = data?.onConfirm; setData(null); cb?.() }

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] })

  return (
    <Modal visible={!!data} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { opacity: anim, transform: [{ scale }] }]}>
          <Text style={styles.title}>{data?.title}</Text>
          {!!data?.message && <Text style={styles.message}>{data.message}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={close} accessibilityRole="button">
              <Text style={styles.cancelText} numberOfLines={1}>{tr('Avbryt')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, data?.destructive ? styles.destructiveBtn : styles.confirmBtn]}
              onPress={accept}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText} numberOfLines={1}>{data?.confirmText || tr('OK')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { width: '100%', maxWidth: 420, backgroundColor: t.surface, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: t.border },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  message: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  btn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelBtn: { backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  cancelText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textSecondary },
  confirmBtn: { backgroundColor: t.primary },
  destructiveBtn: { backgroundColor: t.danger },
  confirmText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.onPrimary },
})
