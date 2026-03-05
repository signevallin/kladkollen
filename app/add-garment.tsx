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

const CATEGORIES = ['Toppar', 'Tröjor', 'Byxor', 'Kjolar', 'Klänningar', 'Kavajer', 'Ytterkläder', 'Skor', 'Väskor', 'Accessoarer']
const SEASONS = ['Vår', 'Sommar', 'Höst', 'Vinter', 'Alla årstider']
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
  name: string
  category: string
  color: string
  seasons: string[]
  analyzing: boolean
}

export default function AddGarment() {
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
      name: '',
      category: '',
      color: '',
      seasons: [],
      analyzing: true,
    }))
    setDrafts(newDrafts)
    setStep('review')

    // Analyze each photo sequentially
    for (const draft of newDrafts) {
      try {
        const res = await fetch('/api/analyze-garment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: draft.base64 }),
        })
        const data = await res.json()
        setDrafts(prev => prev.map(d =>
          d.id === draft.id
            ? { ...d, name: data.name || '', category: data.category || '', color: data.color || '', seasons: data.seasons || [], analyzing: false }
            : d
        ))
      } catch {
        setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, analyzing: false } : d))
      }
    }
  }

  function updateDraft(id: string, field: keyof GarmentDraft, value: any) {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d))
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

  async function uploadImage(uri: string) {
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
    const filePath = `public/${filename}`
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const { error } = await supabase.storage.from('garments').upload(filePath, uint8Array, { contentType: 'image/jpeg', upsert: true })
    if (error) throw error
    const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  async function saveAll() {
    const ready = drafts.filter(d => !d.analyzing)
    if (ready.some(d => !d.name || !d.category)) {
      Alert.alert('Fyll i namn och kategori för alla plagg')
      return
    }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')
      for (const draft of ready) {
        const imageUrl = draft.uri ? await uploadImage(draft.uri) : null
        await supabase.from('garments').insert([{
          user_id: user.id,
          name: draft.name,
          category: draft.category,
          color: draft.color,
          season: draft.seasons.join(', '),
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
            <Text style={styles.pickBtnHint}>Välj ett eller flera plagg – AI fyller i detaljerna</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── REVIEW STEP ────────────────────────────────────────────
  const readyCount = drafts.filter(d => !d.analyzing).length
  const totalCount = drafts.length

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('pick')}>
          <Text style={styles.backButtonText}>← Välj andra foton</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Granska plagg</Text>

        {readyCount < totalCount && (
          <View style={styles.progressRow}>
            <ActivityIndicator color="#C4737A" size="small" />
            <Text style={styles.progressText}>AI analyserar {readyCount}/{totalCount}...</Text>
          </View>
        )}

        {drafts.map((draft) => (
          <View key={draft.id} style={styles.card}>
            {/* Header: thumbnail + name + remove */}
            <View style={styles.cardHeader}>
              <Image source={{ uri: draft.uri }} style={styles.cardThumb} resizeMode="cover" />
              <View style={styles.cardNameWrap}>
                {draft.analyzing ? (
                  <View style={styles.analyzingRow}>
                    <ActivityIndicator color="#C4737A" size="small" />
                    <Text style={styles.analyzingText}>Analyserar...</Text>
                  </View>
                ) : (
                  <TextInput
                    style={styles.cardNameInput}
                    value={draft.name}
                    onChangeText={v => updateDraft(draft.id, 'name', v)}
                    placeholder="Namn på plagget"
                    placeholderTextColor="rgba(196,115,122,0.5)"
                  />
                )}
              </View>
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeDraft(draft.id)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {!draft.analyzing && (
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
              </>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, (saving || readyCount < totalCount) && styles.saveButtonDisabled]}
          onPress={saveAll}
          disabled={saving || readyCount < totalCount}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Sparar...' : `Spara ${drafts.length} ${drafts.length === 1 ? 'plagg' : 'plagg'} 🍒`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#150408' },
  scroll: { padding: 24, paddingBottom: 48 },
  backButton: { marginBottom: 16 },
  backButtonText: { color: '#C4737A', fontSize: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FBF3EF', marginBottom: 24 },

  pickBtn: {
    backgroundColor: 'rgba(122,24,40,0.4)',
    borderRadius: 20,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(196,115,122,0.3)',
    borderStyle: 'dashed',
  },
  pickBtnIcon: { fontSize: 48 },
  pickBtnTitle: { fontSize: 18, fontWeight: '600', color: '#FBF3EF' },
  pickBtnHint: { fontSize: 13, color: '#C4737A', textAlign: 'center', paddingHorizontal: 32 },

  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(122,24,40,0.2)', borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  progressText: { color: '#C4737A', fontSize: 14 },

  card: {
    backgroundColor: 'rgba(122,24,40,0.2)',
    borderRadius: 16, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)', gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardThumb: { width: 64, height: 80, borderRadius: 10 },
  cardNameWrap: { flex: 1 },
  cardNameInput: {
    backgroundColor: 'rgba(122,24,40,0.4)', borderRadius: 10,
    padding: 10, color: '#FBF3EF', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.25)',
  },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzingText: { color: '#C4737A', fontSize: 14, fontStyle: 'italic' },
  removeBtn: { padding: 6 },
  removeBtnText: { color: 'rgba(196,115,122,0.6)', fontSize: 18 },

  cardLabel: { color: 'rgba(196,115,122,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: 'rgba(122,24,40,0.3)',
    borderWidth: 1, borderColor: 'rgba(196,115,122,0.2)',
  },
  pillActive: { backgroundColor: '#9E2035', borderColor: '#9E2035' },
  pillText: { color: '#C4737A', fontSize: 12 },
  pillTextActive: { color: '#FBF3EF' },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorDotActive: { borderColor: '#FBF3EF', transform: [{ scale: 1.15 }] },
  colorCheck: {
    color: '#FBF3EF', fontSize: 13, fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },

  saveButton: { backgroundColor: '#9E2035', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FBF3EF', fontSize: 16, fontWeight: '600' },
})
