import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { showAlert } from '../utils/alert'

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone = 'outer' | 'top' | 'bottom' | 'shoes'

type GarmentItem = {
  id: string
  name: string
  image_url?: string | null
  category?: string | null
}

// ─── Body types ───────────────────────────────────────────────────────────────

type BodyTypeKey = 'hourglass' | 'rectangle' | 'pear' | 'apple' | 'triangle'

const FILL = 'rgba(196,115,122,0.18)'
const STROKE = 'rgba(196,115,122,0.5)'
const FILL_ARM = 'rgba(196,115,122,0.14)'
const SW = '1.5'
const HEAD = `<ellipse cx="50" cy="16" rx="10" ry="12" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>`
const NECK = `<rect x="46" y="27" width="8" height="8" rx="2" fill="${FILL}" stroke="${STROKE}" stroke-width="${SW}"/>`

function makeSVG(torso: string, leftArm: string, rightArm: string, leftLeg: string, rightLeg: string,
  leftCalf = 'M30 196 L29 228 L38 228 L37 196 Z',
  rightCalf = 'M70 196 L71 228 L62 228 L63 196 Z',
  leftFoot = 'M29 228 L24 234 L42 235 L38 228 Z',
  rightFoot = 'M71 228 L76 234 L58 235 L62 228 Z',
) {
  const p = (d: string, f = FILL) =>
    `<path d="${d}" fill="${f}" stroke="${STROKE}" stroke-width="${SW}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 260">
    ${HEAD}${NECK}
    ${p(torso)}
    ${p(leftArm, FILL_ARM)}${p(rightArm, FILL_ARM)}
    ${p(leftLeg)}${p(rightLeg)}
    ${p(leftCalf)}${p(rightCalf)}
    ${p(leftFoot)}${p(rightFoot)}
  </svg>`
}

// ── Timglas (Hourglass): wide shoulders = wide hips, narrow waist ─────────────
const HOURGLASS_SVG = makeSVG(
  'M46 35 C32 32 13 36 13 50 L13 65 C13 78 29 87 31 96 C31 110 33 118 35 124 L65 124 C67 118 69 110 69 96 C71 87 87 78 87 65 L87 50 C87 36 68 32 54 35 Z',
  'M13 50 L6 63 L6 92 L10 93 L12 70 L13 50 Z',
  'M87 50 L94 63 L94 92 L90 93 L88 70 L87 50 Z',
  'M13 124 L30 196 L37 196 L46 140 Z',
  'M87 124 L70 196 L63 196 L54 140 Z',
)

// ── Rektangel (Rectangle): straight vertical sides, minimal curves ────────────
const RECTANGLE_SVG = makeSVG(
  'M46 35 C38 33 20 36 20 50 L20 80 C20 90 21 100 22 108 L22 116 L27 124 L73 124 L78 116 L78 108 C79 100 80 90 80 80 L80 50 C80 36 62 33 54 35 Z',
  'M20 50 L13 63 L13 92 L17 93 L19 70 L20 50 Z',
  'M80 50 L87 63 L87 92 L83 93 L81 70 L80 50 Z',
  'M22 124 L28 196 L35 196 L44 140 Z',
  'M78 124 L72 196 L65 196 L56 140 Z',
  'M28 196 L27 228 L36 228 L35 196 Z',
  'M72 196 L73 228 L64 228 L65 196 Z',
  'M27 228 L23 234 L40 235 L36 228 Z',
  'M73 228 L77 234 L60 235 L64 228 Z',
)

// ── Päron (Pear): narrow shoulders, very wide hips ────────────────────────────
const PEAR_SVG = makeSVG(
  'M46 35 C38 33 26 36 26 50 L26 65 C24 76 18 88 14 100 C12 110 10 118 10 124 L90 124 C90 118 88 110 86 100 C82 88 76 76 74 65 L74 50 C74 36 62 33 54 35 Z',
  'M26 50 L19 63 L19 92 L23 93 L25 70 L26 50 Z',
  'M74 50 L81 63 L81 92 L77 93 L75 70 L74 50 Z',
  'M10 124 L26 196 L34 196 L44 140 Z',
  'M90 124 L74 196 L66 196 L56 140 Z',
  'M26 196 L25 228 L35 228 L34 196 Z',
  'M74 196 L75 228 L65 228 L66 196 Z',
  'M25 228 L21 234 L39 235 L35 228 Z',
  'M75 228 L79 234 L61 235 L65 228 Z',
)

// ── Äpple / Rund (Apple): round midsection wider than shoulders ───────────────
const APPLE_SVG = makeSVG(
  'M46 35 C36 32 20 36 20 50 C20 60 15 70 15 82 C15 100 20 112 24 120 L26 124 L74 124 L76 120 C80 112 85 100 85 82 C85 70 80 60 80 50 C80 36 64 32 54 35 Z',
  'M20 50 L13 63 L13 92 L17 93 L19 70 L20 50 Z',
  'M80 50 L87 63 L87 92 L83 93 L81 70 L80 50 Z',
  'M24 124 L28 196 L35 196 L44 140 Z',
  'M76 124 L72 196 L65 196 L56 140 Z',
  'M28 196 L27 228 L36 228 L35 196 Z',
  'M72 196 L73 228 L64 228 L65 196 Z',
  'M27 228 L23 234 L40 235 L36 228 Z',
  'M73 228 L77 234 L60 235 L64 228 Z',
)

// ── V-form / Inverterad triangel: wide shoulders, narrow hips ────────────────
const TRIANGLE_SVG = makeSVG(
  'M46 35 C30 32 11 35 11 50 L11 68 C14 80 20 90 22 100 C24 110 26 118 28 124 L72 124 C74 118 76 110 78 100 C80 90 86 80 89 68 L89 50 C89 35 70 32 54 35 Z',
  'M11 50 L4 63 L4 92 L8 93 L10 70 L11 50 Z',
  'M89 50 L96 63 L96 92 L92 93 L90 70 L89 50 Z',
  'M28 124 L30 196 L37 196 L44 140 Z',
  'M72 124 L70 196 L63 196 L56 140 Z',
)

const BODY_TYPES: Record<BodyTypeKey, { label: string; svg: string }> = {
  hourglass: { label: 'Timglas',    svg: HOURGLASS_SVG  },
  rectangle: { label: 'Rektangel',  svg: RECTANGLE_SVG  },
  pear:      { label: 'Päron',      svg: PEAR_SVG       },
  apple:     { label: 'Rund',       svg: APPLE_SVG      },
  triangle:  { label: 'V-form',     svg: TRIANGLE_SVG   },
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
type SizeKey = (typeof SIZES)[number]

const SIZE_W: Record<SizeKey, number> = {
  XS: 58, S: 70, M: 84, L: 100, XL: 116, XXL: 132,
}
const BODY_H = 260

// ─── Zones ────────────────────────────────────────────────────────────────────

// Render order (ascending z-index): shoes → bottom → top → outer
const ZONE_Z: Record<Zone, number> = { shoes: 1, bottom: 2, top: 3, outer: 4 }

function getZoneRect(zone: Zone, bodyW: number) {
  switch (zone) {
    case 'outer':  return { top: 35,  height: 89, left: bodyW * 0.03, width: bodyW * 0.94 }
    case 'top':    return { top: 44,  height: 65, left: bodyW * 0.07, width: bodyW * 0.86 }
    case 'bottom': return { top: 122, height: 92, left: bodyW * 0.20, width: bodyW * 0.60 }
    case 'shoes':  return { top: 214, height: 28, left: bodyW * 0.20, width: bodyW * 0.60 }
  }
}

function categoryToZone(category?: string | null): Zone {
  if (!category) return 'top'
  if (category === 'Ytterkläder' || category === 'Kavajer') return 'outer'
  if (category === 'Byxor'       || category === 'Kjolar')  return 'bottom'
  if (category === 'Skor') return 'shoes'
  return 'top'
}

// ─── GarmentPickerItem ────────────────────────────────────────────────────────

interface PickerItemProps {
  garment: GarmentItem
  onDragStart: (g: GarmentItem) => void
  onDragMove:  (x: number, y: number) => void
  onDragEnd:   (x: number, y: number) => void
}

function GarmentPickerItem({ garment, onDragStart, onDragMove, onDragEnd }: PickerItemProps) {
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Claim gesture once user moves primarily upward (toward the body)
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 6,
      onPanResponderGrant:     () => onDragStart(garment),
      onPanResponderMove:      (_, gs) => onDragMove(gs.moveX, gs.moveY),
      onPanResponderRelease:   (_, gs) => onDragEnd(gs.moveX, gs.moveY),
      onPanResponderTerminate: (_, gs) => onDragEnd(gs.moveX, gs.moveY),
    })
  )
  return (
    <View {...panRef.current.panHandlers} style={styles.pickerItem}>
      {garment.image_url ? (
        <Image source={{ uri: garment.image_url }} style={styles.pickerThumb} resizeMode="contain" />
      ) : (
        <View style={styles.pickerThumbEmpty}><Text style={{ fontSize: 22 }}>👗</Text></View>
      )}
      <Text style={styles.pickerName} numberOfLines={1}>{garment.name}</Text>
    </View>
  )
}

// ─── DressForm ────────────────────────────────────────────────────────────────

interface DressFormProps {
  garments: GarmentItem[]
  onSaved?: () => void
}

export default function DressForm({ garments, onSaved }: DressFormProps) {
  const [bodyType, setBodyType] = useState<BodyTypeKey>('hourglass')
  const [size,     setSize]     = useState<SizeKey>('M')
  const [placed,   setPlaced]   = useState<Partial<Record<Zone, GarmentItem>>>({})
  const [dragging, setDragging] = useState<GarmentItem | null>(null)
  const [saving,   setSaving]   = useState(false)

  const draggingRef  = useRef<GarmentItem | null>(null)
  const dragXY       = useRef(new Animated.ValueXY({ x: -200, y: -200 })).current
  const bodyCanvasRef = useRef<View>(null)
  const rootRef       = useRef<View>(null)
  const bodyPos = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const rootPos = useRef({ x: 0, y: 0 })

  const measureAll = useCallback(() => {
    setTimeout(() => {
      rootRef.current?.measure((_fx, _fy, _w, _h, px, py) => {
        rootPos.current = { x: px, y: py }
      })
      bodyCanvasRef.current?.measure((_fx, _fy, w, h, px, py) => {
        bodyPos.current = { x: px, y: py, w, h }
      })
    }, 250)
  }, [])

  useEffect(() => { measureAll() }, [measureAll])

  // Re-measure body when size or body type changes
  useEffect(() => {
    setTimeout(() => {
      bodyCanvasRef.current?.measure((_fx, _fy, w, h, px, py) => {
        bodyPos.current = { x: px, y: py, w, h }
      })
    }, 100)
  }, [size, bodyType])

  // ── Drag ────────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((garment: GarmentItem) => {
    draggingRef.current = garment
    setDragging(garment)
    dragXY.setValue({ x: -200, y: -200 })
  }, [dragXY])

  const handleDragMove = useCallback((screenX: number, screenY: number) => {
    dragXY.setValue({
      x: screenX - rootPos.current.x - 40,
      y: screenY - rootPos.current.y - 40,
    })
  }, [dragXY])

  const handleDragEnd = useCallback((screenX: number, screenY: number) => {
    const garment = draggingRef.current
    draggingRef.current = null
    setDragging(null)
    dragXY.setValue({ x: -200, y: -200 })
    if (!garment) return
    const { x: bx, y: by, w: bw, h: bh } = bodyPos.current
    if (screenX >= bx && screenX <= bx + bw && screenY >= by && screenY <= by + bh) {
      const zone = categoryToZone(garment.category)
      setPlaced(prev => ({ ...prev, [zone]: garment }))
    }
  }, [dragXY])

  function removeFromZone(zone: Zone) {
    setPlaced(prev => { const n = { ...prev }; delete n[zone]; return n })
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave(wearToday: boolean) {
    const garmentList = Object.values(placed).filter(Boolean) as GarmentItem[]
    if (garmentList.length === 0) { showAlert('Lägg till minst ett plagg!'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')
      const today = new Date().toISOString().split('T')[0]
      const name = `Outfit ${new Date().toLocaleDateString('sv-SE')}`
      const garmentIds   = garmentList.map(g => g.id)
      const garmentNames = garmentList.map(g => g.name)
      const imageUrls    = garmentList.map(g => g.image_url).filter(Boolean)
      const { data: outfit, error } = await supabase
        .from('outfits')
        .insert([{ user_id: user.id, name, garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls }])
        .select().single()
      if (error) throw error
      if (wearToday) {
        await supabase.from('outfit_calendar')
          .upsert({ user_id: user.id, outfit_id: outfit.id, date: today }, { onConflict: 'user_id,date' })
        for (const gid of garmentIds) {
          const { data: g } = await supabase.from('garments').select('times_worn').eq('id', gid).single()
          await supabase.from('garments').update({ times_worn: (g?.times_worn || 0) + 1, last_worn: today }).eq('id', gid)
        }
        showAlert('Ha på dig idag! 🍒', 'Outfit sparad och lagd i kalendern.')
      } else {
        showAlert('Outfit sparad! 🍒')
      }
      setPlaced({})
      onSaved?.()
    } catch (e: any) {
      showAlert('Fel', e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const bodyW    = SIZE_W[size]
  const bodyURI  = `data:image/svg+xml,${encodeURIComponent(BODY_TYPES[bodyType].svg)}`
  const RENDER_ORDER: Zone[] = ['shoes', 'bottom', 'top', 'outer']
  const sortedPlaced = RENDER_ORDER
    .map(z => placed[z] ? ([z, placed[z]] as [Zone, GarmentItem]) : null)
    .filter(Boolean) as [Zone, GarmentItem][]

  return (
    <View ref={rootRef} style={styles.root} onLayout={measureAll}>

      {/* ── Body type selector ── */}
      <View style={styles.selectorBlock}>
        <Text style={styles.selectorLabel}>Kroppsform</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {(Object.entries(BODY_TYPES) as [BodyTypeKey, { label: string }][]).map(([key, meta]) => (
            <TouchableOpacity
              key={key}
              style={[styles.pill, bodyType === key && styles.pillActive]}
              onPress={() => setBodyType(key)}
            >
              <Text style={[styles.pillText, bodyType === key && styles.pillTextActive]}>{meta.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Size selector ── */}
      <View style={styles.selectorBlock}>
        <Text style={styles.selectorLabel}>Storlek</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {SIZES.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sizePill, size === s && styles.sizePillActive]}
              onPress={() => setSize(s)}
            >
              <Text style={[styles.sizePillText, size === s && styles.sizePillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Body canvas ── */}
      <View style={styles.bodyArea}>
        <View
          ref={bodyCanvasRef}
          style={{ width: bodyW, height: BODY_H }}
          onLayout={measureAll}
        >
          <Image
            source={{ uri: bodyURI }}
            style={{ width: bodyW, height: BODY_H, backgroundColor: 'transparent' }}
            resizeMode="stretch"
          />

          {sortedPlaced.map(([zone, garment]) => {
            const rect = getZoneRect(zone, bodyW)
            return (
              <TouchableOpacity
                key={zone}
                activeOpacity={0.85}
                onPress={() => removeFromZone(zone)}
                style={[styles.placedZone, { top: rect.top, left: rect.left, width: rect.width, height: rect.height, zIndex: ZONE_Z[zone] }]}
              >
                {garment.image_url ? (
                  <Image source={{ uri: garment.image_url }} style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }} resizeMode="contain" />
                ) : (
                  <View style={styles.placedEmoji}><Text style={{ fontSize: 24 }}>👗</Text></View>
                )}
                <View style={styles.removeBtn}><Text style={styles.removeBtnText}>✕</Text></View>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.bodyHint}>
          {Object.keys(placed).length === 0
            ? 'Dra upp plagg från garderoben nedan'
            : 'Tryck på ett plagg för att ta bort det'}
        </Text>
      </View>

      {/* ── Garment picker ── */}
      <View style={styles.pickerArea}>
        <Text style={styles.pickerLabel}>Din garderob</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!dragging}
          contentContainerStyle={styles.pickerContent}
        >
          {garments.length === 0 ? (
            <View style={styles.emptyPicker}>
              <Text style={styles.emptyPickerText}>Inga plagg i garderoben</Text>
            </View>
          ) : (
            garments.map(g => (
              <GarmentPickerItem
                key={g.id}
                garment={g}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={() => handleSave(false)} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Sparar…' : '🍒 Spara outfit'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.wearBtn]} onPress={() => handleSave(true)} disabled={saving}>
          <Text style={styles.wearBtnText}>Ha på mig idag</Text>
        </TouchableOpacity>
      </View>

      {/* ── Drag ghost ── */}
      {dragging && (
        <Animated.View pointerEvents="none" style={[styles.dragGhost, dragXY.getLayout()]}>
          {dragging.image_url ? (
            <Image source={{ uri: dragging.image_url }} style={styles.dragGhostImg} resizeMode="contain" />
          ) : (
            <Text style={{ fontSize: 36, textAlign: 'center', lineHeight: 80 }}>👗</Text>
          )}
        </Animated.View>
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#150408' },

  // Selectors
  selectorBlock: { paddingHorizontal: 16, paddingTop: 8 },
  selectorLabel: { color: 'rgba(196,115,122,0.5)', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  pillRow: { flexDirection: 'row', gap: 7 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(122,24,40,0.35)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)' },
  pillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  pillText: { color: '#C4737A', fontSize: 13, fontWeight: '500' },
  pillTextActive: { color: '#FBF3EF', fontWeight: '700' },
  sizePill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(122,24,40,0.25)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.15)' },
  sizePillActive: { backgroundColor: 'rgba(158,32,53,0.6)', borderColor: 'rgba(196,115,122,0.5)' },
  sizePillText: { color: 'rgba(196,115,122,0.6)', fontSize: 12, fontWeight: '500' },
  sizePillTextActive: { color: '#FBF3EF', fontWeight: '600' },

  // Body canvas
  bodyArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  placedZone: { position: 'absolute', overflow: 'hidden' },
  placedEmoji: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(158,32,53,0.9)', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#FBF3EF', fontSize: 9, fontWeight: 'bold' },
  bodyHint: { color: 'rgba(196,115,122,0.4)', fontSize: 11, marginTop: 8, textAlign: 'center', paddingHorizontal: 20 },

  // Picker
  pickerArea: { height: 118, borderTopWidth: 1, borderTopColor: 'rgba(196,115,122,0.1)', paddingTop: 8 },
  pickerLabel: { color: 'rgba(196,115,122,0.45)', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 5 },
  pickerContent: { paddingHorizontal: 12, gap: 8, alignItems: 'flex-start' },
  pickerItem: { width: 64, alignItems: 'center', gap: 4 },
  pickerThumb: { width: 52, height: 64, borderRadius: 10, backgroundColor: 'transparent' },
  pickerThumbEmpty: { width: 52, height: 64, borderRadius: 10, backgroundColor: 'rgba(122,24,40,0.35)', alignItems: 'center', justifyContent: 'center' },
  pickerName: { fontSize: 9, color: '#C4737A', textAlign: 'center', width: 64 },
  emptyPicker: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyPickerText: { color: 'rgba(196,115,122,0.4)', fontSize: 13 },

  // Action buttons
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  saveBtn: { backgroundColor: '#9E2035', borderWidth: 1, borderColor: '#DDA0A7' },
  saveBtnText: { color: '#FBF3EF', fontSize: 14, fontWeight: '600' },
  wearBtn: { backgroundColor: 'rgba(122,24,40,0.4)', borderWidth: 1, borderColor: 'rgba(196,115,122,0.35)' },
  wearBtnText: { color: '#DDA0A7', fontSize: 14, fontWeight: '600' },

  // Drag ghost
  dragGhost: { position: 'absolute', width: 80, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(21,4,8,0.5)', zIndex: 9999 },
  dragGhostImg: { width: 80, height: 80, backgroundColor: 'transparent' },
})
