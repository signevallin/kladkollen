import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../supabase'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { showAlert } from '../utils/alert'
import SignedImage from './SignedImage'

// Capsule wardrobe – AI föreslår ett kompakt urval plagg och räknar hur många
// outfits de ger. Flyttad hit (under Inspiration) från garderoben.
export default function CapsuleView() {
  const t = useTheme()
  const styles = makeStyles(t)

  const [garments, setGarments] = useState<any[]>([])
  const [capsuleGenerated, setCapsuleGenerated] = useState(false)
  const [generatingCapsule, setGeneratingCapsule] = useState(false)
  const [capsuleSelected, setCapsuleSelected] = useState<Set<string>>(new Set())
  const [showOutfitList, setShowOutfitList] = useState(false)
  const [capsuleSaved, setCapsuleSaved] = useState(false)

  useFocusEffect(useCallback(() => { fetchGarments(); loadCapsule() }, []))

  async function fetchGarments() {
    const { data } = await supabase.from('garments').select('*').eq('archived', false)
    if (data) setGarments(data)
  }

  async function loadCapsule() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('capsule_garment_ids').eq('id', user.id).single()
    if (data?.capsule_garment_ids) {
      const ids = data.capsule_garment_ids.split(',').filter(Boolean)
      if (ids.length > 0) {
        setCapsuleSelected(new Set(ids))
        setCapsuleGenerated(true)
        setCapsuleSaved(true)
      }
    }
  }

  async function saveCapsule(ids: Set<string>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, capsule_garment_ids: [...ids].join(',') })
    setCapsuleSaved(true)
  }

  function generateCapsule() {
    if (garments.length === 0) { showAlert('Garderoben är tom', 'Lägg till plagg först!'); return }
    setGeneratingCapsule(true)

    const NEUTRAL_COLORS = ['Svart', 'Vit', 'Grå', 'Beige', 'Brun']
    const MAX_PER_CAT: Record<string, number> = {
      'Ytterkläder': 2, 'Kavajer': 1, 'Tröjor': 3, 'Toppar': 3,
      'Byxor': 2, 'Klänningar': 2, 'Kjolar': 1, 'Skor': 2,
      'Väskor': 1, 'Accessoarer': 2, 'Smycken': 2,
    }

    const scored = garments.map((g: any) => {
      let score = 0
      if (NEUTRAL_COLORS.includes(g.color)) score += 3
      score += Math.min((g.times_worn || 0) * 0.5, 5)
      if (!g.for_sale) score += 1
      return { ...g, score }
    })
    scored.sort((a: any, b: any) => b.score - a.score)

    const result: any[] = []
    const catCounts: Record<string, number> = {}
    for (const g of scored) {
      const max = MAX_PER_CAT[g.category] ?? 1
      const current = catCounts[g.category] ?? 0
      if (current < max && result.length < 15) {
        result.push(g)
        catCounts[g.category] = current + 1
      }
    }

    const selected = new Set(result.map((g: any) => g.id))
    setCapsuleSelected(selected)
    setCapsuleGenerated(true)
    setGeneratingCapsule(false)
    saveCapsule(selected)
  }

  function toggleCapsuleItem(id: string) {
    setCapsuleSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveCapsule(next)
      return next
    })
  }

  function calcOutfits(ids: Set<string>): number {
    return getOutfitCombinations(ids).length
  }

  function getOutfitCombinations(ids: Set<string>): any[][] {
    const sel = garments.filter((g: any) => ids.has(g.id))
    const tops = sel.filter((g: any) => ['Toppar', 'Tröjor', 'Kavajer'].includes(g.category))
    const bottoms = sel.filter((g: any) => ['Byxor', 'Kjolar', 'Shorts'].includes(g.category))
    const dresses = sel.filter((g: any) => g.category === 'Klänningar')
    const outers = sel.filter((g: any) => g.category === 'Ytterkläder')

    const combos: any[][] = []
    for (const top of tops) {
      for (const bottom of bottoms) {
        combos.push([top, bottom])
        for (const outer of outers) combos.push([top, bottom, outer])
      }
    }
    for (const dress of dresses) {
      combos.push([dress])
      for (const outer of outers) combos.push([dress, outer])
    }
    return combos
  }

  return (
    <View style={styles.capsuleScroll}>
      <View style={styles.capsuleHeroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.capsuleHeroTitle}>Capsule Wardrobe</Text>
          <Text style={styles.capsuleHeroStats}>
            {capsuleGenerated ? `${capsuleSelected.size} plagg valda` : `${garments.length} plagg i garderoben`}
          </Text>
          {capsuleSaved && capsuleGenerated && <Text style={styles.capsuleAutoSaved}>✓ Autosparad</Text>}
        </View>
      </View>

      {!capsuleGenerated ? (
        <TouchableOpacity
          style={[styles.capsuleGenerateBtn, generatingCapsule && styles.capsuleGenerateBtnLoading]}
          onPress={generateCapsule}
          disabled={generatingCapsule}
        >
          <Text style={styles.capsuleGenerateBtnText}>{generatingCapsule ? 'Analyserar...' : 'Skapa capsule'}</Text>
          <Text style={styles.capsuleGenerateBtnSub}>{generatingCapsule ? 'Väljer ut dina bästa plagg' : 'AI föreslår – du bestämmer'}</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.capsuleOutfitBanner}>
            <Text style={styles.capsuleOutfitNum}>{calcOutfits(capsuleSelected)}</Text>
            <Text style={styles.capsuleOutfitLabel}>möjliga outfits</Text>
          </View>

          <TouchableOpacity style={styles.capsuleOutfitToggle} onPress={() => setShowOutfitList(v => !v)}>
            <Text style={styles.capsuleOutfitToggleText}>
              {showOutfitList ? '▲ Dölj outfits' : `Se alla outfits (${calcOutfits(capsuleSelected)})`}
            </Text>
          </TouchableOpacity>

          {showOutfitList && (() => {
            const combos = getOutfitCombinations(capsuleSelected)
            const visible = combos.slice(0, 30)
            const rest = combos.length - visible.length
            return (
              <View style={styles.outfitListWrap}>
                {visible.map((outfit, i) => (
                  <View key={i} style={styles.outfitCard}>
                    <Text style={styles.outfitCardNum}>#{i + 1}</Text>
                    <View style={styles.outfitCardPieces}>
                      {outfit.map((piece: any, j: number) => (
                        <View key={j} style={styles.outfitPiece}>
                          {piece.image_url
                            ? <SignedImage path={piece.image_url} style={styles.outfitPieceImage} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                            : <View style={styles.outfitPieceEmpty} />}
                          <Text style={styles.outfitPieceName} numberOfLines={1}>{piece.name}</Text>
                          <Text style={styles.outfitPieceCat}>{piece.category}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                {rest > 0 && <Text style={styles.outfitListMore}>…och {rest} outfit{rest !== 1 ? 's' : ''} till</Text>}
              </View>
            )
          })()}

          <Text style={styles.capsuleSelectHint}>Tryck på ett plagg för att lägga till eller ta bort det ur din capsule</Text>

          <View style={styles.capsuleGrid}>
            {garments.map((item: any) => {
              const isSelected = capsuleSelected.has(item.id)
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.capsuleGridItem, isSelected && styles.capsuleGridItemSelected]}
                  onPress={() => toggleCapsuleItem(item.id)}
                  activeOpacity={0.7}
                >
                  {item.image_url
                    ? <SignedImage path={item.image_url} style={[styles.capsuleGridImage, !isSelected && styles.capsuleGridImageDim]} transform={{ width: 800, height: 800, resize: 'contain', format: 'origin' }} />
                    : <View style={[styles.capsuleGridImageEmpty, !isSelected && { opacity: 0.35 }]} />}
                  {isSelected && (
                    <View style={styles.capsuleCheckBadge}><Text style={styles.capsuleCheckText}>✓</Text></View>
                  )}
                  <Text style={[styles.capsuleGridName, !isSelected && styles.capsuleGridNameDim]} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.capsuleGridCat}>{item.category}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity
            style={styles.capsuleRegenBtn}
            onPress={() => { setCapsuleGenerated(false); setCapsuleSelected(new Set()); setCapsuleSaved(false); saveCapsule(new Set()) }}
          >
            <Text style={styles.capsuleRegenBtnText}>Börja om</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  capsuleScroll: { paddingBottom: 20 },
  capsuleHeroCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: t.border },
  capsuleHeroTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: t.textPrimary, marginBottom: 4 },
  capsuleHeroStats: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary },
  capsuleAutoSaved: { fontFamily: 'Lora_400Regular', fontSize: 10, color: t.textFaint, marginTop: 4 },
  capsuleGenerateBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: t.border },
  capsuleGenerateBtnLoading: { opacity: 0.7 },
  capsuleGenerateBtnText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 16, marginBottom: 2 },
  capsuleGenerateBtnSub: { fontFamily: 'Lora_400Regular', color: t.onPrimary, opacity: 0.7, fontSize: 11 },
  capsuleOutfitBanner: { backgroundColor: t.surfaceMuted, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: t.border },
  capsuleOutfitNum: { fontFamily: 'Poppins_700Bold', fontSize: 48, color: t.textPrimary, lineHeight: 54 },
  capsuleOutfitLabel: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, marginTop: 2 },
  capsuleOutfitToggle: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center', marginBottom: 12 },
  capsuleOutfitToggleText: { fontFamily: 'Poppins_600SemiBold', color: t.textSecondary, fontSize: 13 },
  outfitListWrap: { marginBottom: 16, gap: 8 },
  outfitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: t.border, gap: 10 },
  outfitCardNum: { fontFamily: 'Poppins_700Bold', fontSize: 11, color: t.textFaint, minWidth: 24, textAlign: 'center' },
  outfitCardPieces: { flex: 1, flexDirection: 'row', gap: 8 },
  outfitPiece: { flex: 1, alignItems: 'center' },
  outfitPieceImage: { width: '100%', height: 60, borderRadius: 8, resizeMode: 'contain', backgroundColor: 'transparent', marginBottom: 3 },
  outfitPieceEmpty: { width: '100%', height: 60, borderRadius: 8, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  outfitPieceName: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, textAlign: 'center' },
  outfitPieceCat: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center' },
  outfitListMore: { fontFamily: 'Lora_400Regular', color: t.textFaint, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  capsuleSelectHint: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textFaint, fontStyle: 'italic', textAlign: 'center', marginBottom: 12 },
  capsuleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  capsuleGridItem: { width: '30%', alignItems: 'center', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: t.border, position: 'relative' },
  capsuleGridItemSelected: { borderColor: t.primary, borderWidth: 2, backgroundColor: t.surface },
  capsuleGridImage: { width: '100%', height: 80, borderRadius: 10, marginBottom: 5, resizeMode: 'contain', backgroundColor: 'transparent' },
  capsuleGridImageDim: { opacity: 0.3 },
  capsuleGridImageEmpty: { width: '100%', height: 80, borderRadius: 10, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  capsuleGridName: { fontFamily: 'Lora_500Medium', fontSize: 11, color: t.textPrimary, textAlign: 'center' },
  capsuleGridNameDim: { opacity: 0.35 },
  capsuleGridCat: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, textAlign: 'center', marginTop: 1 },
  capsuleCheckBadge: { position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  capsuleCheckText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 11 },
  capsuleRegenBtn: { padding: 14, borderRadius: 14, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  capsuleRegenBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 14 },
})
