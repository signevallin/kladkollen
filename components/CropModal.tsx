import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import * as FileSystem from 'expo-file-system/legacy'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'

const MIN = 48 // minsta storlek på beskärningsrutan (i skärmpixlar)

// Låter användaren dra en ruta över det som ska behållas och beskär bilden.
// Bra t.ex. för produktbilder från butiker där en modell/ansikte följer med.
export default function CropModal({
  visible, uri, onCancel, onCropped,
}: {
  visible: boolean
  uri: string | null
  onCancel: () => void
  onCropped: (base64: string) => void
}) {
  const t = useTheme()
  const styles = makeStyles(t)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [cont, setCont] = useState<{ w: number; h: number } | null>(null)
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [working, setWorking] = useState(false)
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Bildens naturliga storlek (för att mappa rutan till pixlar).
  useEffect(() => {
    setNatural(null)
    if (uri) Image.getSize(uri, (w, h) => setNatural({ w, h }), () => setNatural({ w: 1, h: 1 }))
  }, [uri])

  // Var bilden faktiskt ritas i containern (contain – med letterbox).
  const disp = (() => {
    if (!natural || !cont) return null
    const ia = natural.w / natural.h
    const ca = cont.w / cont.h
    let w: number, h: number
    if (ia > ca) { w = cont.w; h = cont.w / ia } else { h = cont.h; w = cont.h * ia }
    return { w, h, x: (cont.w - w) / 2, y: (cont.h - h) / 2 }
  })()

  // Initiera rutan till hela bilden när måtten är kända.
  useEffect(() => {
    if (disp) setBox({ x: disp.x, y: disp.y, w: disp.w, h: disp.h })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, cont])

  function clampMove(nx: number, ny: number) {
    if (!disp) return { x: nx, y: ny }
    return {
      x: Math.max(disp.x, Math.min(nx, disp.x + disp.w - box.w)),
      y: Math.max(disp.y, Math.min(ny, disp.y + disp.h - box.h)),
    }
  }

  const moveResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...box } },
    onPanResponderMove: (_e, g) => {
      const p = clampMove(start.current.x + g.dx, start.current.y + g.dy)
      setBox(b => ({ ...b, x: p.x, y: p.y }))
    },
  })

  // Resize från övre-vänstra hörnet.
  const tlResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...box } },
    onPanResponderMove: (_e, g) => {
      if (!disp) return
      const right = start.current.x + start.current.w
      const bottom = start.current.y + start.current.h
      const nx = Math.max(disp.x, Math.min(start.current.x + g.dx, right - MIN))
      const ny = Math.max(disp.y, Math.min(start.current.y + g.dy, bottom - MIN))
      setBox({ x: nx, y: ny, w: right - nx, h: bottom - ny })
    },
  })

  // Resize från nedre-högra hörnet.
  const brResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = { ...box } },
    onPanResponderMove: (_e, g) => {
      if (!disp) return
      const maxW = disp.x + disp.w - start.current.x
      const maxH = disp.y + disp.h - start.current.y
      const nw = Math.max(MIN, Math.min(start.current.w + g.dx, maxW))
      const nh = Math.max(MIN, Math.min(start.current.h + g.dy, maxH))
      setBox(b => ({ ...b, w: nw, h: nh }))
    },
  })

  async function confirm() {
    if (!uri || !natural || !disp || working) return
    setWorking(true)
    try {
      const scale = natural.w / disp.w
      const crop = {
        originX: Math.max(0, Math.round((box.x - disp.x) * scale)),
        originY: Math.max(0, Math.round((box.y - disp.y) * scale)),
        width: Math.min(natural.w, Math.round(box.w * scale)),
        height: Math.min(natural.h, Math.round(box.h * scale)),
      }
      // ImageManipulator kan inte läsa fjärr-URL på native – ladda ner först.
      const local = FileSystem.cacheDirectory + `crop-${Date.now()}.jpg`
      await FileSystem.downloadAsync(uri, local)
      const rendered = await ImageManipulator.manipulate(local).crop(crop).renderAsync()
      const out = await rendered.saveAsync({ format: SaveFormat.PNG, base64: true })
      if (!out.base64) throw new Error('Kunde inte beskära bilden')
      onCropped(out.base64)
    } catch {
      onCancel()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Text style={styles.hint}>Dra i hörnen för att välja det du vill behålla</Text>

        <View style={styles.stage} onLayout={e => setCont({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />}

          {disp && (
            <>
              {/* Mörka ytor utanför rutan */}
              <View style={[styles.dim, { left: 0, right: 0, top: 0, height: box.y }]} />
              <View style={[styles.dim, { left: 0, right: 0, top: box.y + box.h, bottom: 0 }]} />
              <View style={[styles.dim, { left: 0, width: box.x, top: box.y, height: box.h }]} />
              <View style={[styles.dim, { right: 0, left: box.x + box.w, top: box.y, height: box.h }]} />

              {/* Beskärningsrutan */}
              <View style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]} {...moveResponder.panHandlers}>
                <View style={[styles.handle, styles.handleTL]} {...tlResponder.panHandlers} />
                <View style={[styles.handle, styles.handleBR]} {...brResponder.panHandlers} />
              </View>
            </>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={working}>
            <Text style={styles.cancelText}>Avbryt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={confirm} disabled={working}>
            {working ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.doneText}>Beskär</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000', paddingTop: 60, paddingBottom: 40 },
  hint: { fontFamily: 'Lora_400Regular', color: '#FFFFFF', textAlign: 'center', fontSize: 14, marginBottom: 16, paddingHorizontal: 24 },
  stage: { flex: 1, marginHorizontal: 12, position: 'relative' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  box: { position: 'absolute', borderWidth: 2, borderColor: '#FFFFFF' },
  handle: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: t.primary },
  handleTL: { top: -14, left: -14 },
  handleBR: { bottom: -14, right: -14 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cancelText: { fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 15 },
  doneBtn: { flex: 2, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primary },
  doneText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
})
