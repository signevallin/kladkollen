import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import SignedImage from './SignedImage'
import { supabase } from '../supabase'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useSettings } from '../utils/settings'
import { cacheGet, cacheSet } from '../utils/cache'
import { useEntitlements } from '../utils/entitlements'
import { tierAtLeast } from '../utils/purchases'
import { loadPartner, type Partner } from '../utils/household'
import { loadPeople, type Person } from '../utils/people'

// Personväljare för hushållet: en klickbar rubrik som öppnar en lista där man
// byter mellan sin egen, partnerns och (i garderoben) barnens vy. Byter vy på
// plats via router.setParams – tomma params = "Jag".
//
// scope 'wardrobe' och 'outfits' visar båda Jag + partner + barn. Barn har egna
// (av föräldern genererade) outfits via "Familjen idag" som kan visas i läsläge.
type Props = {
  scope: 'wardrobe' | 'outfits'
  // Vald person just nu, härledd av föräldern ur sina params.
  current: { kind: 'me' | 'partner' | 'child'; id?: string }
}

// Kompakt avatar-knapp (samma storlek som övriga header-ikoner) som öppnar en
// lista där man byter person. Rubriken visar föräldern själv – väljaren tar
// bara plats som en liten rund knapp, så titeln aldrig trängs undan.
export default function PersonSwitcher({ scope, current }: Props) {
  const t = useTheme()
  const styles = makeStyles(t)
  const { t: tr } = useSettings()
  const { tier } = useEntitlements()
  // Partner ligger bakom partnerläget, barn bakom familjeläget. Utan nivåerna
  // visas bara Jag (resp. Jag + partner).
  const partnerOn = tierAtLeast(tier, 'partner')
  const familyOn = tierAtLeast(tier, 'family')

  const [partner, setPartner] = useState<Partner | null>(() => cacheGet<Partner | null>('household.partner') ?? null)
  const [children, setChildren] = useState<Person[]>(() => cacheGet<Person[]>('household.children') ?? [])
  // Min egen profilbild (seedas ur hemskärmens cache så "Jag" får rätt avatar direkt).
  const [myAvatar, setMyAvatar] = useState<string | null>(() => cacheGet<string | null>('home.userAvatar') ?? null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadPartner().then(({ partner }) => { setPartner(partner); cacheSet('household.partner', partner) }).catch(() => {})
    loadPeople().then(ppl => {
      const kids = ppl.filter(p => p.type === 'child')
      setChildren(kids); cacheSet('household.children', kids)
    }).catch(() => {})
    // Hämta min egen avatar så "Jag"-raden visar profilbilden i stället för en ikon.
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single()
      if (data?.avatar_url) { setMyAvatar(data.avatar_url); cacheSet('home.userAvatar', data.avatar_url) }
    })().catch(() => {})
  }, [])

  // Slås nivån av medan man tittar på partner/barn: växla tillbaka till Jag,
  // annars kan vyn fastna (t.ex. utan andra val försvinner väljaren helt).
  useEffect(() => {
    if ((!familyOn && current.kind === 'child') || (!partnerOn && current.kind === 'partner')) {
      router.setParams({ person: '', personName: '', partner: '', partnerName: '' })
    }
  }, [familyOn, partnerOn, current.kind])

  type Member = { key: string; label: string; avatar: string | null; icon: any; select: () => void; active: boolean }

  const members: Member[] = []
  members.push({
    key: 'me',
    label: tr('Jag'),
    avatar: myAvatar,
    icon: 'person',
    active: current.kind === 'me',
    select: () => router.setParams({ person: '', personName: '', partner: '', partnerName: '' }),
  })
  if (partner && partnerOn) {
    members.push({
      key: `partner:${partner.id}`,
      label: partner.name,
      avatar: partner.avatar_url,
      icon: 'person',
      active: current.kind === 'partner' && current.id === partner.id,
      select: () => router.setParams({ partner: partner.id, partnerName: partner.name, person: '', personName: '' }),
    })
  }
  if (familyOn) children.forEach(c => members.push({
    key: `child:${c.id}`,
    label: c.name,
    avatar: c.avatar_url,
    icon: 'child-care',
    active: current.kind === 'child' && current.id === c.id,
    select: () => router.setParams({ person: c.id, personName: c.name, partner: '', partnerName: '' }),
  }))

  // Ingen att växla mellan (ensam användare, inget hushåll) → visa ingen knapp.
  const hasChoices = members.length > 1
  if (!hasChoices) return null

  const activeMember = members.find(m => m.active)
  const activeAvatar = activeMember?.avatar ?? null
  const activeIcon = activeMember?.icon ?? 'person'

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={tr('Byt person')}
      >
        {activeAvatar
          ? <SignedImage path={activeAvatar} style={styles.triggerAvatar} resizeMode="cover" transform={{ width: 96, height: 96, resize: 'cover' }} />
          : <View style={styles.triggerPlaceholder}><MaterialIcons name={activeIcon} size={20} color={t.onPrimary} /></View>}
        <View style={styles.chevronBadge}><MaterialIcons name="expand-more" size={13} color={t.onPrimary} /></View>
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
  // Kompakt rund knapp i samma storlek som header-ikonerna (40).
  trigger: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  triggerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: t.border },
  triggerPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  chevronBadge: { position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: t.bg },
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
