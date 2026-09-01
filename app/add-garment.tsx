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
import { downscaleForUpload } from '../utils/image'
import { uploadUserImage } from '../utils/storage'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DraftCard from '../components/add-garment/DraftCard'
import { supabase } from '../supabase'
import { invalidateGarments } from '../utils/garmentsStore'
import { apiPost } from '../utils/api'
import { removeBackground } from '../utils/removeBg'
import { parsePrice } from '../utils/brands'
import { categoryForChildGarment } from '../utils/outfit'
import { useSettings } from '../utils/settings'
import { pickImageSmart } from '../utils/imagePicker'
import { fetchLocations, type Location } from '../utils/locations'
import { loadPeople, type Person } from '../utils/people'
import { EU_CHILD_SIZES } from '../utils/childSize'
import { useEntitlements, familyFeaturesEnabled } from '../utils/entitlements'
import { SCAN_MULTIPLE_ENABLED } from '../utils/featureFlags'

// Max bredd på lagrade/skickade bilder. En mobilbild är ofta 3000–4000 px;
// 1400 px räcker gott för en telefonskärm och kapar filstorleken ~85–90 %.
// Mindre bild = mindre lagring/bandbredd i Supabase + billigare AI-/Replicate-anrop.
// Plaggbilderna visas nu utan server-transform (se SignedImage), så origin-
// bilden laddas direkt. 1000 px räcker för miniatyrer, detaljvy och dela-kort
// och håller nedladdningen liten.
const MAX_IMAGE_WIDTH = 1000

// Skalar ner (aldrig upp) och komprimerar till JPEG. Returnerar uri + base64 +
// de renderade måtten (behövs för att beskära ut enskilda plagg vid skanning).
async function compressImage(uri: string, srcWidth?: number): Promise<{ uri: string; base64: string; width: number; height: number }> {
  const context = ImageManipulator.manipulate(uri)
  if (!srcWidth || srcWidth > MAX_IMAGE_WIDTH) context.resize({ width: MAX_IMAGE_WIDTH })
  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true })
  return { uri: result.uri, base64: result.base64 || '', width: result.width, height: result.height }
}

// Beskär ut en ruta (0–1000-rutnät från detect-garments) ur en bild och
// returnerar uri + base64 för det enskilda plagget. Koordinaterna räknas om
// till pixlar utifrån bildens faktiska mått och klampas inom bilden.
async function cropRegion(
  uri: string, imgW: number, imgH: number,
  box: { x: number; y: number; w: number; h: number },
): Promise<{ uri: string; base64: string }> {
  const originX = Math.max(0, Math.min(imgW - 1, Math.round((box.x / 1000) * imgW)))
  const originY = Math.max(0, Math.min(imgH - 1, Math.round((box.y / 1000) * imgH)))
  const width = Math.max(1, Math.min(imgW - originX, Math.round((box.w / 1000) * imgW)))
  const height = Math.max(1, Math.min(imgH - originY, Math.round((box.h / 1000) * imgH)))
  const rendered = await ImageManipulator.manipulate(uri).crop({ originX, originY, width, height }).renderAsync()
  const result = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true })
  return { uri: result.uri, base64: result.base64 || '' }
}

export type GarmentDraft = {
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
  const { currency, toBaseSEK, t: tr } = useSettings()
  const { tier } = useEntitlements()
  // Att tilldela plagg till ett barn ligger bakom familjeläget.
  const familyOn = familyFeaturesEnabled(tier)
  const styles = makeStyles(t)
  const [step, setStep] = useState<'pick' | 'review'>('pick')
  const [drafts, setDrafts] = useState<GarmentDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
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

  const { start, person: personParam, personName } = useLocalSearchParams<{ start?: string; person?: string; personName?: string }>()

  useEffect(() => {
    supabase.from('garments').select('brand').then(({ data }) => {
      if (data) setOwnBrands([...new Set(data.map((g: any) => g.brand).filter(Boolean))] as string[])
    })
    fetchLocations().then(setLocations).catch(() => {})
    loadPeople().then(ppl => {
      const kids = familyOn ? ppl.filter(p => p.type === 'child') : []
      setChildren(kids)
      // Kom man hit från ett barns garderob: förvälj lådläget för det barnet.
      if (personParam) {
        const child = kids.find(k => k.id === personParam)
        if (child) {
          setBatchMode(true)
          setBatchPersonId(child.id)
          setBatchSizeCm(prev => prev ?? child.current_size_cm ?? null)
        }
      }
    }).catch(() => {})
  }, [personParam, familyOn])

  // Kommer man in via "Välj foton" i valrutan – öppna bildväljaren automatiskt.
  // Vi väntar tills skärmen fått fokus OCH animationer/valrutan lagt sig, annars
  // vägrar iOS presentera väljaren ovanpå en modal som håller på att stängas
  // (då fastnade man på en snurrande sida).
  // Läs om platserna vid fokus så nyss skapade platser (via "Hantera platser")
  // dyker upp direkt när man kommer tillbaka.
  useFocusEffect(
    useCallback(() => { fetchLocations().then(setLocations).catch(() => {}) }, []),
  )

  const autoStarted = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (autoStarted.current) return
      if (start !== 'photos' && !(start === 'scan' && SCAN_MULTIPLE_ENABLED)) return
      autoStarted.current = true
      let timer: ReturnType<typeof setTimeout> | undefined
      const task = InteractionManager.runAfterInteractions(() => {
        timer = setTimeout(() => { start === 'scan' ? scanMultiple() : pickImages(true) }, 250)
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
            const b64 = await removeBackground(base64)
            if (b64) {
              setDrafts(prev => prev.map(d =>
                d.id === draft.id
                  ? { ...d, processedBase64: b64, uri: `data:image/png;base64,${b64}`, removingBg: false }
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

  // Skanna flera plagg ur EN bild: lägg ut plaggen, ta ett foto → AI:n hittar
  // varje plagg (detect-garments) och vi beskär ut dem till separata utkast som
  // går vidare i samma granska-flöde. Sparar tid mot att fota ett i taget.
  async function scanMultiple() {
    setBgError(null)
    let result: ImagePicker.ImagePickerResult
    try {
      result = await pickImageSmart({
        mediaTypes: ['images'] as any,
        allowsMultipleSelection: false,
        quality: 0.7,
        base64: true,
      })
    } catch {
      return
    }
    if (result.canceled || result.assets.length === 0) return
    const asset = result.assets[0]

    setScanning(true)
    try {
      const c = await compressImage(asset.uri, asset.width)
      let detected: any[] = []
      // Skilj på "modellen hittade inga plagg" (tom bild) och "anropet gick
      // fel" (nätverk/nyckel/modell) – annars ser ett riktigt fel ut som en
      // tom bild och användaren felsöker fel sak.
      try {
        const data = await apiPost('/api/detect-garments', { base64: c.base64 })
        detected = data.garments || []
      } catch (e: any) {
        setScanning(false)
        showAlert(tr('Något gick fel'), e?.message || tr('Kunde inte analysera bilden. Prova igen om en stund.'))
        return
      }

      if (detected.length === 0) {
        setScanning(false)
        showAlert(
          tr('Inga plagg hittades'),
          tr('Vi kunde inte hitta separata plagg i bilden. Lägg ut plaggen med lite mellanrum mot en enfärgad bakgrund och prova igen – eller lägg till dem ett i taget med "Välj foton".'),
        )
        return
      }

      const baseId = Date.now()
      const newDrafts: GarmentDraft[] = detected.map((g, i) => ({
        id: `${baseId}-${i}`,
        uri: c.uri, // hela bilden tills beskärningen är klar
        base64: '',
        processedBase64: null,
        name: g.name || '',
        category: g.category || '',
        subcategory: g.subcategory || '',
        color: g.color || '',
        seasons: g.seasons || [],
        size: '',
        fit: '',
        brand: '',
        price: '',
        location: batchMode ? batchLocation : '',
        personId: batchMode ? batchPersonId : null,
        sizeCm: batchMode ? batchSizeCm : null,
        familyStatus: batchMode ? batchStatus : 'in_use',
        analyzing: false, // attributen är redan ifyllda av detect-garments
        removingBg: true,
      }))
      setDrafts(newDrafts)
      setStep('review')
      setScanning(false)

      // Beskär ut varje plagg och ta bort bakgrunden – ett i taget för att inte
      // överbelasta bakgrundsborttagningen.
      for (let i = 0; i < detected.length; i++) {
        const g = detected[i]
        const draftId = `${baseId}-${i}`
        try {
          const crop = await cropRegion(c.uri, c.width, c.height, g.box)
          setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, uri: crop.uri, base64: crop.base64 } : d))
          try {
            const b64 = await removeBackground(crop.base64)
            if (b64) {
              setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, processedBase64: b64, uri: `data:image/png;base64,${b64}`, removingBg: false } : d))
            } else {
              setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, removingBg: false } : d))
            }
          } catch (e: any) {
            setBgError(e?.message || 'okänt fel')
            setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, removingBg: false } : d))
          }
        } catch {
          // Beskärningen misslyckades → behåll hela bilden för det plagget.
          setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, base64: c.base64, removingBg: false } : d))
        }
      }
    } catch (e: any) {
      setScanning(false)
      showAlert(tr('Något gick fel'), e?.message || '')
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

    // Fallback: originalfotot. Redan nedskalat av compressImage, men JPEG –
    // omkodningen till WebP tar bort resten.
    const opt = await downscaleForUpload(draft.uri, MAX_IMAGE_WIDTH)
    return uploadUserImage(opt.bytes, opt.ext, opt.contentType)
  }

  async function saveAll() {
    const ready = drafts.filter(d => !d.analyzing && !d.removingBg)
    if (ready.some(d => !d.name || !d.category)) {
      showAlert(tr('Fyll i namn och kategori för alla plagg'))
      return
    }
    if (ready.some(d => d.seasons.length === 0)) {
      showAlert(tr('Välj årstid'), tr('Ange minst en årstid för varje plagg – det används för att ge säsongsrätta outfit-förslag. Välj "Alla årstider" om plagget passar året runt.'))
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')
      for (const draft of ready) {
        const imageUrl = await uploadImage(draft)
        // Kom man in från ett barns garderob (?person=) ska plagget hamna där,
        // även om lådläget inte hann sättas innan bildväljaren öppnades.
        const pid = draft.personId ?? (personParam ? String(personParam) : null)
        await supabase.from('garments').insert([{
          user_id: user.id,
          name: draft.name,
          // Body på ett barn hör hemma under Toppar, inte Underkläder – annars
          // ser outfitgenereringen den aldrig.
          category: categoryForChildGarment(draft.category, draft.subcategory, draft.name, !!pid),
          subcategory: draft.subcategory || null,
          color: draft.color,
          season: draft.seasons.join(', '),
          size: draft.size.trim() || null,
          fit: draft.fit || null,
          brand: draft.brand.trim() || null,
          price: toBaseSEK(parsePrice(draft.price)),
          location: draft.location || null,
          image_url: imageUrl,
          person_id: pid,
          household_id: pid ? (children.find(c => c.id === pid)?.household_id ?? null) : null,
          size_cm: pid ? draft.sizeCm : null,
          status: pid ? draft.familyStatus : null,
        }])
      }
      invalidateGarments()
      const addedMsg = (ready.length === 1 ? tr('{n} plagg tillagt!') : tr('{n} plagg tillagda!')).replace('{n}', String(ready.length))
      toast(addedMsg, tr('Ligger nu i garderoben – med bild och bakgrunden borttagen.'))
      goBack(personParam ? `/wardrobe?person=${personParam}&personName=${encodeURIComponent(personName || '')}` : '/wardrobe')
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
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
            <Text style={styles.autoPickHint}>{tr('Öppnar galleriet…')}</Text>
            <TouchableOpacity style={styles.autoPickBtn} onPress={() => pickImages()}>
              <Text style={styles.autoPickBtnText}>{tr('Välj foton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goBack('/wardrobe')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.autoPickCancel}>{tr('Avbryt')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )
    }
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => goBack('/wardrobe')}>
            <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tr('Lägg till plagg')}</Text>

          {children.length > 0 && (
            <View style={styles.batchCard}>
              <TouchableOpacity style={styles.batchHeader} onPress={() => setBatchMode(v => !v)} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>{tr('Lägg in en hel låda')}</Text>
                  <Text style={styles.batchHint}>{tr('Sätt barn, storlek, status och plats en gång – varje foto ärver det. Perfekt för sparade lådor.')}</Text>
                </View>
                <View style={[styles.toggle, batchMode && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, batchMode && styles.toggleKnobOn]} />
                </View>
              </TouchableOpacity>

              {batchMode && (
                <View style={styles.batchBody}>
                  <Text style={styles.cardLabel}>{tr('BARN')}</Text>
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

                  <Text style={styles.cardLabel}>{tr('STORLEK')}</Text>
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

                  <Text style={styles.cardLabel}>{tr('STATUS')}</Text>
                  <View style={styles.pillRow}>
                    {(Object.keys(FAMILY_STATUS_LABELS) as FamilyStatus[]).map(v => (
                      <TouchableOpacity key={v} style={[styles.pill, batchStatus === v && styles.pillActive]}
                        onPress={() => setBatchStatus(v)}>
                        <Text style={[styles.pillText, batchStatus === v && styles.pillTextActive]}>{tr(FAMILY_STATUS_LABELS[v])}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.labelRow}>
                    <Text style={styles.cardLabel}>{tr('PLATS')}</Text>
                    <TouchableOpacity onPress={() => router.push('/locations')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.manageLink}>{tr('Hantera platser')}</Text>
                    </TouchableOpacity>
                  </View>
                  {locations.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.pillRow}>
                        {locations.map(l => (
                          <TouchableOpacity key={l.id} style={[styles.pill, batchLocation === l.name && styles.pillActive]}
                            onPress={() => setBatchLocation(batchLocation === l.name ? '' : l.name)}>
                            <Text style={[styles.pillText, batchLocation === l.name && styles.pillTextActive]}>{l.name}{l.is_archive ? tr(' (arkiv)') : ''}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={styles.placeHint}>{tr('Inga platser än – tryck "Hantera platser" för att skapa en (t.ex. "Kartong 3, vinden").')}</Text>
                  )}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={[styles.pickBtn, styles.pickBtnHighlight]} onPress={() => router.push('/quick-start')}>
            <Text style={styles.pickBtnTitle}>{tr('Snabbstart')}</Text>
            <Text style={styles.pickBtnHint}>{tr('Bocka i basplaggen du äger och fyll garderoben på en minut – utan att fota')}</Text>
            <Text style={styles.betaTag}>{tr('NYTT')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => pickImages()}>
            <Text style={styles.pickBtnTitle}>{tr('Välj foton')}</Text>
            <Text style={styles.pickBtnHint}>{tr('Välj ett eller flera plagg – AI fyller i detaljerna & tar bort bakgrunden automatiskt')}</Text>
          </TouchableOpacity>
          {SCAN_MULTIPLE_ENABLED && (
          <TouchableOpacity style={[styles.pickBtn, scanning && styles.pickBtnDisabled]} onPress={() => scanMultiple()} disabled={scanning}>
            {scanning ? (
              <>
                <ActivityIndicator color={t.primary} />
                <Text style={styles.pickBtnHint}>{tr('Letar efter plagg i bilden…')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.pickBtnTitle}>{tr('Skanna flera plagg')}</Text>
                <Text style={styles.pickBtnHint}>{tr('Lägg ut plaggen och ta EN bild – AI:n hittar varje plagg och delar upp dem åt dig')}</Text>
                <Text style={styles.betaTag}>{tr('NYTT')}</Text>
              </>
            )}
          </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.pickBtn} onPress={() => router.push('/import-purchases')}>
            <Text style={styles.pickBtnTitle}>{tr('Importera köp')}</Text>
            <Text style={styles.pickBtnHint}>{tr('Hämta plagg automatiskt från din orderhistorik hos H&M, Zalando, Zara m.fl.')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickBtn} onPress={() => router.push('/import-email')}>
            <Text style={styles.pickBtnTitle}>{tr('Importera från mejl')}</Text>
            <Text style={styles.pickBtnHint}>{tr('Vidarebefordra orderbekräftelser från din mejl så läggs plaggen till automatiskt')}</Text>
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
          <Text style={styles.backButtonText}>← {tr('Välj andra foton')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Granska plagg')}</Text>

        {processingCount > 0 && (
          <View style={styles.progressRow}>
            <ActivityIndicator color={t.textSecondary} size="small" />
            <Text style={styles.progressText}>{tr('Bearbetar')} {totalCount - processingCount}/{totalCount}...</Text>
          </View>
        )}

        {bgError && (
          <View style={styles.bgErrorBox}>
            <Text style={styles.bgErrorText}>{tr('Bakgrunden kunde inte tas bort – plagget sparas med originalfotot.')}</Text>
            <Text style={styles.bgErrorDetail}>{tr('Orsak:')} {bgError}</Text>
          </View>
        )}

        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            people={children}
            ownBrands={ownBrands}
            locations={locations}
            currency={currency}
            onUpdate={updateDraft}
            onToggleSeason={toggleDraftSeason}
            onRemove={removeDraft}
          />
        ))}

        <TouchableOpacity
          style={[styles.saveButton, (saving || processingCount > 0) && styles.saveButtonDisabled]}
          onPress={saveAll}
          disabled={saving || processingCount > 0}
          accessibilityLabel={saving ? tr('Sparar plagg') : `${tr('Spara')} ${drafts.length} ${tr('plagg')}`}
          accessibilityRole="button"
        >
          {saving
            ? <ActivityIndicator color={t.onPrimary} size="small" />
            : <Text style={styles.saveButtonText}>{`${tr('Spara')} ${drafts.length} ${tr('plagg')}`}</Text>
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
  pickBtnDisabled: { opacity: 0.6 },
  pickBtnHighlight: { borderColor: t.primary, borderStyle: 'solid', backgroundColor: t.surface },
  betaTag: {
    fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 1,
    color: t.onPrimary, backgroundColor: t.primary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', marginTop: 2,
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
  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.surfaceMuted, borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  progressText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
  bgErrorBox: { backgroundColor: t.surfaceMuted, borderRadius: t.radius.md, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: t.border, gap: 4 },
  bgErrorText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13 },
  bgErrorDetail: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 11 },

  cardLabel: { fontFamily: 'Poppins_700Bold', color: t.textFaint, fontSize: 11, letterSpacing: 1.5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageLink: { fontFamily: 'Poppins_600SemiBold', color: t.primary, fontSize: 12 },
  placeHint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12, fontStyle: 'italic', lineHeight: 18 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: t.surfaceMuted,
    borderWidth: 1, borderColor: t.border,
  },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  pillTextActive: { color: t.onPrimary },

  saveButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
})
