import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import { cacheGet, cacheSet } from '../../utils/cache'
import { partnerFeaturesEnabled, useEntitlements } from '../../utils/entitlements'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import BottomNav from '../../components/BottomNav'
import SignedImage from '../../components/SignedImage'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { toast } from '../../components/Toast'
import { supabase } from '../../supabase'
import { invalidateGarments } from '../../utils/garmentsStore'
import { apiPost } from '../../utils/api'
import { showAlert, showConfirm } from '../../utils/alert'
import { loadPartner } from '../../utils/household'
import { uploadUserImage } from '../../utils/storage'
import { pickImageSmart } from '../../utils/imagePicker'
import { useSettings } from '../../utils/settings'
import { localeFor } from '../../utils/i18n'

const SCREEN_WIDTH = Dimensions.get('window').width
const IMAGE_SIZE = (SCREEN_WIDTH - 48 - 8) / 3

export default function Inspiration() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tt, lang } = useSettings()
  const [activeTab, setActiveTab] = useState<'analys' | 'moodboard' | 'aterupptack'>('analys')

  // Återupptäck-state: dina minst använda plagg.
  const [rediscover, setRediscover] = useState<any[]>([])
  const [rediscoverLoaded, setRediscoverLoaded] = useState(false)

  async function loadRediscover() {
    const { data } = await supabase
      .from('garments')
      .select('id, name, category, image_url, times_worn')
      .is('person_id', null).eq('archived', false).eq('in_laundry', false).eq('for_sale', false)
      .order('times_worn', { ascending: true, nullsFirst: true })
      .limit(12)
    setRediscover(data || [])
    setRediscoverLoaded(true)
  }

  // Snabb väg att sälja ett plagg man inte längre vill ha, direkt från
  // Återupptäck. Flyttar det till säljlistan och tar bort det ur listan.
  function sellRediscover(g: any) {
    showConfirm(
      tt('Lägg i säljlistan'),
      tt('Vill du flytta plagget till säljlistan? Det tas då bort ur garderoben.'),
      async () => {
        const { error } = await supabase.from('garments').update({ for_sale: true }).eq('id', g.id)
        if (error) { showAlert(tt('Något gick fel'), error.message); return }
        invalidateGarments()
        setRediscover(prev => prev.filter(x => x.id !== g.id))
        toast(tt('Plagget ligger nu i säljlistan'))
      },
      tt('Lägg i säljlistan'),
    )
  }

  useEffect(() => {
    if (activeTab === 'aterupptack') loadRediscover()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // AI-analys state
  const [inspoImage, setInspoImage] = useState<string | null>(null)
  const [inspoBase64, setInspoBase64] = useState<string | null>(null)
  const [outfit, setOutfit] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [addedToWishlist, setAddedToWishlist] = useState<string[]>([])
  const [savedInspo, setSavedInspo] = useState(false)
  const [savingInspo, setSavingInspo] = useState(false)

  // Par-matchning (samboläge)
  // Seedas från cachen så matcha-knappen syns direkt vid flikbyte.
  const [partner, setPartner] = useState<{ id: string; name: string } | null>(() => cacheGet('household.partner') ?? null)
  // Par-matchningen krävde bara att en partner FANNS. Den syntes därför även i
  // singelläget och utan Partner-nivån – samma härledning som hemskärmen
  // använder (partnerModeOn) saknades här.
  const { tier } = useEntitlements()
  const lifeMode = cacheGet<string>('profile.lifeMode') ?? 'single'
  const partnerModeOn = (lifeMode === 'couple' || lifeMode === 'family') && partnerFeaturesEnabled(tier)
  const [myName, setMyName] = useState('Jag')
  const [myGender, setMyGender] = useState('')
  const [partnerGender, setPartnerGender] = useState('')
  const [coupleResult, setCoupleResult] = useState<any | null>(null)
  const [coupleLoading, setCoupleLoading] = useState(false)
  const [coupleSaving, setCoupleSaving] = useState(false)
  const [coupleSaved, setCoupleSaved] = useState(false)

  // Moodboard state
  const [moodboardImages, setMoodboardImages] = useState<any[]>(() => cacheGet('inspo.moodboard') ?? [])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploadingMoodboard, setUploadingMoodboard] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { partner: p } = await loadPartner()
      setPartner(p); cacheSet('household.partner', p)
      if (user) {
        const { data: me } = await supabase.from('profiles').select('name, gender').eq('id', user.id).single()
        if (me?.name) setMyName(me.name)
        if (me?.gender) setMyGender(me.gender)
      }
      if (p) {
        const { data: pg } = await supabase.from('profiles').select('gender').eq('id', p.id).single()
        if (pg?.gender) setPartnerGender(pg.gender)
      }
    })()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchMoodboard()
    }, [])
  )

  async function fetchMoodboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('moodboard')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) { setMoodboardImages(data); cacheSet('inspo.moodboard', data) }
  }

  async function pickMoodboardImage() {
    const result = await pickImageSmart({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 0.8,
    })
    if (!result.canceled) {
      setUploadingMoodboard(true)
      try {
        const uri = result.assets[0].uri
        const response = await fetch(uri)
        const arrayBuffer = await response.arrayBuffer()
        const publicUrl = await uploadUserImage(new Uint8Array(arrayBuffer), 'jpg', 'image/jpeg')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { error: dbError } = await supabase.from('moodboard').insert({
          user_id: user.id,
          image_url: publicUrl,
        })
        if (dbError) throw dbError
        fetchMoodboard()
      } catch (error: any) {
        showAlert(tt('Något gick fel'), error.message)
      } finally {
        setUploadingMoodboard(false)
      }
    }
  }

  // Bläddra till föregående/nästa moodboardbild i helskärmsläget (loopar runt).
  function stepImage(dir: 1 | -1) {
    if (!selectedImage || moodboardImages.length < 2) return
    const idx = moodboardImages.findIndex(i => i.image_url === selectedImage)
    if (idx === -1) return
    const next = (idx + dir + moodboardImages.length) % moodboardImages.length
    setSelectedImage(moodboardImages[next].image_url)
  }

  // Svepgest i helskärmsläget: dra åt vänster = nästa, höger = föregående.
  // Ref så att den (skapad en gång) alltid ser senaste stepImage.
  const stepRef = useRef(stepImage)
  stepRef.current = stepImage
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderRelease: (_, g) => {
      if (g.dx <= -40) stepRef.current(1)
      else if (g.dx >= 40) stepRef.current(-1)
    },
  })).current

  async function deleteMoodboardImage(id: string) {
    showConfirm(tt('Ta bort bild'), tt('Vill du ta bort bilden från moodboarden?'), async () => {
      await supabase.from('moodboard').delete().eq('id', id)
      setSelectedImage(null)
      fetchMoodboard()
    }, tt('Ta bort'), true)
  }

  async function pickInspoImage() {
    const result = await pickImageSmart({
      mediaTypes: ['images'] as any,
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    })
    if (!result.canceled) {
      setInspoImage(result.assets[0].uri)
      setInspoBase64(result.assets[0].base64 ?? null)
      setOutfit(null)
      setAddedToWishlist([])
      setSavedInspo(false)
    }
  }

  async function addToWishlist(itemName: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase
      .from('wishlist')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const { error } = await supabase.from('wishlist').insert({
      user_id: user.id,
      name: itemName,
      sort_order: count || 0,
    })
    if (error) {
      showAlert(tt('Något gick fel'), error.message)
    } else {
      setAddedToWishlist(prev => [...prev, itemName])
      showAlert(tt('Lagt till!'), `"${itemName}" ${tt('finns nu i din köplista.')}`)
    }
  }

  async function analyzeAndMatch() {
    if (!inspoBase64) {
      showAlert(tt('Välj en inspirationsbild först!'))
      return
    }
    setLoading(true)
    setOutfit(null)
    setAddedToWishlist([])
    try {
      const { data: currentGarments } = await supabase.from('garments').select('id, name, category, subcategory, color, season, archived, for_sale, image_url').is('person_id', null)
      const garments = (currentGarments || []).filter((g: any) => !g.archived && !g.for_sale)
      // Ta med typ + färg så AI:n kan matcha t.ex. "brun mockaväska" mot ett plagg
      // och inte felaktigt tro att det saknas.
      const garmentList = garments.map(g => {
        const meta = [g.subcategory || g.category, g.color].filter(Boolean).join(', ')
        return `- ${g.name}${meta ? ` (${meta})` : ''}`
      }).join('\n')
      const parsed = await apiPost('/api/analyze-inspo', { base64: inspoBase64, garmentList })
      const missingArray = Array.isArray(parsed.missing) ? parsed.missing.filter(Boolean) : (parsed.missing ? [parsed.missing] : [])
      // Matcha AI:ns plaggnamn mot rätt plagg – exakt först, sedan mest specifikt,
      // och aldrig samma plagg två gånger (samma robusta matchning som hemskärmen).
      const usedIds = new Set<string>()
      const findMatch = (name: string) => {
        const target = name.trim().toLowerCase()
        const free = (g: any) => !g.id || !usedIds.has(g.id)
        let m = garments.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
        if (!m) m = garments.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
        if (!m) m = garments.filter(g => free(g) && g.name && target.includes(g.name.toLowerCase())).sort((a: any, b: any) => b.name.length - a.name.length)[0]
        if (m?.id) usedIds.add(m.id)
        return m
      }
      const itemsWithImages = parsed.items.map((itemName: string) => {
        const match = findMatch(itemName)
        return { name: itemName, image_url: match?.image_url || null, id: match?.id || null, category: match?.category || null }
      })
      setOutfit({ ...parsed, missing: missingArray, itemsWithImages })
      setSavedInspo(false)
    } catch (error: any) {
      showAlert(tt('Något gick fel'), error.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveInspoOutfit() {
    if (!outfit) return
    setSavingInspo(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const garmentIds = outfit.itemsWithImages.map((i: any) => i.id).filter(Boolean)
      const garmentNames = outfit.itemsWithImages.map((i: any) => i.name)
      const imageUrls = outfit.itemsWithImages.map((i: any) => i.image_url).filter(Boolean)
      const { error } = await supabase.from('outfits').insert([{
        user_id: user?.id,
        name: outfit.outfitName,
        garment_ids: garmentIds,
        garment_names: garmentNames,
        image_urls: imageUrls,
      }])
      if (error) throw error
      setSavedInspo(true)
      showAlert(tt('Outfit sparad!'), tt('Du hittar den under Outfits.'))
    } catch (e: any) {
      showAlert(tt('Något gick fel'), e.message)
    } finally {
      setSavingInspo(false)
    }
  }

  // Matchar AI:ns plaggnamn mot rätt plagg i en given pool (för bilder).
  function matchItemsToPool(names: string[], pool: any[]) {
    const used = new Set<string>()
    const find = (name: string) => {
      const target = (name || '').trim().toLowerCase()
      const free = (g: any) => !g.id || !used.has(g.id)
      let m = pool.find(g => free(g) && (g.name || '').trim().toLowerCase() === target)
      if (!m) m = pool.find(g => free(g) && (g.name || '').toLowerCase().includes(target))
      if (!m) m = pool.filter(g => free(g) && g.name && target.includes(g.name.toLowerCase())).sort((a: any, b: any) => b.name.length - a.name.length)[0]
      if (m?.id) used.add(m.id)
      return m
    }
    return (names || []).map((n: string) => {
      const m = find(n)
      return { name: n, image_url: m?.image_url || null, id: m?.id || null, category: m?.category || null }
    })
  }

  function buildGarmentList(garments: any[]) {
    return garments.map(g => {
      const meta = [g.subcategory || g.category, g.color].filter(Boolean).join(', ')
      return `- ${g.name}${meta ? ` (${meta})` : ''}`
    }).join('\n')
  }

  async function analyzeCouple() {
    if (!inspoBase64) { showAlert(tt('Välj en inspirationsbild först!')); return }
    if (!partner || !partnerModeOn) return
    setCoupleLoading(true); setCoupleResult(null); setCoupleSaved(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [mine, theirs] = await Promise.all([
        supabase.from('garments').select('id, name, category, subcategory, color, archived, for_sale, image_url, person_id').eq('user_id', user!.id).is('person_id', null),
        supabase.rpc('partner_garments', { target: partner.id }),
      ])
      // Bara egna resp. partnerns EGNA plagg (person_id null) – aldrig barnens.
      const myG = (mine.data || []).filter((g: any) => !g.archived && !g.for_sale)
      const parG = (theirs.data || []).filter((g: any) => !g.archived && !g.for_sale && g.person_id == null)
      if (myG.length === 0 || parG.length === 0) {
        showAlert(tt('För få plagg'), tt('Ni behöver båda ha plagg i garderoben.'))
        return
      }
      const parsed = await apiPost('/api/analyze-inspo-couple', {
        base64: inspoBase64,
        nameA: myName, nameB: partner.name,
        genderA: myGender, genderB: partnerGender,
        listA: buildGarmentList(myG), listB: buildGarmentList(parG),
      })
      const results = (parsed.results || []).map((r: any, idx: number) => ({
        ...r,
        itemsWithImages: matchItemsToPool(r.items || [], idx === 0 ? myG : parG),
      }))
      setCoupleResult({ results })
    } catch (e: any) {
      showAlert(tt('Något gick fel'), e.message)
    } finally {
      setCoupleLoading(false)
    }
  }

  async function saveCouple() {
    if (!coupleResult || !partner) return
    setCoupleSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const mineR = coupleResult.results[0]
      const parR = coupleResult.results[1]
      if (mineR) {
        const { error } = await supabase.from('outfits').insert([{
          user_id: user!.id,
          name: mineR.outfitName,
          garment_ids: mineR.itemsWithImages.map((i: any) => i.id).filter(Boolean),
          garment_names: mineR.itemsWithImages.map((i: any) => i.name),
          image_urls: mineR.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
          saved: true,
        }])
        if (error) throw error
      }
      if (parR) {
        const { error } = await supabase.rpc('save_partner_outfit', {
          target: partner.id,
          p_name: parR.outfitName,
          p_garment_names: parR.itemsWithImages.map((i: any) => i.name),
          p_image_urls: parR.itemsWithImages.map((i: any) => i.image_url).filter(Boolean),
        })
        if (error) throw error
      }
      setCoupleSaved(true)
      showAlert(tt('Sparat!'), `${tt('Outfiten sparades hos både dig och')} ${partner.name}.`)
    } catch (e: any) {
      showAlert(tt('Något gick fel'), e.message)
    } finally {
      setCoupleSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Fullscreen image modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalClose} onPress={() => setSelectedImage(null)}>
            <Text style={styles.imageModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && (
            <>
              {moodboardImages.length > 1 && (
                <TouchableOpacity
                  style={[styles.imageModalArrow, styles.imageModalArrowLeft]}
                  onPress={() => stepImage(-1)}
                  accessibilityLabel={tt('Föregående bild')}
                  accessibilityRole="button"
                >
                  <Text style={styles.imageModalArrowText}>‹</Text>
                </TouchableOpacity>
              )}
              <View {...swipe.panHandlers}>
                <SignedImage
                  path={selectedImage}
                  style={styles.imageModalImage}
                  resizeMode="contain"
                />
              </View>
              {moodboardImages.length > 1 && (
                <TouchableOpacity
                  style={[styles.imageModalArrow, styles.imageModalArrowRight]}
                  onPress={() => stepImage(1)}
                  accessibilityLabel={tt('Nästa bild')}
                  accessibilityRole="button"
                >
                  <Text style={styles.imageModalArrowText}>›</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.imageModalDelete}
                onPress={() => {
                  const item = moodboardImages.find(i => i.image_url === selectedImage)
                  if (item) deleteMoodboardImage(item.id)
                }}
              >
                <Text style={styles.imageModalDeleteText}>{tt('Ta bort')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{tt('Inspiration')}</Text>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['analys', 'moodboard', 'aterupptack'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'analys' ? tt('AI-analys') : tab === 'moodboard' ? tt('Moodboard') : tt('Återupptäck')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI-ANALYS */}
        {activeTab === 'analys' && (
          <>
            <TouchableOpacity style={styles.uploadZone} onPress={pickInspoImage}>
              {inspoImage ? (
                <Image source={{ uri: inspoImage }} style={styles.inspoImage} resizeMode="contain" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Text style={styles.uploadText}>{tt('Ladda upp inspirationsbild')}</Text>
                  <Text style={styles.uploadSub}>{tt('Pinterest · Instagram · Kamera')}</Text>
                </View>
              )}
              {inspoImage && (
                <View style={styles.changeImageOverlay}>
                  <Text style={styles.changeImageText}>{tt('Byt bild')}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.analyzeButton, !inspoImage && styles.analyzeButtonDisabled]}
              onPress={analyzeAndMatch}
              disabled={loading || !inspoImage}
            >
              <Text style={styles.analyzeButtonText}>
                {loading ? tt('Analyserar...') : tt('Matcha mot min garderob')}
              </Text>
            </TouchableOpacity>

            {partner && partnerModeOn && (
              <TouchableOpacity
                style={[styles.coupleMatchBtn, (!inspoBase64 || coupleLoading) && styles.analyzeButtonDisabled]}
                onPress={analyzeCouple}
                disabled={coupleLoading || loading || !inspoBase64}
              >
                <Text style={styles.coupleMatchBtnText}>
                  {coupleLoading ? tt('Analyserar paret...') : `${tt('Matcha mot min och')} ${partner.name}${tt('s garderob')}`}
                </Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={t.textSecondary} />
                <Text style={styles.loadingText}>{tt('AI:n analyserar din bild...')}</Text>
              </View>
            )}

            {outfit && (
              <View style={styles.resultCard}>
                <View style={styles.styleSection}>
                  <Text style={styles.sectionLabel}>{tt('STILEN I BILDEN')}</Text>
                  <Text style={styles.styleDescription}>{outfit.styleDescription}</Text>
                </View>
                <Text style={styles.outfitName}>{outfit.outfitName}</Text>
                <View style={styles.outfitItems}>
                  {outfit.itemsWithImages.map((item: any, index: number) => (
                    <View key={index} style={styles.outfitItem}>
                      {item.image_url
                        ? <SignedImage path={item.image_url} style={styles.outfitItemImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                        : <View style={styles.outfitItemEmptyBox} />
                      }
                      <Text style={styles.outfitItemName}>{item.name}</Text>
                    </View>
                  ))}
                </View>
                {outfit.missing.length > 0 && (
                  <View style={styles.missingSection}>
                    <View style={styles.missingSectionHeader}>
                      <View>
                        <Text style={styles.missingTitle}>{tt('Du saknar i garderoben')}</Text>
                        <Text style={styles.missingSubtitle}>{tt('Lägg till i köplistan för att komplettera')}</Text>
                      </View>
                    </View>
                    {outfit.missing.map((missingItem: string, index: number) => {
                      const alreadyAdded = addedToWishlist.includes(missingItem)
                      return (
                        <View key={index} style={styles.missingItem}>
                          <View style={styles.missingItemLeft}>
                            <View style={styles.missingDot} />
                            <Text style={styles.missingItemName}>{missingItem}</Text>
                          </View>
                          <TouchableOpacity
                            style={[styles.addBtn, alreadyAdded && styles.addBtnDone]}
                            onPress={() => !alreadyAdded && addToWishlist(missingItem)}
                            disabled={alreadyAdded}
                          >
                            <Text style={[styles.addBtnText, alreadyAdded && styles.addBtnTextDone]}>
                              {alreadyAdded ? tt('✓ Tillagd') : tt('+ Köplista')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )
                    })}
                  </View>
                )}
                <View style={styles.tipCard}>
                  <Text style={styles.tipText}>{outfit.tip}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.saveInspoBtn, savedInspo && styles.saveInspoBtnDone]}
                  onPress={saveInspoOutfit}
                  disabled={savingInspo || savedInspo}
                >
                  <Text style={styles.saveInspoBtnText}>
                    {savingInspo ? '...' : savedInspo ? tt('✓ Sparad i outfits') : tt('Spara outfit')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Par-resultat (två personer, en per garderob) */}
            {coupleResult && (
              <View style={styles.resultCard}>
                {coupleResult.results.map((r: any, ri: number) => (
                  <View key={ri} style={styles.couplePerson}>
                    <Text style={styles.couplePersonName}>{r.person || (ri === 0 ? myName : partner?.name)}</Text>
                    {!!r.styleDescription && <Text style={styles.styleDescription}>{r.styleDescription}</Text>}
                    <Text style={styles.outfitName}>{r.outfitName}</Text>
                    <View style={styles.outfitItems}>
                      {r.itemsWithImages.map((item: any, index: number) => (
                        <View key={index} style={styles.outfitItem}>
                          {item.image_url
                            ? <SignedImage path={item.image_url} style={styles.outfitItemImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                            : <View style={styles.outfitItemEmptyBox} />}
                          <Text style={styles.outfitItemName}>{item.name}</Text>
                        </View>
                      ))}
                    </View>
                    {(r.missing || []).length > 0 && (
                      <Text style={styles.coupleMissing}>{tt('Saknas:')} {r.missing.join(', ')}</Text>
                    )}
                    {!!r.tip && <View style={styles.tipCard}><Text style={styles.tipText}>{r.tip}</Text></View>}
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.saveInspoBtn, coupleSaved && styles.saveInspoBtnDone]}
                  onPress={saveCouple}
                  disabled={coupleSaving || coupleSaved}
                >
                  <Text style={styles.saveInspoBtnText}>
                    {coupleSaving ? '...' : coupleSaved ? tt('✓ Sparad i båda konton') : tt('Spara båda outfits')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* MOODBOARD */}
        {activeTab === 'moodboard' && (
          <>
            <TouchableOpacity style={styles.moodboardUploadBtn} onPress={pickMoodboardImage} disabled={uploadingMoodboard}>
              {uploadingMoodboard
                ? <ActivityIndicator color={t.onPrimary} />
                : <Text style={styles.moodboardUploadBtnText}>{tt('＋ Lägg till bild')}</Text>
              }
            </TouchableOpacity>

            {moodboardImages.length === 0 ? (
              <View style={styles.moodboardEmpty}>
                <Text style={styles.moodboardEmptyText}>{tt('Din moodboard är tom')}</Text>
                <Text style={styles.moodboardEmptyHint}>{tt('Lägg till bilder som inspirerar dig')}</Text>
              </View>
            ) : (
              <View style={styles.moodboardGrid}>
                {moodboardImages.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.moodboardItem}
                    onPress={() => setSelectedImage(item.image_url)}
                    activeOpacity={0.85}
                  >
                    <SignedImage path={item.image_url} style={styles.moodboardImage} resizeMode="contain" transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'aterupptack' && (
          <>
            <Text style={styles.rediscoverIntro}>{tt('Kläder du sällan använder – ge dem nytt liv. Tryck på ett plagg så bygger Skrud en outfit runt det.')}</Text>
            {!rediscoverLoaded ? (
              <ActivityIndicator color={t.primary} style={{ marginTop: 32 }} />
            ) : rediscover.length === 0 ? (
              <Text style={styles.rediscoverEmpty}>{tt('Din garderob är tom än.')}</Text>
            ) : (
              <View style={styles.rediscoverGrid}>
                {rediscover.map(g => (
                  <TouchableOpacity key={g.id} style={styles.rediscoverItem} onPress={() => router.push(`/home?baseGarmentId=${g.id}`)}>
                    {g.image_url
                      ? <SignedImage path={g.image_url} style={styles.rediscoverImage} resizeMode="contain" transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                      : <View style={[styles.rediscoverImage, styles.outfitItemEmptyBox]} />}
                    <Text style={styles.rediscoverName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.rediscoverWorn}>
                      {(g.times_worn || 0) === 0
                        ? tt('Aldrig buren')
                        : `${tt('Buren')} ${g.times_worn} ${g.times_worn === 1 ? tt('gång') : tt('gånger')}`}
                    </Text>
                    {/* Vill man inte ha plagget kvar – flytta det till säljlistan direkt härifrån. */}
                    <TouchableOpacity
                      style={styles.rediscoverSellBtn}
                      onPress={() => sellRediscover(g)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${tt('Sälj')}: ${g.name}`}
                    >
                      <Text style={styles.rediscoverSellText}>{tt('Sälj')}</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 100 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 12 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  tabActive: { backgroundColor: t.primary, borderColor: t.primary },
  tabText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  tabTextActive: { color: t.onPrimary, fontWeight: '600' },

  uploadZone: { height: 280, borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', backgroundColor: t.surfaceMuted },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadIcon: { fontFamily: 'Lora_400Regular', fontSize: 40 },
  uploadText: { fontFamily: 'Lora_500Medium', fontSize: 16, color: t.textPrimary },
  uploadSub: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint },
  inspoImage: { width: '100%', height: '100%' },
  changeImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, alignItems: 'center' },
  changeImageText: { fontFamily: 'Lora_500Medium', color: t.onPrimary, fontSize: 13 },
  analyzeButton: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20 },
  analyzeButtonDisabled: { opacity: 0.4 },
  analyzeButtonText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  coupleMatchBtn: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border, marginTop: -8, marginBottom: 20 },
  coupleMatchBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  couplePerson: { gap: 12, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
  couplePersonName: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary },
  coupleMissing: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, fontStyle: 'italic' },
  loadingContainer: { alignItems: 'center', gap: 10, marginBottom: 20 },
  loadingText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14, fontStyle: 'italic' },
  resultCard: { backgroundColor: t.surfaceMuted, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: t.border, gap: 16 },
  styleSection: { backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 12 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 9, color: t.textSecondary, letterSpacing: 2, marginBottom: 4 },
  styleDescription: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textPrimary, lineHeight: 20 },
  outfitName: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: t.textPrimary },
  outfitItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outfitItem: { width: '22%', alignItems: 'center', gap: 4 },
  outfitItemImage: { width: 64, height: 64, borderRadius: 12 },
  outfitItemEmptyBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  outfitItemEmoji: { fontFamily: 'Lora_400Regular', fontSize: 28 },
  outfitItemName: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textSecondary, textAlign: 'center' },

  rediscoverIntro: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 16 },
  rediscoverEmpty: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, fontStyle: 'italic', marginTop: 4 },
  rediscoverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rediscoverItem: { width: '31%', alignItems: 'center' },
  rediscoverImage: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: t.surface },
  rediscoverName: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textPrimary, marginTop: 6, textAlign: 'center' },
  rediscoverWorn: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', marginTop: 2 },
  rediscoverSellBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: t.primary },
  rediscoverSellText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.onPrimary },
  missingSection: { backgroundColor: t.surfaceMuted, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.surfaceMuted, gap: 10 },
  missingSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  missingIcon: { fontFamily: 'Lora_400Regular', fontSize: 22, marginTop: 2 },
  missingTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  missingSubtitle: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.surfaceMuted, fontStyle: 'italic', marginTop: 2 },
  missingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 10 },
  missingItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  missingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.textSecondary },
  missingItemName: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, flex: 1 },
  addBtn: { backgroundColor: t.primary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  addBtnDone: { backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  addBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 12 },
  addBtnTextDone: { color: t.textSecondary },
  tipCard: { backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIcon: { fontFamily: 'Lora_400Regular', fontSize: 18 },
  tipText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20, flex: 1, fontStyle: 'italic' },
  saveInspoBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveInspoBtnDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border },
  saveInspoBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },

  moodboardUploadBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  moodboardUploadBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
  moodboardEmpty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  moodboardEmptyIcon: { fontFamily: 'Lora_400Regular', fontSize: 48 },
  moodboardEmptyText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 16 },
  moodboardEmptyHint: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 13, fontStyle: 'italic' },
  moodboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  moodboardItem: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: 8, overflow: 'hidden' },
  moodboardImage: { width: '100%', height: '100%' },

  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 56, right: 24, zIndex: 10, backgroundColor: t.surfaceMuted, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  imageModalCloseText: { fontFamily: 'Lora_400Regular', color: t.onPrimary, fontSize: 16 },
  imageModalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.5, maxHeight: '80%' },
  imageModalArrow: { position: 'absolute', top: '45%', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 26, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  imageModalArrowLeft: { left: 16 },
  imageModalArrowRight: { right: 16 },
  imageModalArrowText: { fontFamily: 'Lora_400Regular', color: '#fff', fontSize: 34, lineHeight: 38, marginTop: -4 },
  imageModalDelete: { position: 'absolute', bottom: 60, backgroundColor: 'rgba(64,45,33,0.8)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  imageModalDeleteText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
})