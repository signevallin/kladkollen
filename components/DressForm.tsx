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

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const
type SizeKey = (typeof SIZES)[number]

// Body image width per size (height stays fixed at BODY_H)
const SIZE_W: Record<SizeKey, number> = {
  XS: 58, S: 70, M: 84, L: 100, XL: 116, XXL: 132,
}

const BODY_H = 260

// Z-index for layering: outer coat goes on top of shirt
const ZONE_Z: Record<Zone, number> = { shoes: 1, bottom: 2, top: 3, outer: 4 }

// Zone bounding boxes in pixels.
// Y axis: 1px = 1 SVG unit (viewBox 0 0 100 260, rendered at BODY_H=260px tall).
// X axis: expressed as fraction of bodyW (since width stretches with size).
function getZoneRect(zone: Zone, bodyW: number) {
  switch (zone) {
    case 'outer':  return { top: 35,  left: bodyW * 0.03, width: bodyW * 0.94, height: 89  }
    case 'top':    return { top: 44,  left: bodyW * 0.06, width: bodyW * 0.88, height: 65  }
    case 'bottom': return { top: 122, left: bodyW * 0.22, width: bodyW * 0.56, height: 92  }
    case 'shoes':  return { top: 214, left: bodyW * 0.22, width: bodyW * 0.56, height: 30  }
  }
}

function categoryToZone(category?: string | null): Zone {
  if (!category) return 'top'
  if (category === 'Ytterkläder' || category === 'Kavajer') return 'outer'
  if (category === 'Byxor' || category === 'Kjolar') return 'bottom'
  if (category === 'Skor') return 'shoes'
  return 'top'
}

// ─── SVG body silhouette ──────────────────────────────────────────────────────
// viewBox 0 0 100 260, body spans roughly x=6–94, y=4–235

const BODY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 260">
  <ellipse cx="50" cy="16" rx="10" ry="12" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <rect x="46" y="27" width="8" height="8" rx="2" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M46 35 C36 33 18 38 14 50 L12 78 L15 96 L24 104 L27 116 L36 124 L64 124 L73 116 L76 104 L85 96 L88 78 L86 50 C82 38 64 33 54 35 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M14 50 L7 62 L6 90 L10 92 L13 72 L14 50 Z" fill="rgba(196,115,122,0.12)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M86 50 L93 62 L94 90 L90 92 L87 72 L86 50 Z" fill="rgba(196,115,122,0.12)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M36 124 L33 196 L39 196 L50 138 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M64 124 L67 196 L61 196 L50 138 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M33 196 L32 228 L39 228 L39 196 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M67 196 L68 228 L61 228 L61 196 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M32 228 L28 234 L44 235 L39 228 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
  <path d="M68 228 L72 234 L56 235 L61 228 Z" fill="rgba(196,115,122,0.15)" stroke="rgba(196,115,122,0.45)" stroke-width="1.4"/>
</svg>`

const BODY_URI = `data:image/svg+xml,${encodeURIComponent(BODY_SVG)}`

// ─── GarmentPickerItem ────────────────────────────────────────────────────────

interface PickerItemProps {
  garment: GarmentItem
  onDragStart: (g: GarmentItem) => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}

function GarmentPickerItem({ garment, onDragStart, onDragMove, onDragEnd }: PickerItemProps) {
  // Don't claim the gesture on start (lets horizontal scroll work).
  // Claim it only once the user drags primarily vertically (upward toward body).
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 6,
      onPanResponderGrant: () => onDragStart(garment),
      onPanResponderMove: (_, gs) => onDragMove(gs.moveX, gs.moveY),
      onPanResponderRelease: (_, gs) => onDragEnd(gs.moveX, gs.moveY),
      onPanResponderTerminate: (_, gs) => onDragEnd(gs.moveX, gs.moveY),
    })
  )

  return (
    <View {...panRef.current.panHandlers} style={styles.pickerItem}>
      {garment.image_url ? (
        <Image
          source={{ uri: garment.image_url }}
          style={styles.pickerThumb}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.pickerThumbEmpty}>
          <Text style={{ fontSize: 22 }}>👗</Text>
        </View>
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
  const [size, setSize] = useState<SizeKey>('M')
  const [placed, setPlaced] = useState<Partial<Record<Zone, GarmentItem>>>({})
  const [dragging, setDragging] = useState<GarmentItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Use a ref parallel to `dragging` to avoid stale-closure issues in callbacks
  const draggingRef = useRef<GarmentItem | null>(null)

  // Animated position for the drag ghost image
  const dragXY = useRef(new Animated.ValueXY({ x: -200, y: -200 })).current

  // Absolute screen position of the body canvas (for drop detection)
  const bodyCanvasRef = useRef<View>(null)
  const bodyPos = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Absolute screen position of the root view (to convert screen→relative coords)
  const rootRef = useRef<View>(null)
  const rootPos = useRef({ x: 0, y: 0 })

  // Measure both the root view and the body canvas after layout
  const measureAll = useCallback(() => {
    setTimeout(() => {
      rootRef.current?.measure((_, __, _w, _h, px, py) => {
        rootPos.current = { x: px, y: py }
      })
      bodyCanvasRef.current?.measure((_, __, w, h, px, py) => {
        bodyPos.current = { x: px, y: py, w, h }
      })
    }, 250)
  }, [])

  useEffect(() => {
    measureAll()
  }, [measureAll])

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((garment: GarmentItem) => {
    draggingRef.current = garment
    setDragging(garment)
    dragXY.setValue({ x: -200, y: -200 })
  }, [dragXY])

  const handleDragMove = useCallback((screenX: number, screenY: number) => {
    // Position ghost centered on finger, adjusted to root-relative coordinates
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

    // Check if the drop point is inside the body canvas
    const { x: bx, y: by, w: bw, h: bh } = bodyPos.current
    if (screenX >= bx && screenX <= bx + bw && screenY >= by && screenY <= by + bh) {
      const zone = categoryToZone(garment.category)
      setPlaced(prev => ({ ...prev, [zone]: garment }))
    }
  }, [dragXY])

  // ── Remove a garment from a zone by tapping ───────────────────────────────

  function removeFromZone(zone: Zone) {
    setPlaced(prev => {
      const next = { ...prev }
      delete next[zone]
      return next
    })
  }

  // ── Save outfit (optionally mark as worn today) ────────────────────────────

  async function handleSave(wearToday: boolean) {
    const garmentList = Object.values(placed).filter(Boolean) as GarmentItem[]
    if (garmentList.length === 0) {
      showAlert('Lägg till minst ett plagg!')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')

      const today = new Date().toISOString().split('T')[0]
      const name = `Outfit ${new Date().toLocaleDateString('sv-SE')}`
      const garmentIds = garmentList.map(g => g.id)
      const garmentNames = garmentList.map(g => g.name)
      const imageUrls = garmentList.map(g => g.image_url).filter(Boolean)

      const { data: outfit, error } = await supabase
        .from('outfits')
        .insert([{ user_id: user.id, name, garment_ids: garmentIds, garment_names: garmentNames, image_urls: imageUrls }])
        .select()
        .single()
      if (error) throw error

      if (wearToday) {
        await supabase
          .from('outfit_calendar')
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const bodyW = SIZE_W[size]

  // Render placed garments in correct layer order (outer on top)
  const RENDER_ORDER: Zone[] = ['shoes', 'bottom', 'top', 'outer']
  const sortedPlaced = RENDER_ORDER
    .map(z => (placed[z] ? ([z, placed[z]] as [Zone, GarmentItem]) : null))
    .filter(Boolean) as [Zone, GarmentItem][]

  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={measureAll}
    >
      {/* ── Size selector ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sizeBar}
        contentContainerStyle={styles.sizeBarContent}
      >
        <Text style={styles.sizeLabel}>Storlek:</Text>
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

      {/* ── Body canvas ── */}
      <View style={styles.bodyArea}>
        <View
          ref={bodyCanvasRef}
          style={[styles.bodyCanvas, { width: bodyW, height: BODY_H }]}
          onLayout={measureAll}
        >
          {/* SVG silhouette */}
          <Image
            source={{ uri: BODY_URI }}
            style={{ width: bodyW, height: BODY_H, backgroundColor: 'transparent' }}
            resizeMode="stretch"
          />

          {/* Placed garments as overlay */}
          {sortedPlaced.map(([zone, garment]) => {
            const rect = getZoneRect(zone, bodyW)
            return (
              <TouchableOpacity
                key={zone}
                activeOpacity={0.85}
                onPress={() => removeFromZone(zone)}
                style={[
                  styles.placedZone,
                  {
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    zIndex: ZONE_Z[zone],
                  },
                ]}
              >
                {garment.image_url ? (
                  <Image
                    source={{ uri: garment.image_url }}
                    style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.placedEmoji}>
                    <Text style={{ fontSize: 24 }}>👗</Text>
                  </View>
                )}
                <View style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </View>
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
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn]}
          onPress={() => handleSave(false)}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Sparar…' : '🍒 Spara outfit'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.wearBtn]}
          onPress={() => handleSave(true)}
          disabled={saving}
        >
          <Text style={styles.wearBtnText}>Ha på mig idag</Text>
        </TouchableOpacity>
      </View>

      {/* ── Drag ghost (follows finger) ── */}
      {dragging && (
        <Animated.View
          pointerEvents="none"
          style={[styles.dragGhost, dragXY.getLayout()]}
        >
          {dragging.image_url ? (
            <Image
              source={{ uri: dragging.image_url }}
              style={styles.dragGhostImg}
              resizeMode="contain"
            />
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
  root: {
    flex: 1,
    backgroundColor: '#150408',
  },

  // Size bar
  sizeBar: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sizeBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeLabel: {
    color: 'rgba(196,115,122,0.55)',
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  sizePill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
  },
  sizePillActive: {
    backgroundColor: '#9E2035',
    borderColor: '#9E2035',
  },
  sizePillText: {
    color: '#C4737A',
    fontSize: 13,
    fontWeight: '500',
  },
  sizePillTextActive: {
    color: '#FBF3EF',
    fontWeight: '700',
  },

  // Body area
  bodyArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bodyCanvas: {
    // explicit width + height set via inline style
  },
  placedZone: {
    position: 'absolute',
    overflow: 'hidden',
  },
  placedEmoji: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(158,32,53,0.9)',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#FBF3EF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  bodyHint: {
    color: 'rgba(196,115,122,0.4)',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Garment picker
  pickerArea: {
    height: 122,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,115,122,0.1)',
    paddingTop: 8,
  },
  pickerLabel: {
    color: 'rgba(196,115,122,0.45)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  pickerContent: {
    paddingHorizontal: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  pickerItem: {
    width: 66,
    alignItems: 'center',
    gap: 4,
  },
  pickerThumb: {
    width: 54,
    height: 66,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  pickerThumbEmpty: {
    width: 54,
    height: 66,
    borderRadius: 10,
    backgroundColor: 'rgba(122,24,40,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerName: {
    fontSize: 9,
    color: '#C4737A',
    textAlign: 'center',
    width: 66,
  },
  emptyPicker: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyPickerText: {
    color: 'rgba(196,115,122,0.4)',
    fontSize: 13,
  },

  // Action buttons
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#9E2035',
    borderWidth: 1,
    borderColor: '#DDA0A7',
  },
  saveBtnText: {
    color: '#FBF3EF',
    fontSize: 14,
    fontWeight: '600',
  },
  wearBtn: {
    backgroundColor: 'rgba(122,24,40,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.35)',
  },
  wearBtnText: {
    color: '#DDA0A7',
    fontSize: 14,
    fontWeight: '600',
  },

  // Drag ghost
  dragGhost: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(21,4,8,0.5)',
    zIndex: 9999,
  },
  dragGhostImg: {
    width: 80,
    height: 80,
    backgroundColor: 'transparent',
  },
})
