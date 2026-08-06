import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from './SignedImage'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useSettings } from '../utils/settings'
import { cacheGet, cacheSet } from '../utils/cache'
import { loadPartner, type Partner } from '../utils/household'
import { loadPeople, type Person } from '../utils/people'

// Personväljare för hushållet: en klickbar rubrik som öppnar en lista där man
// byter mellan sin egen, partnerns och (i garderoben) barnens vy. Byter vy på
// plats via router.setParams – tomma params = "Jag".
//
// scope 'wardrobe' visar Jag + partner + barn; 'outfits' visar bara Jag +
// partner (barn har inga egna outfits – outfits hör till konton, inte personer).
type Props = {
  scope: 'wardrobe' | 'outfits'
  // Vald person just nu, härledd av föräldern ur sina params.
  current: { kind: 'me' | 'partner' | 'child'; id?: string }
  // Rubriken som visas när "Jag" är vald (t.ex. "Min garderob" / "Mina outfits").
  meLabel: string
}

export default function PersonSwitcher({ scope, current, meLabel }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()

  const [partner, setPartner] = useState<Partner | null>(() => cacheGet<Partner | null>('household.partner') ?? null)
  const [children, setChildren] = useState<Person[]>(() => cacheGet<Person[]>('household.children') ?? [])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadPartner().then(({ partner }) => { setPartner(partner); cacheSet('household.partner', partner) }).catch(() => {})
    loadPeople().then(ppl => {
      const kids = ppl.filter(p => p.type === 'child')
      setChildren(kids); cacheSet('household.children', kids)
    }).catch(() => {})
  }, [])

  type Member = { key: string; label: string; avatar: string | null; icon: any; select: () => void; active: boolean }

  const members: Member[] = []
  members.push({
    key: 'me',
    label: tr('Jag'),
    avatar: null,
    icon: 'person',
    active: current.kind === 'me',
    select: () => router.setParams({ person: '', personName: '', partner: '', partnerName: '' }),
  })
  if (partner) {
    members.push({
      key: `partner:${partner.id}`,
      label: partner.name,
      avatar: partner.avatar_url,
      icon: 'person',
      active: current.kind === 'partner' && current.id === partner.id,
      select: () => router.setParams({ partner: partner.id, partnerName: partner.name, person: '', personName: '' }),
    })
  }
  if (scope === 'wardrobe') {
    children.forEach(c => members.push({
      key: `child:${c.id}`,
      label: c.name,
      avatar: c.avatar_url,
      icon: 'child-care',
      active: current.kind === 'child' && current.id === c.id,
      select: () => router.setParams({ person: c.id, personName: c.name, partner: '', partnerName: '' }),
    }))
  }

  // Ingen att växla mellan (ensam användare, inget hushåll) → visa bara rubriken.
  const hasChoices = members.length > 1
  // Triggern visar meLabel ("Min garderob"/"Mina outfits") för mig själv,
  // annars personens namn. Listan visar alltid "Jag" för mig.
  const currentLabel = current.kind === 'me' ? meLabel : (members.find(m => m.active)?.label || meLabel)

  if (!hasChoices) {
    return <Text style={styles.plainTitle} numberOfLines={1}>{meLabel}</Text>
  }

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={tr('Byt person')}
      >
        <Text style={styles.triggerText} numberOfLines={1}>{currentLabel}</Text>
        <MaterialIcons name="expand-more" size={22} color={t.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{tr('Byt person')}</Text>
            {members.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.row, m.active && styles.rowActive]}
                onPress={() => { setOpen(false); if (!m.active) m.select() }}
              >
                {m.avatar
                  ? <SignedImage path={m.avatar} style={styles.avatar} resizeMode="cover" transform={{ width: 96, height: 96, resize: 'cover' }} />
                  : <View style={styles.avatarPlaceholder}><MaterialIcons name={m.icon} size={20} color={t.textSecondary} /></View>}
                <Text style={[styles.rowLabel, m.active && styles.rowLabelActive]} numberOfLines={1}>{m.label}</Text>
                {m.active && <MaterialIcons name="check" size={20} color={t.primary} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  plainTitle: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  triggerText: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: 120, paddingHorizontal: 24 },
  sheet: { backgroundColor: t.surface, borderRadius: 22, padding: 12, borderWidth: 1, borderColor: t.border },
  sheetTitle: { fontFamily: 'Poppins_700Bold', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: t.textSecondary, marginHorizontal: 8, marginTop: 4, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  rowActive: { backgroundColor: t.surfaceMuted },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  rowLabel: { flex: 1, fontFamily: 'Lora_500Medium', fontSize: 16, color: t.textPrimary },
  rowLabelActive: { fontFamily: 'Poppins_600SemiBold' },
})
