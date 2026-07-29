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
import { useSettings } from '../utils/settings'

const MIN = 48 // minsta storlek på beskärningsrutan (i skärmpixlar)
const HANDLE = 32 // handtagets storlek

// Låter användaren dra en ruta över det som ska behållas, rotera bilden och beskär.
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
  const { t: tr } = useSettings()
  // imgUri är den bild vi arbetar med just nu. Rotation byter ut den mot en
  // ny (redan roterad) fil så att beskärningsmatten alltid är enkel.
  const [imgUri, setImgUri] = useState<string | null>(uri)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [cont, setCont] = useState<{ w: number; h: number } | null>(null)
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [working, setWorking] = useState(false)
  const start = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Återställ till ursprungsbilden när modalen öppnas eller bilden byts.
  useEffect(() => { setImgUri(uri) }, [uri, visible])

  // Bildens naturliga storlek (för att mappa rutan till pixlar).
  useEffect(() => {
    setNatural(null)
    if (imgUri) Image.getSize(imgUri, (w, h) => setNatural({ w, h }), () => setNatural({ w: 1, h: 1 }))
  }, [imgUri])

  // Var bilden faktiskt ritas i containern (contain – med letterbox).
  const disp = (() => {
    if (!natural || !cont) return null
    const ia = natural.w / natural.h
    const ca = cont.w / cont.h
    let w: number, h: number
    if (ia > ca) { w = cont.w; h = cont.w / ia } else { h = cont.h; w = cont.h * ia }
    return { w, h, x: (cont.w - w) / 2, y: (cont.h - h) / 2 }
  })()

  // PanResponder skapas EN gång (stabil identitet). Skapas den om vid varje
  // render byts panHandlers ut mitt i en dragrörelse – den nya instansens
  // gest-state är då oinitierad och rörelsen tappas, så inget går att dra.
  // Callbacken läser därför alltid senaste box/disp via refs.
  const boxRef = useRef(box)
  boxRef.current = box
  const dispRef = useRef(disp)
  dispRef.current = disp

  // Initiera rutan till hela bilden när måtten är kända.
  useEffect(() => {
    if (disp) setBox({ x: disp.x, y: disp.y, w: disp.w, h: disp.h })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, cont])

  const moveResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = { ...boxRef.current } },
    onPanResponderMove: (_e, g) => {
      const d = dispRef.current, b = boxRef.current
      if (!d) return
      const nx = Math.max(d.x, Math.min(start.current.x + g.dx, d.x + d.w - b.w))
      const ny = Math.max(d.y, Math.min(start.current.y + g.dy, d.y + d.h - b.h))
      setBox(prev => ({ ...prev, x: nx, y: ny }))
    },
  })).current

  // Resize från övre-vänstra hörnet.
  const tlResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = { ...boxRef.current } },
    onPanResponderMove: (_e, g) => {
      const d = dispRef.current
      if (!d) return
      const right = start.current.x + start.current.w
      const bottom = start.current.y + start.current.h
      const nx = Math.max(d.x, Math.min(start.current.x + g.dx, right - MIN))
      const ny = Math.max(d.y, Math.min(start.current.y + g.dy, bottom - MIN))
      setBox({ x: nx, y: ny, w: right - nx, h: bottom - ny })
    },
  })).current

  // Resize från nedre-högra hörnet.
  const brResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = { ...boxRef.current } },
    onPanResponderMove: (_e, g) => {
      const d = dispRef.current
      if (!d) return
      const maxW = d.x + d.w - start.current.x
      const maxH = d.y + d.h - start.current.y
      const nw = Math.max(MIN, Math.min(start.current.w + g.dx, maxW))
      const nh = Math.max(MIN, Math.min(start.current.h + g.dy, maxH))
      setBox(b => ({ ...b, w: nw, h: nh }))
    },
  })).current

  // Roterar bilden 90° och bakar in det i en ny fil, så att beskärningen
  // sedan sker på den redan roterade bilden.
  async function rotate(deg: 90 | -90) {
    if (!imgUri || working) return
    setWorking(true)
    try {
      let local = imgUri
      if (!imgUri.startsWith('file://')) {
        local = FileSystem.cacheDirectory + `rot-${Date.now()}.jpg`
        await FileSystem.downloadAsync(imgUri, local)
      }
      const rendered = await ImageManipulator.manipulate(local).rotate(deg).renderAsync()
      const out = await rendered.saveAsync({ format: SaveFormat.PNG })
      setImgUri(out.uri)
    } catch {
      // behåll nuvarande bild om rotationen misslyckas
    } finally {
      setWorking(false)
    }
  }

  async function confirm() {
    if (!imgUri || !natural || !disp || working) return
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
      let local = imgUri
      if (!imgUri.startsWith('file://')) {
        local = FileSystem.cacheDirectory + `crop-${Date.now()}.jpg`
        await FileSystem.downloadAsync(imgUri, local)
      }
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
        <Text style={styles.hint}>{tr('Dra i hörnen för att välja det du vill behålla')}</Text>

        <View style={styles.stage} onLayout={e => setCont({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {imgUri && <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />}

          {disp && (
            <>
              {/* Mörka ytor utanför rutan */}
              <View style={[styles.dim, { left: 0, right: 0, top: 0, height: box.y }]} />
              <View style={[styles.dim, { left: 0, right: 0, top: box.y + box.h, bottom: 0 }]} />
              <View style={[styles.dim, { left: 0, width: box.x, top: box.y, height: box.h }]} />
              <View style={[styles.dim, { right: 0, left: box.x + box.w, top: box.y, height: box.h }]} />

              {/* Beskärningsrutan (flyttbar) */}
              <View style={[styles.box, { left: box.x, top: box.y, width: box.w, height: box.h }]} {...moveResponder.panHandlers} />

              {/* Hörnhandtag – egna vyer direkt i stage så de alltid går att träffa
                  (barn som ritas utanför sin förälders yta får inte touch på Android). */}
              <View
                style={[styles.handle, { left: box.x - HANDLE / 2, top: box.y - HANDLE / 2 }]}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                {...tlResponder.panHandlers}
              />
              <View
                style={[styles.handle, { left: box.x + box.w - HANDLE / 2, top: box.y + box.h - HANDLE / 2 }]}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                {...brResponder.panHandlers}
              />
            </>
          )}
        </View>

        <View style={styles.tools}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => rotate(-90)} disabled={working} accessibilityLabel="Rotera vänster">
            <Text style={styles.toolText}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => rotate(90)} disabled={working} accessibilityLabel="Rotera höger">
            <Text style={styles.toolText}>↻</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={working}>
            <Text style={styles.cancelText}>{tr('Avbryt')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={confirm} disabled={working}>
            {working ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.doneText}>{tr('Beskär')}</Text>}
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
  handle: { position: 'absolute', width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: t.primary },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  toolBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.08)' },
  toolText: { color: '#FFFFFF', fontSize: 26, lineHeight: 30 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  cancelText: { fontFamily: 'Poppins_600SemiBold', color: '#FFFFFF', fontSize: 15 },
  doneBtn: { flex: 2, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primary },
  doneText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
})
