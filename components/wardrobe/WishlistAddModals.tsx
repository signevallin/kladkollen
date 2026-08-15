import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useState } from 'react'
import {
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import SignedImage from '../SignedImage'
import { supabase } from '../../supabase'
import { apiPost } from '../../utils/api'
import { showAlert } from '../../utils/alert'
import { parsePrice } from '../../utils/brands'
import { CATEGORIES as WISH_CATEGORIES, COLOR_OPTIONS, SEASONS as WISH_SEASONS, SUBCATEGORIES } from '../../utils/constants'
import { pickImageSmart } from '../../utils/imagePicker'
import { useSettings } from '../../utils/settings'
import { uploadUserImage } from '../../utils/storage'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'

// Hela flödet för att lägga till på köplistan: valrutan (foto/butik/URL), URL-
// hämtaren och det fullständiga formuläret. All wish-state bor här så att
// wardrobe.tsx slipper ~13 modal-states. Parent styr bara om valrutan syns och
// får ett `onAdded`-anrop när något sparats (för att uppdatera köplistan).
type Props = {
  chooserVisible: boolean
  onChooserClose: () => void
  wishlistCount: number
  onAdded: () => void
  /** Om satt: lägg köplisteposten på ett barn (person_id) i stället för mig. */
  person?: string | null
}

export default function WishlistAddModals({ chooserVisible, onChooserClose, wishlistCount, onAdded, person }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr, currency, toBaseSEK } = useSettings()

  const [showUrl, setShowUrl] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [color, setColor] = useState('')
  const [seasons, setSeasons] = useState<string[]>([])
  const [image, setImage] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [url, setUrl] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)

  function resetForm() {
    setShowForm(false)
    setName(''); setBrand(''); setPrice(''); setCategory(''); setSubcategory(''); setColor(''); setSeasons([]); setImage(null); setLink('')
  }

  async function pickImg() {
    const result = await pickImageSmart({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 })
    if (!result.canceled) setImage(result.assets[0].uri)
  }

  async function uploadImg(uri: string) {
    const response = await fetch(uri)
    const arrayBuffer = await response.arrayBuffer()
    return uploadUserImage(new Uint8Array(arrayBuffer), 'jpg', 'image/jpeg')
  }

  async function parseUrl() {
    const u = url.trim()
    if (!u) return
    setFetchingUrl(true)
    try {
      const data = await apiPost('/api/parse-url', { url: u })
      if (data.error) throw new Error(data.error)
      setName(data.name || '')
      setImage(data.imageUrl || null)
      setLink(u)
      setShowUrl(false)
      setUrl('')
      setShowForm(true)
    } catch (e: any) {
      // Kunde inte hämta automatiskt (långsam/bot-skyddad butik). Hamna inte i
      // en återvändsgränd – öppna manuella formuläret med länken sparad så
      // användaren kan fylla i namn/bild själv.
      setLink(u)
      setShowUrl(false)
      setUrl('')
      setShowForm(true)
      showAlert(tr('Kunde inte hämta länken automatiskt'), tr('Fyll i namn och bild manuellt – länken är sparad.'))
    } finally {
      setFetchingUrl(false)
    }
  }

  async function addItem() {
    if (!name.trim()) { showAlert(tr('Fyll i ett namn!')); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let imageUrl: string | null = null
      if (image) {
        try { imageUrl = await uploadImg(image) }
        catch { imageUrl = /^https?:\/\//.test(image) ? image : null }
      }
      const { error } = await supabase.from('wishlist').insert([{
        user_id: user.id,
        person_id: person || null,
        name: name.trim(),
        brand: brand.trim() || null,
        price: toBaseSEK(parsePrice(price)),
        category: category || null,
        subcategory: subcategory || null,
        color: color || null,
        season: seasons.join(', ') || null,
        image_url: imageUrl,
        url: link.trim() || null,
        sort_order: wishlistCount,
      }])
      if (error) throw error
      resetForm()
      onAdded()
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Köp: välj hur man lägger till */}
      <Modal visible={chooserVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tr('Lägg till på köplistan')}</Text>
              <TouchableOpacity onPress={onChooserClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.wishChoiceBtn} onPress={() => { onChooserClose(); resetForm(); setShowForm(true) }}>
              <Text style={styles.wishChoiceTitle}>{tr('Välj foto')}</Text>
              <Text style={styles.wishChoiceHint}>{tr('Ta eller välj en bild och fyll i detaljerna själv')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wishChoiceBtn} onPress={() => { onChooserClose(); router.push('/import-purchases?target=wishlist') }}>
              <Text style={styles.wishChoiceTitle}>{tr('Importera via butiker')}</Text>
              <Text style={styles.wishChoiceHint}>{tr('Bläddra i en butik och lägg köpta/önskade plagg på köplistan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wishChoiceBtn} onPress={() => { onChooserClose(); setShowUrl(true) }}>
              <Text style={styles.wishChoiceTitle}>{tr('Via URL')}</Text>
              <Text style={styles.wishChoiceHint}>{tr('Klistra in en produktlänk – namn och bild hämtas automatiskt')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Köp: lägg till via URL */}
      <Modal visible={showUrl} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tr('Lägg till via URL')}</Text>
              <TouchableOpacity onPress={() => { setShowUrl(false); setUrl('') }}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>{tr('Produktlänk')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://..."
              placeholderTextColor={t.placeholder}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity style={[styles.modalSaveBtn, (!url.trim() || fetchingUrl) && { opacity: 0.5 }]} onPress={parseUrl} disabled={!url.trim() || fetchingUrl}>
              <Text style={styles.modalSaveBtnText}>{fetchingUrl ? tr('Hämtar...') : tr('Hämta produkt')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullständigt formulär */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{tr('Lägg till på köplistan')}</Text>
              <TouchableOpacity onPress={resetForm} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel={tr('Stäng')} accessibilityRole="button">
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.imagePicker} onPress={pickImg}>
                {image ? (
                  <SignedImage path={image} style={styles.imagePickerPreview} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                ) : (
                  <View style={styles.imagePickerInner}>
                    <Text style={styles.imagePickerText}>{tr('Lägg till bild (valfritt)')}</Text>
                  </View>
                )}
                {image && <View style={styles.imageOverlay}><Text style={styles.imageOverlayText}>{tr('Byt foto')}</Text></View>}
              </TouchableOpacity>

              <Text style={styles.modalLabel}>{tr('Namn *')}</Text>
              <TextInput style={styles.modalInput} placeholder={tr('t.ex. Svart kappa')} placeholderTextColor={t.placeholder} value={name} onChangeText={setName} />

              <Text style={styles.modalLabel}>{tr('Märke')}</Text>
              <TextInput style={styles.modalInput} placeholder={tr('t.ex. Arket')} placeholderTextColor={t.placeholder} value={brand} onChangeText={setBrand} />

              <Text style={styles.modalLabel}>{tr('Kategori')}</Text>
              <View style={styles.pillsWrap}>
                {WISH_CATEGORIES.map(c => (
                  <TouchableOpacity key={c} style={[styles.pill, category === c && styles.pillActive]} onPress={() => { setCategory(category === c ? '' : c); setSubcategory('') }}>
                    <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{tr(c)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {category && SUBCATEGORIES[category] && (
                <>
                  <Text style={styles.modalLabel}>{tr('Typ')}</Text>
                  <View style={styles.pillsWrap}>
                    {SUBCATEGORIES[category].map(sub => (
                      <TouchableOpacity key={sub} style={[styles.pill, subcategory === sub && styles.pillActive]} onPress={() => setSubcategory(subcategory === sub ? '' : sub)}>
                        <Text style={[styles.pillText, subcategory === sub && styles.pillTextActive]}>{tr(sub)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.modalLabel}>{tr('Färg')}</Text>
              <View style={styles.wishSwatchGrid}>
                {COLOR_OPTIONS.map(c => (
                  <TouchableOpacity key={c.name} style={[styles.wishSwatch, { backgroundColor: c.hex }, color === c.name && styles.wishSwatchActive]} onPress={() => setColor(color === c.name ? '' : c.name)}>
                    {color === c.name && <Text style={styles.wishSwatchCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
              {color ? <Text style={styles.wishSwatchSelected}>{tr('Vald färg:')} {tr(color)}</Text> : null}

              <Text style={styles.modalLabel}>{tr('Säsong')}</Text>
              <View style={styles.pillsWrap}>
                {WISH_SEASONS.map(s => (
                  <TouchableOpacity key={s} style={[styles.pill, seasons.includes(s) && styles.pillActive]} onPress={() => setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
                    <Text style={[styles.pillText, seasons.includes(s) && styles.pillTextActive]}>{tr(s)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>{tr('Pris')} ({currency})</Text>
              <TextInput style={styles.modalInput} placeholder={tr('t.ex. 299')} placeholderTextColor={t.placeholder} value={price} onChangeText={setPrice} keyboardType="numeric" />

              <Text style={styles.modalLabel}>{tr('Produktlänk (valfritt)')}</Text>
              <TextInput style={styles.modalInput} placeholder="https://..." placeholderTextColor={t.placeholder} value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} keyboardType="url" />

              <TouchableOpacity style={styles.modalSaveBtn} onPress={addItem} disabled={saving}>
                <Text style={styles.modalSaveBtnText}>{saving ? tr('Sparar...') : tr('Lägg till')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: t.textPrimary },
  modalClose: { fontFamily: 'Lora_400Regular', fontSize: 18, color: t.textSecondary, padding: 4 },
  modalLabel: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 13, marginBottom: 8, marginTop: 12 },
  modalInput: { fontFamily: 'Lora_400Regular', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 4 },
  modalSaveBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  modalSaveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  wishChoiceBtn: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  wishChoiceTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 3 },
  wishChoiceHint: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 18 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  pillActive: { backgroundColor: t.primary, borderColor: t.primary },
  pillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  pillTextActive: { color: t.onPrimary },
  wishSwatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  wishSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  wishSwatchActive: { borderColor: t.primary, transform: [{ scale: 1.15 }] },
  wishSwatchCheck: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  wishSwatchSelected: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
  imagePicker: { borderRadius: 16, height: 160, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', marginBottom: 8, overflow: 'hidden', backgroundColor: t.surfaceMuted },
  imagePickerPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerInner: { alignItems: 'center', gap: 6 },
  imagePickerText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 13 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 6, alignItems: 'center' },
  imageOverlayText: { fontFamily: 'Lora_400Regular', color: t.onPrimary, fontSize: 12 },
})
