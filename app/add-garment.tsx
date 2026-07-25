import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { goBack } from '../utils/nav'
import { newImageId } from '../utils/id'
import { toast } from '../components/Toast'
import { showAlert } from '../utils/alert'
import { base64ToBytes, pngToWebp } from '../utils/image'
import { uploadUserImage } from '../utils/storage'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import BrandInput from '../components/BrandInput'
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'
import { parsePrice } from '../utils/brands'
import { CATEGORIES, COLOR_OPTIONS as COLORS, FITS, SEASONS, SUBCATEGORIES } from '../utils/constants'
import { useSettings } from '../utils/settings'
import { pickImageSmart } from '../utils/imagePicker'
import { fetchLocations, type Location } from '../utils/locations'
import { loadPeople, type Person } from '../utils/people'
import { EU_CHILD_SIZES } from '../utils/childSize'

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']

// Max bredd på lagrade/skickade bilder. En mobilbild är ofta 3000–4000 px;
// 1400 px räcker gott för en telefonskärm och kapar filstorleken ~85–90 %.
// Mindre bild = mindre lagring/bandbredd i Supabase + billigare AI-/Replicate-anrop.
const MAX_IMAGE_WIDTH = 1400

// Skalar ner (aldrig upp) och komprimerar till JPEG. Returnerar uri + base64.
async function compressImage(uri: string, srcWidth?: number): Promise<{ uri: string; base64: string }> {
  const context = ImageManipulator.manipulate(uri)
  if (!srcWidth || srcWidth > MAX_IMAGE_WIDTH) context.resize({ width: MAX_IMAGE_WIDTH })
  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true })
  return { uri: result.uri, base64: result.base64 || '' }
}

type GarmentDraft = {
  id: string
  uri: string
  base64: string
  processedBase64: string | null
  name: string
  category: string
  subcategory: string
  color: string
  seasons: string[]
  size: string
  fit: string
  brand: string
  price: string
  location: string
  // Familjeläge (batch-per-låda): ärvs från batch-kontexten men kan justeras.
  personId: string | null
  sizeCm: number | null
  familyStatus: 'in_use' | 'stored' | 'outgrown'
  analyzing: boolean
  removingBg: boolean
}

type FamilyStatus = 'in_use' | 'stored' | 'outgrown'
const FAMILY_STATUS_LABELS: Record<FamilyStatus, string> = {
  in_use: 'Används', stored: 'Sparad i låda', outgrown: 'Urvuxen',
}

export default function AddGarment() {
  const t = useTheme()
  const { currency, toBaseSEK } = useSettings()
  const styles = makeStyles(t)
  const [step, setStep] = useState<'pick' | 'review'>('pick')
  const [drafts, setDrafts] = useState<GarmentDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [bgError, setBgError] = useState<string | null>(null)
  const [ownBrands, setOwnBrands] = useState<string[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  // Batch-per-låda (spec §5b): sätt kontext EN gång för hela sessionen, så varje
  // fotat plagg ärver storlek/plats/status/barn i stället för att skrivas in per plagg.
  const [children, setChildren] = useState<Person[]>([])
  const [batchMode, setBatchMode] = useState(false)
  const [batchPersonId, setBatchPersonId] = useState<string | null>(null)
  const [batchSizeCm, setBatchSizeCm] = useState<number | null>(null)
  const [batchStatus, setBatchStatus] = useState<FamilyStatus>('stored')
  const [batchLocation, setBatchLocation] = useState('')

  const { start } = useLocalSearchParams()

  useEffect(() => {
    supabase.from('garments').select('brand').then(({ data }) => {
      if (data) setOwnBrands([...new Set(data.map((g: any) => g.brand).filter(Boolean))] as string[])
    })
    fetchLocations().then(setLocations).catch(() => {})
    loadPeople().then(ppl => setChildren(ppl.filter(p => p.type === 'child'))).catch(() => {})
  }, [])

  // Kommer man in via "Välj foton" i valrutan – öppna bildväljaren automatiskt.
  // Vi väntar tills skärmen fått fokus OCH animationer/valrutan lagt sig, annars
  // vägrar iOS presentera väljaren ovanpå en modal som håller på att stängas
  // (då fastnade man på en snurrande sida).
  const autoStarted = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (start !== 'photos' || autoStarted.current) return
      autoStarted.current = true
      let timer: ReturnType<typeof setTimeout> | undefined
      const task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(() => pickImages(true), 250)
      })
      return () => { task.cancel(); if (timer) clearTimeout(timer) }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [start]),
  )

  async function pickImages(auto = false) {
    setBgError(null)
    let result: ImagePicker.ImagePickerResult
    try {
      result = await pickImageSmart({
        mediaTypes: ['images'] as any,
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      })
    } catch {
      // Kunde inte öppna väljaren – lämna inte användaren på en snurrande sida.
      if (auto) goBack('/wardrobe')
      return
    }
    // Avbryter man den automatiska väljaren (kom hit via "Välj foton") går vi
    // tillbaka i stället för att fastna på laddningsvyn.
    if (result.canceled || result.assets.length === 0) {
      if (auto) goBack('/wardrobe')
      return
    }

    const newDrafts: GarmentDraft[] = result.assets.map((asset, i) => ({
      id: `${Date.now()}-${i}`,
      uri: asset.uri,
      base64: asset.base64 || '',
      processedBase64: null,
      name: '',
      category: '',
      subcategory: '',
      color: '',
      seasons: [],
      size: '',
      fit: '',
      brand: '',
      price: '',
      // Ärv batch-kontexten (om lådläge är på) så inget behöver skrivas per plagg.
      location: batchMode ? batchLocation : '',
      personId: batchMode ? batchPersonId : null,
      sizeCm: batchMode ? batchSizeCm : null,
      familyStatus: batchMode ? batchStatus : 'in_use',
      analyzing: true,
      removingBg: true,
    }))
    setDrafts(newDrafts)
    setStep('review')

    // AI-analys och bakgrundsborttagning körs parallellt per foto
    for (let idx = 0; idx < newDrafts.length; idx++) {
      const draft = newDrafts[idx]
      const asset = result.assets[idx]

      // Komprimera först: mindre bild sparar lagring/bandbredd och gör
      // AI-analysen + bakgrundsborttagningen billigare och snabbare.
      let base64 = draft.base64
      try {
        const c = await compressImage(asset.uri, asset.width)
        base64 = c.base64
        setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, uri: c.uri, base64: c.base64 } : d))
      } catch {
        // Faller tillbaka på originalet om komprimeringen misslyckas
      }

      await Promise.all([
        (async () => {
          try {
            const data = await apiPost('/api/analyze-garment', { base64 })
            setDrafts(prev => prev.map(d =>
              d.id === draft.id
                ? { ...d, name: data.name || '', category: data.category || '', subcategory: data.subcategory || '', color: data.color || '', seasons: data.seasons || [], analyzing: false }
                : d
            ))
          } catch {
            setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, analyzing: false } : d))
          }
        })(),
        (async () => {
          try {
            const data = await apiPost('/api/remove-background', { base64 })
            if (data.base64) {
              setDrafts(prev => prev.map(d =>
                d.id === draft.id
                  ? { ...d, processedBase64: data.base64, uri: `data:image/png;base64,${data.base64}`, removingBg: false }
                  : d
              ))
            } else {
              setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, removingBg: false } : d))
            }
          } catch (e: any) {
            // Misslyckad bakgrundsborttagning → behåll originalbilden, men visa orsaken
            setBgError(e?.message || 'okänt fel')
            setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, removingBg: false } : d))
          }
        })(),
      ])
    }
  }

  function updateDraft(id: string, field: keyof GarmentDraft, value: any) {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d
      if (field === 'category') return { ...d, category: value, subcategory: '' }
      return { ...d, [field]: value }
    }))
  }

  function toggleDraftSeason(id: string, season: string) {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d
      const seasons = d.seasons.includes(season)
        ? d.seasons.filter(s => s !== season)
        : [...d.seasons, season]
      return { ...d, seasons }
    }))
  }

  function removeDraft(id: string) {
    setDrafts(prev => {
      const next = prev.filter(d => d.id !== id)
      if (next.length === 0) setStep('pick')
      return next
    })
  }

  async function uploadImage(draft: GarmentDraft) {
    if (draft.processedBase64) {
      // Bakgrundsfri bild – omkoda från PNG till WebP (behåller transparens
      // men blir mycket mindre) innan uppladdning.
      const opt = await pngToWebp(draft.processedBase64)
      return uploadUserImage(base64ToBytes(opt.base64), opt.ext, opt.contentType)
    }

    // Fallback: originalfotot
    const response = await fetch(draft.uri)
    const arrayBuffer = await response.arrayBuffer()
    return uploadUserImage(new Uint8Array(arrayBuffer), 'jpg', 'image/jpeg')
  }

  async function saveAll() {
    const ready = drafts.filter(d => !d.analyzing && !d.removingBg)
    if (ready.some(d => !d.name || !d.category)) {
      showAlert('Fyll i namn och kategori för alla plagg')
      return
    }
    if (ready.some(d => d.seasons.length === 0)) {
      showAlert('Välj årstid', 'Ange minst en årstid för varje plagg – det används för att ge säsongsrätta outfit-förslag. Välj "Alla årstider" om plagget passar året runt.')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')
      for (const draft of ready) {
        const imageUrl = await uploadImage(draft)
        await supabase.from('garments').insert([{
          user_id: user.id,
          name: draft.name,
          category: draft.category,
          subcategory: draft.subcategory || null,
          color: draft.color,
          season: draft.seasons.join(', '),
          size: draft.size.trim() || null,
          fit: draft.fit || null,
          brand: draft.brand.trim() || null,
          price: toBaseSEK(parsePrice(draft.price)),
          location: draft.location || null,
          image_url: imageUrl,
          person_id: draft.personId,
          household_id: draft.personId ? (children.find(c => c.id === draft.personId)?.household_id ?? null) : null,
          size_cm: draft.personId ? draft.sizeCm : null,
          status: draft.personId ? draft.familyStatus : null,
        }])
      }
      toast(`${ready.length} ${ready.length === 1 ? 'plagg tillagt' : 'plagg tillagda'}!`, 'Ligger nu i garderoben – med bild och bakgrunden borttagen.')
      goBack('/wardrobe')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── PICK STEP ──────────────────────────────────────────────
  if (step === 'pick') {
    // Kom man hit via "Välj foton" öppnas bildväljaren automatiskt – visa en
    // spinner medan den öppnas. Skulle den inte öppna sig finns knappar kvar
    // så man aldrig fastnar på en snurrande sida.
    if (start === 'photos' && drafts.length === 0) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.autoPickWrap}>
            <ActivityIndicator color={t.primary} />
            <Text style={styles.autoPickHint}>Öppnar galleriet…</Text>
            <TouchableOpacity style={styles.autoPickBtn} onPress={() => pickImages()}>
              <Text style={styles.autoPickBtnText}>Välj foton</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goBack('/wardrobe')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.autoPickCancel}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )
    }
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => goBack('/wardrobe')}>
            <Text style={styles.backButtonText}>← Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Lägg till plagg</Text>

          {children.length > 0 && (
            <View style={styles.batchCard}>
              <TouchableOpacity style={styles.batchHeader} onPress={() => setBatchMode(v => !v)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>Lägg in en hel låda</Text>
                  <Text style={styles.batchHint}>Sätt barn, storlek, status och plats en gång – varje foto ärver det. Perfekt för sparade lådor.</Text>
                </View>
                <View style={[styles.toggle, batchMode && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, batchMode && styles.toggleKnobOn]} />
                </View>
              </TouchableOpacity>

              {batchMode && (
                <View style={styles.batchBody}>
                  <Text style={styles.cardLabel}>BARN</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.pillRow}>
                      {children.map(c => {
                        const on = batchPersonId === c.id
                        return (
                          <TouchableOpacity key={c.id} style={[styles.pill, on && styles.pillActive]}
                            onPress={() => {
                              setBatchPersonId(on ? null : c.id)
                              if (!on && batchSizeCm == null) setBatchSizeCm(c.current_size_cm ?? null)
                            }}>
                            <Text style={[styles.pillText, on && styles.pillTextActive]}>{c.name}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </ScrollView>

                  <Text style={styles.cardLabel}>STORLEK</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.pillRow}>
                      {EU_CHILD_SIZES.map(s => (
                        <TouchableOpacity key={s} style={[styles.pill, batchSizeCm === s && styles.pillActive]}
                          onPress={() => setBatchSizeCm(batchSizeCm === s ? null : s)}>
                          <Text style={[styles.pillText, batchSizeCm === s && styles.pillTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.cardLabel}>STATUS</Text>
                  <View style={styles.pillRow}>
                    {(Object.keys(FAMILY_STATUS_LABELS) as FamilyStatus[]).map(v => (
                      <TouchableOpacity key={v} style={[styles.pill, batchStatus === v && styles.pillActive]}
                        onPress={() => setBatchStatus(v)}>
                        <Text style={[styles.pillText, batchStatus === v && styles.pillTextActive]}>{FAMILY_STATUS_LABELS[v]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {locations.length > 0 && (
                    <>
                      <Text style={styles.cardLabel}>PLATS</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.pillRow}>
                          {locations.map(l => (
                            <TouchableOpacity key={l.id} style={[styles.pill, batchLocation === l.name && styles.pillActive]}
                              onPress={() => setBatchLocation(batchLocation === l.name ? '' : l.name)}>
                              <Text style={[styles.pillText, batchLocation === l.name && styles.pillTextActive]}>{l.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.pickBtn} onPress={() => pickImages()}>
            <Text style={styles.pickBtnTitle}>Välj foton</Text>
            <Text style={styles.pickBtnHint}>Välj ett eller flera plagg – AI fyller i detaljerna & tar bort bakgrunden automatiskt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => router.push('/import-purchases')}>
            <Text style={styles.pickBtnTitle}>Importera köp</Text>
            <Text style={styles.pickBtnHint}>Hämta plagg automatiskt från din orderhistorik hos H&M, Zalando, Zara m.fl.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => router.push('/import-email')}>
            <Text style={styles.pickBtnTitle}>Importera från mejl</Text>
            <Text style={styles.pickBtnHint}>Vidarebefordra orderbekräftelser från din mejl så läggs plaggen till automatiskt</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── REVIEW STEP ────────────────────────────────────────────
  const processingCount = drafts.filter(d => d.analyzing || d.removingBg).length
  const totalCount = drafts.length

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('pick')}>
          <Text style={styles.backButtonText}>← Välj andra foton</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Granska plagg</Text>

        {processingCount > 0 && (
          <View style={styles.progressRow}>
            <ActivityIndicator color={t.textSecondary} size="small" />
            <Text style={styles.progressText}>Bearbetar {totalCount - processingCount}/{totalCount}...</Text>
          </View>
        )}

        {bgError && (
          <View style={styles.bgErrorBox}>
            <Text style={styles.bgErrorText}>Bakgrunden kunde inte tas bort – plagget sparas med originalfotot.</Text>
            <Text style={styles.bgErrorDetail}>Orsak: {bgError}</Text>
          </View>
        )}

        {drafts.map((draft) => {
          const isProcessing = draft.analyzing || draft.removingBg
          const statusText = draft.analyzing && draft.removingBg
            ? 'AI analyserar & tar bort bakgrund...'
            : draft.analyzing ? 'AI analyserar...' : 'Tar bort bakgrund...'

          return (
            <View key={draft.id} style={styles.card}>
              {/* Header: thumbnail + name + remove */}
              <View style={styles.cardHeader}>
                <View style={styles.cardThumbWrap}>
                  <Image source={{ uri: draft.uri }} style={styles.cardThumb} resizeMode="contain" />
                </View>
                <View style={styles.cardNameWrap}>
                  {isProcessing ? (
                    <View style={styles.analyzingRow}>
                      <ActivityIndicator color={t.textSecondary} size="small" />
                      <Text style={styles.analyzingText}>{statusText}</Text>
                    </View>
                  ) : (
                    <TextInput
                      style={styles.cardNameInput}
                      value={draft.name}
                      onChangeText={v => updateDraft(draft.id, 'name', v)}
                      placeholder="Namn på plagget"
                      placeholderTextColor={t.placeholder}
                    />
                  )}
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeDraft(draft.id)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {!isProcessing && (
                <>
                  {draft.personId && (
                    <View style={styles.familyChip}>
                      <Text style={styles.familyChipText}>
                        👶 {children.find(c => c.id === draft.personId)?.name ?? 'Barn'}
                        {draft.sizeCm ? ` · stl ${draft.sizeCm}` : ''} · {FAMILY_STATUS_LABELS[draft.familyStatus]}
                      </Text>
                    </View>
                  )}
                  {/* Brand */}
                  <Text style={styles.cardLabel}>MÄRKE (VALFRITT)</Text>
                  <BrandInput value={draft.brand} onChange={v => updateDraft(draft.id, 'brand', v)} ownBrands={ownBrands} />

                  {/* Category */}
                  <Text style={styles.cardLabel}>KATEGORI</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.pillRow}>
                      {CATEGORIES.map(cat => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.pill, draft.category === cat && styles.pillActive]}
                          onPress={() => updateDraft(draft.id, 'category', cat)}
                        >
                          <Text style={[styles.pillText, draft.category === cat && styles.pillTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Subcategory */}
                  {draft.category && SUBCATEGORIES[draft.category] && (
                    <>
                      <Text style={styles.cardLabel}>TYP</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.pillRow}>
                          {SUBCATEGORIES[draft.category].map(sub => (
                            <TouchableOpacity
                              key={sub}
                              style={[styles.pill, draft.subcategory === sub && styles.pillActive]}
                              onPress={() => updateDraft(draft.id, 'subcategory', draft.subcategory === sub ? '' : sub)}
                            >
                              <Text style={[styles.pillText, draft.subcategory === sub && styles.pillTextActive]}>{sub}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </>
                  )}

                  {/* Color */}
                  <Text style={styles.cardLabel}>FÄRG</Text>
                  <View style={styles.colorRow}>
                    {COLORS.map(c => (
                      <TouchableOpacity
                        key={c.name}
                        style={[styles.colorDot, { backgroundColor: c.hex }, draft.color === c.name && styles.colorDotActive]}
                        onPress={() => updateDraft(draft.id, 'color', c.name)}
                      >
                        {draft.color === c.name && <Text style={styles.colorCheck}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Season */}
                  <Text style={styles.cardLabel}>SÄSONG *</Text>
                  <View style={styles.pillRow}>
                    {SEASONS.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.pill, draft.seasons.includes(s) && styles.pillActive]}
                        onPress={() => toggleDraftSeason(draft.id, s)}
                      >
                        <Text style={[styles.pillText, draft.seasons.includes(s) && styles.pillTextActive]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Size */}
                  <Text style={styles.cardLabel}>STORLEK (VALFRITT)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.pillRow}>
                      {SIZES.map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.pill, draft.size === s && styles.pillActive]}
                          onPress={() => updateDraft(draft.id, 'size', draft.size === s ? '' : s)}
                        >
                          <Text style={[styles.pillText, draft.size === s && styles.pillTextActive]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  <TextInput
                    style={styles.sizeInput}
                    placeholder="Egen storlek, t.ex. 38 eller W29/L32"
                    placeholderTextColor={t.placeholder}
                    value={SIZES.includes(draft.size) ? '' : draft.size}
                    onChangeText={v => updateDraft(draft.id, 'size', v)}
                  />

                  {/* Fit / passform */}
                  <Text style={styles.cardLabel}>PASSFORM (VALFRITT)</Text>
                  <View style={styles.pillRow}>
                    {FITS.map(f => (
                      <TouchableOpacity
                        key={f}
                        style={[styles.pill, draft.fit === f && styles.pillActive]}
                        onPress={() => updateDraft(draft.id, 'fit', draft.fit === f ? '' : f)}
                      >
                        <Text style={[styles.pillText, draft.fit === f && styles.pillTextActive]}>{f}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Price */}
                  <Text style={styles.cardLabel}>PRIS I {currency} (VALFRITT)</Text>
                  <TextInput
                    style={styles.sizeInput}
                    placeholder="t.ex. 299"
                    placeholderTextColor={t.placeholder}
                    value={draft.price}
                    onChangeText={v => updateDraft(draft.id, 'price', v)}
                    keyboardType="numeric"
                  />

                  {/* Var finns plagget? */}
                  {locations.length > 0 && (
                    <>
                      <Text style={styles.cardLabel}>VAR FINNS PLAGGET? (VALFRITT)</Text>
                      <View style={styles.pillRow}>
                        {locations.map(l => (
                          <TouchableOpacity
                            key={l.id}
                            style={[styles.pill, draft.location === l.name && styles.pillActive]}
                            onPress={() => updateDraft(draft.id, 'location', draft.location === l.name ? '' : l.name)}
                          >
                            <Text style={[styles.pillText, draft.location === l.name && styles.pillTextActive]}>
                              {l.name}{l.is_archive ? ' (arkiv)' : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )
        })}

        <TouchableOpacity
          style={[styles.saveButton, (saving || processingCount > 0) && styles.saveButtonDisabled]}
          onPress={saveAll}
          disabled={saving || processingCount > 0}
          accessibilityLabel={saving ? 'Sparar plagg' : `Spara ${drafts.length} plagg`}
          accessibilityRole="button"
        >
          {saving
            ? <ActivityIndicator color={t.onPrimary} size="small" />
            : <Text style={styles.saveButtonText}>{`Spara ${drafts.length} ${drafts.length === 1 ? 'plagg' : 'plagg'}`}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 24 },

  pickBtn: {
    backgroundColor: t.surfaceMuted,
    borderRadius: 20,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: t.border,
    borderStyle: 'dashed',
  },
  pickBtnIcon: { fontFamily: 'Lora_400Regular', fontSize: 48 },
  pickBtnTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: t.textPrimary },
  pickBtnHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  autoPickWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  autoPickHint: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary },
  autoPickBtn: { backgroundColor: t.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  autoPickBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.onPrimary },
  autoPickCancel: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textDecorationLine: 'underline' },

  batchCard: { backgroundColor: t.surfaceMuted, borderRadius: 16, borderWidth: 1, borderColor: t.border, padding: 16, marginBottom: 16 },
  batchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batchTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  batchHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, marginTop: 2, lineHeight: 18 },
  batchBody: { gap: 8, marginTop: 14 },
  toggle: { width: 46, height: 28, borderRadius: 14, backgroundColor: t.border, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: t.primary },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.surface },
  toggleKnobOn: { alignSelf: 'flex-end' },
  familyChip: { alignSelf: 'flex-start', backgroundColor: t.surfaceMuted, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  familyChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textPrimary },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.surfaceMuted, borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  progressText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  bgErrorBox: { backgroundColor: t.surfaceMuted, borderRadius: t.radius.md, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: t.border, gap: 4 },
  bgErrorText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13 },
  bgErrorDetail: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 11 },

  card: {
    backgroundColor: t.surfaceMuted,
    borderRadius: 16, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: t.border, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardThumbWrap: {
    width: 64, height: 80, borderRadius: 10, overflow: 'hidden',
  },
  cardThumbBg: {
    backgroundColor: 'rgba(64,45,33,0.08)',
    borderWidth: 1,
    borderColor: t.border,
  },
  cardThumb: { width: 64, height: 80, borderRadius: 8, backgroundColor: t.imageBg },
  cardNameWrap: { flex: 1 },
  cardNameInput: {
    backgroundColor: t.surfaceMuted, borderRadius: 10,
    padding: 10, color: t.textPrimary, fontSize: 15,
    borderWidth: 1, borderColor: t.border,
  },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, fontStyle: 'italic' },
  removeBtn: { padding: 6 },
  removeBtnText: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 18 },

  cardLabel: { fontFamily: 'Poppins_700Bold', color: t.textFaint, fontSize: 11, letterSpacing: 1.5 },
  sizeInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 10, padding: 10, color: t.textPrimary, fontSize: 14, borderWidth: 1, borderColor: t.border },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: t.surfaceMuted,
    borderWidth: 1, borderColor: t.border,
  },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  pillTextActive: { color: t.onPrimary },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  colorCheck: {
    color: t.textPrimary, fontSize: 13, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  saveButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
})
