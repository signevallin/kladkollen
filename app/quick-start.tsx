import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { goBack } from '../utils/nav'
import { toast } from '../components/Toast'
import { showAlert } from '../utils/alert'
import { supabase } from '../supabase'
import { invalidateGarments } from '../utils/garmentsStore'
import { useSettings } from '../utils/settings'
import SignedImage from '../components/SignedImage'
import {
  basicsByCategory, basicImagePath, colorHex, type BasicGender, type BasicItem,
} from '../utils/basics'

// Snabbstart: bocka i basplaggen du äger (uppdelat på kvinna/man) så fylls
// garderoben på en gång – utan att fota. Varje val sparas som ett vanligt plagg
// med den AI-genererade basplaggsbilden.
export default function QuickStart() {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const [gender, setGender] = useState<BasicGender>('women')
  // Nyckel: `${gender}:${id}` → vald färg. Val bevaras när man byter kön.
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  // Om användaren själv inte hunnit trycka på köntabben förväljer vi den från
  // profilen (profiles.gender = 'Kvinna'/'Man'/…). Annat/tomt → behåll standard.
  const [genderTouched, setGenderTouched] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).maybeSingle()
        const g = data?.gender
        if (alive && !genderTouched && (g === 'Kvinna' || g === 'Man')) {
          setGender(g === 'Man' ? 'men' : 'women')
        }
      } catch { /* behåll standard */ }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sections = useMemo(() => basicsByCategory(gender), [gender])
  const selectedCount = Object.keys(selected).length

  function keyFor(item: BasicItem) { return `${gender}:${item.id}` }

  function toggle(item: BasicItem) {
    const k = keyFor(item)
    setSelected(prev => {
      const next = { ...prev }
      if (next[k]) delete next[k]
      else next[k] = item.colors[0]
      return next
    })
  }

  function pickColor(item: BasicItem, color: string) {
    const k = keyFor(item)
    setSelected(prev => ({ ...prev, [k]: color }))
  }

  function composeName(color: string, name: string) {
    const s = `${tr(color)} ${tr(name).toLowerCase()}`
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  async function saveSelected() {
    if (selectedCount === 0) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(tr('Inte inloggad'))
      // Bygg rader ur alla val (båda könen om man växlat fram och tillbaka).
      const rows = Object.entries(selected).map(([k, color]) => {
        const [g, id] = k.split(':') as [BasicGender, string]
        const item = basicsByCategory(g).flatMap(s => s.items).find(i => i.id === id)!
        return {
          user_id: user.id,
          name: composeName(color, item.name),
          category: item.category,
          subcategory: item.subcategory,
          color,
          season: item.season.join(', '),
          image_url: basicImagePath(g, item, color),
        }
      })
      const { error } = await supabase.from('garments').insert(rows)
      if (error) throw error
      invalidateGarments()
      const msg = (rows.length === 1 ? tr('{n} plagg tillagt!') : tr('{n} plagg tillagda!')).replace('{n}', String(rows.length))
      toast(msg, tr('Byt gärna till ett eget foto senare för din exakta garderob.'))
      goBack('/wardrobe')
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e?.message || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/wardrobe')}>
          <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tr('Snabbstart')}</Text>
        <Text style={styles.intro}>{tr('Bocka i basplaggen du redan äger så fyller vi garderoben direkt. Du kan byta färg, och lägga till ett eget foto när du vill.')}</Text>

        {/* Kön */}
        <View style={styles.genderRow}>
          {(['women', 'men'] as BasicGender[]).map(g => (
            <TouchableOpacity key={g} style={[styles.genderTab, gender === g && styles.genderTabActive]} onPress={() => { setGenderTouched(true); setGender(g) }}>
              <Text style={[styles.genderTabText, gender === g && styles.genderTabTextActive]}>
                {g === 'women' ? tr('Kvinna') : tr('Man')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {sections.map(section => (
          <View key={section.category} style={styles.section}>
            <Text style={styles.sectionTitle}>{tr(section.category)}</Text>
            <View style={styles.grid}>
              {section.items.map(item => {
                const k = keyFor(item)
                const chosen = selected[k]
                const on = !!chosen
                const color = chosen || item.colors[0]
                return (
                  <View key={item.id} style={styles.cardWrap}>
                    <TouchableOpacity
                      style={[styles.card, on && styles.cardOn]}
                      activeOpacity={0.8}
                      onPress={() => toggle(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`${composeName(color, item.name)}${on ? ' ✓' : ''}`}
                    >
                      {/* Färgad platshållare bakom – syns tills den riktiga bilden finns. */}
                      <View style={[styles.thumb, { backgroundColor: colorHex(color) }]}>
                        <SignedImage
                          path={basicImagePath(gender, item, color)}
                          style={styles.thumbImage}
                          transform={{ width: 500, height: 500, resize: 'contain', format: 'origin' }}
                        />
                      </View>
                      {on && (
                        <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.cardName} numberOfLines={1}>{tr(item.name)}</Text>
                    {/* Färgval (bara om fler än en) */}
                    {item.colors.length > 1 && (
                      <View style={styles.swatchRow}>
                        {item.colors.map(c => (
                          <TouchableOpacity
                            key={c}
                            style={[styles.swatch, { backgroundColor: colorHex(c) }, color === c && styles.swatchOn]}
                            onPress={() => pickColor(item, c)}
                            accessibilityLabel={tr(c)}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 90 }} />
      </ScrollView>

      {selectedCount > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveSelected} disabled={saving}>
            {saving
              ? <ActivityIndicator color={t.onPrimary} />
              : <Text style={styles.saveBtnText}>{`${tr('Lägg till')} ${selectedCount} ${tr('plagg')}`}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 24 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 8 },
  intro: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 20, marginBottom: 20 },

  genderRow: { flexDirection: 'row', backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 4, marginBottom: 20 },
  genderTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  genderTabActive: { backgroundColor: t.primary },
  genderTabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textSecondary },
  genderTabTextActive: { color: t.onPrimary },

  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1, color: t.textFaint, marginBottom: 12, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardWrap: { width: '30%', alignItems: 'center' },
  card: { width: '100%', aspectRatio: 0.85, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: t.primary },
  thumb: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  check: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontFamily: 'Poppins_700Bold', color: t.onPrimary, fontSize: 14 },
  cardName: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textPrimary, marginTop: 6, textAlign: 'center' },
  swatchRow: { flexDirection: 'row', gap: 6, marginTop: 6, justifyContent: 'center' },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: t.primary, transform: [{ scale: 1.15 }] },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 28, backgroundColor: t.bg, borderTopWidth: 1, borderTopColor: t.border },
  saveBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 16 },
})
