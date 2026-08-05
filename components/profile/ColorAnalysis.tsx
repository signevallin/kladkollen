import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../supabase'
import { apiPost } from '../../utils/api'
import { showAlert } from '../../utils/alert'
import { pickImageSmart } from '../../utils/imagePicker'
import { useSettings } from '../../utils/settings'
import { useTheme } from '../../theme/ThemeProvider'
import type { Theme } from '../../theme/theme'
import type { Json } from '../../types/models'

// Färganalysen (färgprofil) – ett självständigt block som bröts ut ur
// profile.tsx. Laddar sin egen data, äger all input-/resultat-state och
// sparar resultatet. Meddelar parent via onAnalyzed så profilraden kan visa
// "Klar".
interface ColorItem { hex: string; namn: string; motivering?: string }
interface ColorAnalysisData {
  biologisk: {
    undertone: string; varde: string; intensitet: string; kontrast: string
    hudreaktion: string; svartVitt: string
  }
  palett: { bas: ColorItem[]; kompletterande: ColorItem[]; accent: ColorItem[]; undvik: ColorItem[] }
  strategi: Record<string, { text: string; farger: string[] }>
  sasong: { sommar: string; vinter: string }
  sammanfattning: string[]
  garderobsAlgoritm: string
}

const STRATEGY_LABELS: Record<string, { label: string; emoji: string }> = {
  auktoritet:      { label: 'Auktoritet',      emoji: '' },
  tillganglighet:  { label: 'Tillgänglighet',  emoji: '' },
  kreativitet:     { label: 'Kreativitet',      emoji: '' },
  professionalism: { label: 'Professionalism',  emoji: '' },
}

type Props = { onAnalyzed?: () => void }

export default function ColorAnalysis({ onAnalyzed }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const [colorAnalysis, setColorAnalysis] = useState<ColorAnalysisData | null>(null)
  const [analyzingColor, setAnalyzingColor] = useState(false)
  const [colorSection, setColorSection] = useState<'bio' | 'palett' | 'strategi' | 'sasong'>('bio')
  const [inputMode, setInputMode] = useState<'image' | 'form'>('image')
  const [colorImage, setColorImage] = useState<string | null>(null)
  const [colorBase64, setColorBase64] = useState<string | null>(null)
  const [skinTone, setSkinTone] = useState('')
  const [skinUndertone, setSkinUndertone] = useState('')
  const [hairColor, setHairColor] = useState('')
  const [eyeColor, setEyeColor] = useState('')
  const [contrastLevel, setContrastLevel] = useState('')

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Färgprofilen lagras som JSON i kolumnen color_analysis. (Formulärets
      // enskilda fält är bara indata till analysen – de har ingen egen kolumn.)
      const { data } = await supabase.from('profiles')
        .select('color_analysis')
        .eq('id', user.id).single()
      if (!data) return
      if (data.color_analysis) setColorAnalysis(data.color_analysis as unknown as ColorAnalysisData)
    })()
  }, [])

  async function pickColorImage() {
    const result = await pickImageSmart({ mediaTypes: ['images'] as any, allowsEditing: true, base64: true, quality: 0.7 })
    if (!result.canceled) {
      setColorImage(result.assets[0].uri)
      setColorBase64(result.assets[0].base64 || null)
    }
  }

  async function analyzeColor() {
    if (inputMode === 'image' && !colorBase64) {
      showAlert(tr('Ladda upp en bild för att analysera din färgprofil')); return
    }
    if (inputMode === 'form' && (!skinTone || !skinUndertone || !hairColor || !eyeColor || !contrastLevel)) {
      showAlert(tr('Fyll i alla fält för att analysera din färgprofil')); return
    }
    setAnalyzingColor(true)
    try {
      const parsed: ColorAnalysisData = inputMode === 'image'
        ? await apiPost('/api/analyze-color', { base64: colorBase64 })
        : await apiPost('/api/analyze-color-form', { skinTone, skinUndertone, hairColor, eyeColor, contrastLevel })
      setColorAnalysis(parsed)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          color_analysis: parsed as unknown as Json,
        }).eq('id', user.id)
      }
      onAnalyzed?.()
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
    } finally {
      setAnalyzingColor(false)
    }
  }

  const formIncomplete = !skinTone || !skinUndertone || !hairColor || !eyeColor || !contrastLevel
  const disabled = inputMode === 'image' ? !colorBase64 : formIncomplete

  return (
    <View>
      <Text style={styles.hint}>
        {colorAnalysis ? tr('Din personliga färgprofil.') : tr('Ladda upp en bild eller fyll i formuläret.')}
      </Text>
      <View style={styles.inputModeRow}>
        {(['image', 'form'] as const).map(mode => (
          <TouchableOpacity key={mode} style={[styles.inputModeBtn, inputMode === mode && styles.inputModeBtnActive]} onPress={() => setInputMode(mode)}>
            <Text style={[styles.inputModeBtnText, inputMode === mode && styles.inputModeBtnTextActive]}>
              {mode === 'image' ? tr('Ladda upp bild') : tr('Fyll i formulär')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {inputMode === 'image' && (
        <TouchableOpacity style={styles.colorUploadZone} onPress={pickColorImage}>
          {colorImage
            ? <Image source={{ uri: colorImage }} style={styles.colorUploadPreview} resizeMode="cover" />
            : <>
                <Text style={styles.colorUploadText}>{tr('Tryck för att välja bild')}</Text>
                <Text style={styles.colorUploadHint}>{tr('Helst ett foto i naturligt ljus')}</Text>
              </>
          }
        </TouchableOpacity>
      )}

      {inputMode === 'form' && (
        <View>
          {[
            { label: 'Hudton', value: skinTone, set: setSkinTone, options: ['Ljus', 'Ljus-medium', 'Medium', 'Medium-mörk', 'Mörk'] },
            { label: 'Undertone', value: skinUndertone, set: setSkinUndertone, options: ['Varm', 'Neutral-varm', 'Neutral', 'Neutral-kall', 'Kall'] },
            { label: 'Hårfärg', value: hairColor, set: setHairColor, options: ['Svart', 'Mörkbrun', 'Mellanbrun', 'Ljusbrun', 'Blond', 'Röd/Auburn', 'Grå/Silver'] },
            { label: 'Ögonfärg', value: eyeColor, set: setEyeColor, options: ['Mörkbrun', 'Mellanbrun', 'Hasselnöt', 'Grön', 'Blå', 'Grå'] },
            { label: 'Kontrast (hud vs hår)', value: contrastLevel, set: setContrastLevel, options: ['Låg', 'Medel', 'Hög'] },
          ].map(field => (
            <View key={field.label} style={styles.colorFormGroup}>
              <Text style={styles.colorFormLabel}>{tr(field.label)}</Text>
              <View style={styles.colorFormPills}>
                {field.options.map(opt => (
                  <TouchableOpacity key={opt} style={[styles.colorFormPill, field.value === opt && styles.colorFormPillActive]} onPress={() => field.set(opt)}>
                    <Text style={[styles.colorFormPillText, field.value === opt && styles.colorFormPillTextActive]}>{tr(opt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.analyzeBtn, disabled && styles.analyzeBtnDisabled]} onPress={analyzeColor} disabled={analyzingColor || disabled}>
        {analyzingColor
          ? <><ActivityIndicator color={t.onPrimary} size="small" /><Text style={styles.analyzeBtnText}> {tr('Analyserar...')}</Text></>
          : <Text style={styles.analyzeBtnText}>{colorAnalysis ? tr('Analysera igen') : tr('Analysera färgprofil')}</Text>
        }
      </TouchableOpacity>

      {colorAnalysis && (
        <View style={styles.colorResults}>
          <View style={styles.bioChips}>
            {[
              { label: tr('Undertone'), value: colorAnalysis.biologisk.undertone },
              { label: tr('Värde'),     value: colorAnalysis.biologisk.varde },
              { label: tr('Intensitet'),value: colorAnalysis.biologisk.intensitet },
              { label: tr('Kontrast'),  value: colorAnalysis.biologisk.kontrast },
            ].map(chip => (
              <View key={chip.label} style={styles.bioChip}>
                <Text style={styles.bioChipLabel}>{chip.label.toUpperCase()}</Text>
                <Text style={styles.bioChipValue}>{chip.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.colorTabRow}>
            {(['bio', 'palett', 'strategi', 'sasong'] as const).map(tab => (
              <TouchableOpacity key={tab} style={[styles.colorTab, colorSection === tab && styles.colorTabActive]} onPress={() => setColorSection(tab)}>
                <Text style={[styles.colorTabText, colorSection === tab && styles.colorTabTextActive]}>
                  {tab === 'bio' ? tr('Analys') : tab === 'palett' ? tr('Palett') : tab === 'strategi' ? tr('Stil') : tr('Säsong')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {colorSection === 'bio' && (
            <View style={styles.tabContent}>
              <View style={styles.bioCard}>
                <Text style={styles.bioCardTitle}>{tr('Hudreaktion')}</Text>
                <Text style={styles.bioCardText}>{colorAnalysis.biologisk.hudreaktion}</Text>
              </View>
              <View style={styles.bioCard}>
                <Text style={styles.bioCardTitle}>{tr('Svart & kritvitt')}</Text>
                <Text style={styles.bioCardText}>{colorAnalysis.biologisk.svartVitt}</Text>
              </View>
              {colorAnalysis.sammanfattning.length > 0 && (
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>{tr('Sammanfattning')}</Text>
                  {colorAnalysis.sammanfattning.map((punkt, i) => (
                    <View key={i} style={styles.summaryRow}>
                      <View style={styles.summaryDot} />
                      <Text style={styles.summaryText}>{punkt}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {colorSection === 'palett' && (
            <View style={styles.tabContent}>
              {([
                { key: 'bas',            label: tr('Basfärger'),          items: colorAnalysis.palett.bas },
                { key: 'kompletterande', label: tr('Kompletterande'),      items: colorAnalysis.palett.kompletterande },
                { key: 'accent',         label: tr('Accenter'),            items: colorAnalysis.palett.accent },
                { key: 'undvik',         label: tr('Undvik nära ansiktet'),items: colorAnalysis.palett.undvik },
              ] as { key: string; label: string; items: ColorItem[] }[]).map(group => (
                <View key={group.key} style={styles.paletteGroup}>
                  <Text style={styles.paletteGroupLabel}>
                    {group.key === 'undvik' ? '' : '✓ '}{group.label}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.swatchRow}>
                      {group.items.map((item, i) => (
                        <View key={i} style={styles.swatchWrap}>
                          <View style={[styles.swatch, { backgroundColor: item.hex }, group.key === 'undvik' && styles.swatchAvoid]}>
                            {group.key === 'undvik' && <Text style={styles.swatchX}>✕</Text>}
                          </View>
                          <Text style={styles.swatchHex}>{item.hex}</Text>
                          <Text style={styles.swatchName} numberOfLines={1}>{item.namn}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ))}
            </View>
          )}

          {colorSection === 'strategi' && (
            <View style={styles.tabContent}>
              {Object.entries(colorAnalysis.strategi).map(([key, val]) => {
                const meta = STRATEGY_LABELS[key] || { label: key, emoji: '' }
                return (
                  <View key={key} style={styles.strategiCard}>
                    <View style={styles.strategiHeader}>
                      <Text style={styles.strategiEmoji}>{meta.emoji}</Text>
                      <Text style={styles.strategiLabel}>{tr(meta.label)}</Text>
                      <View style={styles.strategiSwatches}>
                        {val.farger.slice(0, 4).map((hex, i) => (
                          <View key={i} style={[styles.strategiSwatch, { backgroundColor: hex }]} />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.strategiText}>{val.text}</Text>
                  </View>
                )
              })}
            </View>
          )}

          {colorSection === 'sasong' && (
            <View style={styles.tabContent}>
              <View style={styles.sasongsCard}>
                <Text style={styles.sasongsTitle}>{tr('Sommar')}</Text>
                <Text style={styles.sasongsText}>{colorAnalysis.sasong.sommar}</Text>
              </View>
              <View style={styles.sasongsCard}>
                <Text style={styles.sasongsTitle}>{tr('Vinter')}</Text>
                <Text style={styles.sasongsText}>{colorAnalysis.sasong.vinter}</Text>
              </View>
              {colorAnalysis.garderobsAlgoritm && (
                <View style={styles.algoritmCard}>
                  <Text style={styles.algoritmTitle}>{tr('Garderobsalgoritm')}</Text>
                  <Text style={styles.algoritmText}>{colorAnalysis.garderobsAlgoritm}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  hint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, fontStyle: 'italic', marginBottom: 10, marginTop: 4 },
  inputModeRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 16 },
  inputModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  inputModeBtnActive: { backgroundColor: t.primary, borderColor: t.primary },
  inputModeBtnText: { fontFamily: 'Lora_500Medium', color: t.textSecondary, fontSize: 13 },
  inputModeBtnTextActive: { color: t.onPrimary, fontWeight: '700' },
  colorUploadZone: { borderRadius: 16, borderWidth: 1.5, borderColor: t.border, borderStyle: 'dashed', height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden', backgroundColor: t.surface },
  colorUploadPreview: { width: '100%', height: '100%' },
  colorUploadText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 14 },
  colorUploadHint: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 11, marginTop: 4 },
  colorFormGroup: { marginBottom: 12 },
  colorFormLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
  colorFormPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  colorFormPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  colorFormPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  colorFormPillText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 12 },
  colorFormPillTextActive: { color: t.onPrimary, fontWeight: '600' },
  analyzeBtn: { backgroundColor: t.primary, borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  analyzeBtnDisabled: { opacity: 0.4 },
  analyzeBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  colorResults: { gap: 14 },
  bioChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bioChip: { backgroundColor: t.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: t.border, minWidth: '45%', flex: 1 },
  bioChipLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: t.textSecondary, letterSpacing: 1.5, marginBottom: 2 },
  bioChipValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, textTransform: 'capitalize' },
  colorTabRow: { flexDirection: 'row', gap: 6 },
  colorTab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  colorTabActive: { backgroundColor: t.primary, borderColor: t.primary },
  colorTabText: { fontFamily: 'Lora_500Medium', fontSize: 12, color: t.textSecondary },
  colorTabTextActive: { color: t.onPrimary, fontWeight: '700' },
  tabContent: { gap: 12 },
  bioCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: t.border },
  bioCardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
  bioCardText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 20 },
  summaryCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  summaryTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginBottom: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  summaryDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: t.textSecondary, marginTop: 7, flexShrink: 0 },
  summaryText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textPrimary, lineHeight: 20, flex: 1 },
  paletteGroup: { gap: 8 },
  paletteGroupLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5 },
  swatchRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  swatchWrap: { alignItems: 'center', gap: 4, width: 56 },
  swatch: { width: 48, height: 48, borderRadius: 12 },
  swatchAvoid: { opacity: 0.7 },
  swatchX: { fontFamily: 'Poppins_700Bold', position: 'absolute', color: 'rgba(255,255,255,0.9)', fontSize: 18, textAlign: 'center', lineHeight: 48, width: 48 },
  swatchHex: { fontSize: 9, color: t.textSecondary, fontFamily: 'monospace' },
  swatchName: { fontFamily: 'Lora_400Regular', fontSize: 9, color: t.textFaint, textAlign: 'center', width: 56 },
  strategiCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  strategiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  strategiEmoji: { fontFamily: 'Lora_400Regular', fontSize: 18 },
  strategiLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, flex: 1 },
  strategiSwatches: { flexDirection: 'row', gap: 4 },
  strategiSwatch: { width: 20, height: 20, borderRadius: 10 },
  strategiText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },
  sasongsCard: { backgroundColor: t.surface, borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: t.border },
  sasongsTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary },
  sasongsText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 20 },
  algoritmCard: { backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: t.border },
  algoritmTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textSecondary },
  algoritmText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, lineHeight: 18, fontStyle: 'italic' },
})
