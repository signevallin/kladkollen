import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import SignedImage from '../components/SignedImage'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'

type CollageItemData = {
  key: string
  garment_id: string | null
  image_url: string
  x: number
  y: number
  size: number
}

const MIN_SIZE = 60
const MAX_SIZE = 440

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

// Ett plagg på canvasen: dra för att flytta, dra i hörnhandtaget för att skala.
function DraggableItem({
  item, selected, canvas, onSelect, onChange, onDelete,
}: {
  item: CollageItemData
  selected: boolean
  canvas: { w: number; h: number }
  onSelect: (key: string) => void
  onChange: (key: string, patch: Partial<CollageItemData>) => void
  onDelete: (key: string) => void
}) {
  // Refs så att PanResponders (skapas en gång) alltid ser senaste värdena
  const itemRef = useRef(item); itemRef.current = item
  const canvasRef = useRef(canvas); canvasRef.current = canvas
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect
  const onChangeRef = useRef(onChange); onChangeRef.current = onChange
  const start = useRef({ x: 0, y: 0, size: 0 })

  const drag = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
    onPanResponderGrant: () => {
      const it = itemRef.current
      onSelectRef.current(it.key)
      start.current = { x: it.x, y: it.y, size: it.size }
    },
    onPanResponderMove: (_, g) => {
      const { w, h } = canvasRef.current
      const size = itemRef.current.size
      onChangeRef.current(itemRef.current.key, {
        x: clamp(start.current.x + g.dx, -size / 2, Math.max(0, w - size / 2)),
        y: clamp(start.current.y + g.dy, -size / 2, Math.max(0, h - size / 2)),
      })
    },
  })).current

  const resize = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      const it = itemRef.current
      start.current = { x: it.x, y: it.y, size: it.size }
    },
    onPanResponderMove: (_, g) => {
      const delta = (g.dx + g.dy) / 2
      onChangeRef.current(itemRef.current.key, {
        size: clamp(start.current.size + delta, MIN_SIZE, MAX_SIZE),
      })
    },
  })).current

  return (
    <View
      {...drag.panHandlers}
      style={[
        styles.canvasItem,
        { left: item.x, top: item.y, width: item.size, height: item.size },
        selected && styles.canvasItemSelected,
      ]}
    >
      <View pointerEvents="none" style={{ flex: 1 }}>
        <SignedImage path={item.image_url} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </View>
      {selected && (
        <>
          <TouchableOpacity
            style={styles.deleteHandle}
            onPress={() => onDelete(item.key)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Ta bort från kollaget"
            accessibilityRole="button"
          >
            <Text style={styles.deleteHandleText}>✕</Text>
          </TouchableOpacity>
          <View {...resize.panHandlers} style={styles.resizeHandle}>
            <Text style={styles.resizeHandleText}>⤡</Text>
          </View>
        </>
      )}
    </View>
  )
}

export default function Collage() {
  const { id } = useLocalSearchParams()
  const [collageId, setCollageId] = useState<string | null>(typeof id === 'string' ? id : null)
  const [name, setName] = useState('')
  const [items, setItems] = useState<CollageItemData[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [garments, setGarments] = useState<any[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!collageId)

  const [canvas, setCanvas] = useState({ w: 0, h: 0 })
  // Sparad data som väntar på att canvasen ska mätas upp (för skalning)
  const pendingLoad = useRef<any>(null)

  useEffect(() => {
    fetchGarments()
    if (collageId) fetchCollage(collageId)
  }, [])

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('id, name, image_url').eq('archived', false).not('image_url', 'is', null)
    if (data) setGarments(data)
  }

  async function fetchCollage(cid: string) {
    const { data } = await supabase.from('collages').select('*').eq('id', cid).single()
    if (data) {
      setName(data.name || '')
      pendingLoad.current = data
      applyPendingLoad(canvas)
    }
    setLoading(false)
  }

  // Skala om sparade positioner till aktuell canvasstorlek
  function applyPendingLoad(c: { w: number; h: number }) {
    const data = pendingLoad.current
    if (!data || c.w === 0) return
    const factor = data.canvas_width ? c.w / data.canvas_width : 1
    const loaded: CollageItemData[] = (data.items || []).map((it: any, i: number) => ({
      key: it.key || `loaded-${i}`,
      garment_id: it.garment_id || null,
      image_url: it.image_url,
      x: (it.x || 0) * factor,
      y: (it.y || 0) * factor,
      size: clamp((it.size || 140) * factor, MIN_SIZE, MAX_SIZE),
    }))
    setItems(loaded)
    pendingLoad.current = null
  }

  function onCanvasLayout(e: any) {
    const { width, height } = e.nativeEvent.layout
    const c = { w: width, h: height }
    setCanvas(c)
    applyPendingLoad(c)
  }

  function addGarment(g: any) {
    const offset = (items.length % 5) * 24
    const item: CollageItemData = {
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      garment_id: g.id,
      image_url: g.image_url,
      x: Math.max(0, canvas.w / 2 - 70 + offset - 48),
      y: 40 + offset,
      size: 140,
    }
    setItems(prev => [...prev, item])
    setSelectedKey(item.key)
    setShowPicker(false)
  }

  function updateItem(key: string, patch: Partial<CollageItemData>) {
    setItems(prev => prev.map(it => it.key === key ? { ...it, ...patch } : it))
  }

  function selectItem(key: string) {
    setSelectedKey(key)
    // Lägg det valda plagget överst
    setItems(prev => {
      const idx = prev.findIndex(it => it.key === key)
      if (idx === -1 || idx === prev.length - 1) return prev
      const next = [...prev]
      const [it] = next.splice(idx, 1)
      next.push(it)
      return next
    })
  }

  function deleteItem(key: string) {
    setItems(prev => prev.filter(it => it.key !== key))
    setSelectedKey(null)
  }

  async function saveCollage() {
    if (items.length === 0) {
      showAlert('Tomt kollage', 'Lägg till minst ett plagg först!')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')
      const payload = {
        user_id: user.id,
        name: name.trim() || `Kollage ${new Date().toLocaleDateString('sv-SE')}`,
        canvas_width: Math.round(canvas.w),
        canvas_height: Math.round(canvas.h),
        items,
        updated_at: new Date().toISOString(),
      }
      if (collageId) {
        const { error } = await supabase.from('collages').update(payload).eq('id', collageId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('collages').insert([payload]).select('id').single()
        if (error) throw error
        setCollageId(data.id)
      }
      showAlert('Kollage sparat! 🍒')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Plaggväljare */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Välj plagg</Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Stäng"
                accessibilityRole="button"
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {garments.length === 0 ? (
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>Inga plagg med bild i garderoben än</Text>
              </View>
            ) : (
              <FlatList
                data={garments}
                numColumns={3}
                keyExtractor={g => g.id}
                renderItem={({ item: g }) => (
                  <TouchableOpacity style={styles.pickerItem} onPress={() => addGarment(g)}>
                    <SignedImage path={g.image_url} style={styles.pickerImage} resizeMode="contain" />
                    <Text style={styles.pickerName} numberOfLines={1}>{g.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Toppbar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Gå tillbaka"
          accessibilityRole="button"
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.nameInput}
          placeholder="Namn på kollaget..."
          placeholderTextColor="rgba(196,115,122,0.5)"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveCollage} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#FBF3EF" size="small" />
            : <Text style={styles.saveBtnText}>Spara</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color="#C4737A" size="large" /></View>
        ) : (
          <Pressable style={styles.canvas} onLayout={onCanvasLayout} onPress={() => setSelectedKey(null)}>
            {items.length === 0 && (
              <View style={styles.emptyHint} pointerEvents="none">
                <Text style={styles.emptyHintIcon}>🎨</Text>
                <Text style={styles.emptyHintText}>Lägg till plagg och skapa din look!</Text>
                <Text style={styles.emptyHintSub}>Dra för att flytta · dra i hörnet ⤡ för att ändra storlek</Text>
              </View>
            )}
            {items.map(item => (
              <DraggableItem
                key={item.key}
                item={item}
                selected={selectedKey === item.key}
                canvas={canvas}
                onSelect={selectItem}
                onChange={updateItem}
                onDelete={deleteItem}
              />
            ))}
          </Pressable>
        )}
      </View>

      {/* Verktygsrad */}
      <View style={styles.toolBar}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
          <Text style={styles.addBtnText}>＋ Lägg till plagg</Text>
        </TouchableOpacity>
        {selectedKey && (
          <Text style={styles.toolHint}>Dra i ⤡ för storlek · ✕ tar bort</Text>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backText: { color: '#C4737A', fontSize: 24, paddingHorizontal: 4 },
  nameInput: { flex: 1, backgroundColor: 'rgba(122,24,40,0.3)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, color: '#FBF3EF', fontSize: 15, borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  saveBtn: { backgroundColor: '#9E2035', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, minWidth: 68, alignItems: 'center' },
  saveBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },

  canvasWrap: { flex: 1, marginHorizontal: 16, marginBottom: 12 },
  canvas: { flex: 1, backgroundColor: 'rgba(122,24,40,0.12)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)', overflow: 'hidden' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyHint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyHintIcon: { fontSize: 40 },
  emptyHintText: { color: '#DDA0A7', fontSize: 16, fontWeight: '600' },
  emptyHintSub: { color: 'rgba(196,115,122,0.7)', fontSize: 12, textAlign: 'center', paddingHorizontal: 32 },

  canvasItem: { position: 'absolute' },
  canvasItemSelected: { borderWidth: 1.5, borderColor: '#C4737A', borderRadius: 8, borderStyle: 'dashed' },
  deleteHandle: { position: 'absolute', top: -12, right: -12, width: 26, height: 26, borderRadius: 13, backgroundColor: '#9E2035', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FBF3EF' },
  deleteHandleText: { color: '#FBF3EF', fontSize: 13, fontWeight: 'bold' },
  resizeHandle: { position: 'absolute', bottom: -14, right: -14, width: 32, height: 32, borderRadius: 16, backgroundColor: '#C4737A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FBF3EF' },
  resizeHandleText: { color: '#150408', fontSize: 16, fontWeight: 'bold' },

  toolBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  addBtn: { backgroundColor: 'rgba(122,24,40,0.5)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(196,115,122,0.3)' },
  addBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },
  toolHint: { color: 'rgba(196,115,122,0.7)', fontSize: 11, flex: 1, textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1F080E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FBF3EF' },
  modalClose: { color: '#C4737A', fontSize: 20 },
  pickerEmpty: { padding: 32, alignItems: 'center' },
  pickerEmptyText: { color: '#C4737A', fontSize: 14 },
  pickerItem: { flex: 1 / 3, margin: 4, alignItems: 'center', backgroundColor: 'rgba(122,24,40,0.25)', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: 'rgba(196,115,122,0.12)' },
  pickerImage: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  pickerName: { color: '#C4737A', fontSize: 10, marginTop: 4, textAlign: 'center' },
})
