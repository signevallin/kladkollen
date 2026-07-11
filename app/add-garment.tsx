import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'

const CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SUBCATEGORIES: Record<string, string[]> = {
  'Toppar': ['Linne', 'T-shirt', 'Långärmad topp', 'Body', 'Blus', 'Skjorta'],
  'Tröjor': ['Sweatshirt', 'Hoodie', 'Stickad tröja', 'Collegetröja', 'Kofta'],
  'Byxor': ['Jeans', 'Chinos', 'Kostymbyxor', 'Leggings', 'Shorts', 'Mjukisbyxor'],
  'Kjolar': ['Minikjol', 'Midikjol', 'Maxikjol', 'Plisserad kjol', 'Pennkjol'],
  'Klänningar': ['Miniklänning', 'Midiklänning', 'Maxiklänning', 'Festklänning', 'Vardagsklänning'],
  'Kavajer': ['Kavaj', 'Blazer', 'Kostymjacka'],
  'Ytterkläder': ['Vinterjacka', 'Regnrock', 'Trenchcoat', 'Pufferjacka', 'Läderjacka', 'Dunjacka'],
  'Skor': ['Sneakers', 'Boots', 'Pumps', 'Sandaler', 'Loafers', 'Ballerinaskor'],
  'Väskor': ['Handväska', 'Ryggsäck', 'Tote bag', 'Kuvertväska', 'Crossbody'],
  'Accessoarer': ['Halsduk', 'Sjal', 'Bälte', 'Hatt', 'Mössa', 'Smycken', 'Solglasögon'],
}
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
const COLORS = [
  { name: 'Svart', hex: '#1A1A1A' },
  { name: 'Vit', hex: '#F5F5F5' },
  { name: 'Grå', hex: '#9E9E9E' },
  { name: 'Beige', hex: '#D4B896' },
  { name: 'Brun', hex: '#795548' },
  { name: 'Röd', hex: '#E53935' },
  { name: 'Rosa', hex: '#EC407A' },
  { name: 'Lila', hex: '#8E24AA' },
  { name: 'Blå', hex: '#1E88E5' },
  { name: 'Ljusblå', hex: '#81D4FA' },
  { name: 'Grön', hex: '#43A047' },
  { name: 'Gul', hex: '#FDD835' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Guld', hex: '#C9A96E' },
]

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
  analyzing: boolean
  removingBg: boolean
}

export default function AddGarment() {
  const t = useTheme()
  const styles = makeStyles(t)
  const [step, setStep] = useState<'pick' | 'review'>('pick')
  const [drafts, setDrafts] = useState<GarmentDraft[]>([])
  const [saving, setSaving] = useState(false)

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    })
    if (result.canceled || result.assets.length === 0) return

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
      analyzing: true,
      removingBg: true,
    }))
    setDrafts(newDrafts)
    setStep('review')

    // AI-analys och bakgrundsborttagning körs parallellt per foto
    for (const draft of newDrafts) {
      await Promise.all([
        (async () => {
          try {
            const data = await apiPost('/api/analyze-garment', { base64: draft.base64 })
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
            const data = await apiPost('/api/remove-background', { base64: draft.base64 })
            if (data.base64) {
              setDrafts(prev => prev.map(d =>
                d.id === draft.id
                  ? { ...d, processedBase64: data.base64, uri: `data:image/png;base64,${data.base64}`, removingBg: false }
                  : d
              ))
            } else {
              setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, removingBg: false } : d))
            }
          } catch {
            // Misslyckad bakgrundsborttagning → behåll originalbilden
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
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}`

    if (draft.processedBase64) {
      // Bakgrundsfri PNG från remove.bg
      const filePath = `public/${filename}.png`
      const binaryStr = atob(draft.processedBase64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const { error } = await supabase.storage.from('garments').upload(filePath, bytes, { contentType: 'image/png', upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
      return urlData.publicUrl
    }

    // Fallback: originalfotot
    const filePath = `public/${filename}.jpg`
    const response = await fetch(draft.uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const { error } = await supabase.storage.from('garments').upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  async function saveAll() {
    const ready = drafts.filter(d => !d.analyzing && !d.removingBg)
    if (ready.some(d => !d.name || !d.category)) {
      Alert.alert('Fyll i namn och kategori för alla plagg')
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
          image_url: imageUrl,
        }])
      }
      Alert.alert(`${ready.length} ${ready.length === 1 ? 'plagg sparat' : 'plagg sparade'}! 🍒`)
      router.back()
    } catch (e: any) {
      Alert.alert('Något gick fel', e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── PICK STEP ──────────────────────────────────────────────
  if (step === 'pick') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Lägg till plagg</Text>
          <TouchableOpacity style={styles.pickBtn} onPress={pickImages}>
            <Text style={styles.pickBtnIcon}>📷</Text>
            <Text style={styles.pickBtnTitle}>Välj foton</Text>
            <Text style={styles.pickBtnHint}>Välj ett eller flera plagg – AI fyller i detaljerna & tar bort bakgrunden automatiskt</Text>
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
      <ScrollView contentContainerStyle={styles.scroll}>
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
                  <Text style={styles.cardLabel}>SÄSONG</Text>
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
            : <Text style={styles.saveButtonText}>{`Spara ${drafts.length} ${drafts.length === 1 ? 'plagg' : 'plagg'} 🍒`}</Text>
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

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: t.surfaceMuted, borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  progressText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },

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
  cardThumb: { width: 64, height: 80, backgroundColor: 'transparent' },
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
