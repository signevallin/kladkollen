import { MaterialIcons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import SignedImage from '../components/SignedImage'
import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { supabase } from '../supabase'
import { showAlert, showConfirm } from '../utils/alert'
import { goBack } from '../utils/nav'

type Member = { user_id: string; role: string; name: string; avatar_url: string | null }

export default function Partner() {
  const t = useTheme()
  const styles = makeStyles(t)

  const [myId, setMyId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setMyId(user.id)
    const { data: mem } = await supabase.from('household_members').select('user_id, role')
    if (mem && mem.length > 0) {
      const ids = mem.map((m: any) => m.user_id)
      // Läs varje medlems profil via household-vaktad RPC (oberoende av profiles-RLS).
      const profs = await Promise.all(ids.map(async (id: string) => {
        const { data } = await supabase.rpc('partner_profile', { target: id })
        const p = Array.isArray(data) ? data[0] : data
        return p || { id, name: null, avatar_url: null }
      }))
      const byId: Record<string, any> = {}
      profs.forEach((p: any) => { if (p?.id) byId[p.id] = p })
      setMembers(mem.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        name: byId[m.user_id]?.name || (m.user_id === user.id ? 'Du' : 'Partner'),
        avatar_url: byId[m.user_id]?.avatar_url || null,
      })))
    } else {
      setMembers([])
    }
    setLoading(false)
  }

  const linked = members.length >= 2

  async function createInvite() {
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('create_partner_invite')
      if (error) throw error
      setInviteCode(data as string)
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setBusy(false)
    }
  }

  async function copyCode() {
    if (!inviteCode) return
    await Clipboard.setStringAsync(inviteCode)
    showAlert('Kopierat!', 'Skicka koden till din partner.')
  }

  async function join() {
    const code = joinCode.trim()
    if (!code) { showAlert('Skriv in en kod'); return }
    setBusy(true)
    try {
      const { error } = await supabase.rpc('join_by_invite', { invite_code: code })
      if (error) throw error
      setJoinCode('')
      setInviteCode(null)
      await load()
      showAlert('Ihopkopplade!', 'Ni delar nu ett hushåll.')
    } catch (e: any) {
      showAlert('Kunde inte koppla', e.message)
    } finally {
      setBusy(false)
    }
  }

  function unlink() {
    showConfirm('Koppla isär', 'Vill du koppla isär era konton? Ni delar inte längre hushåll.', async () => {
      setBusy(true)
      try {
        const { error } = await supabase.rpc('leave_household')
        if (error) throw error
        setInviteCode(null)
        await load()
      } catch (e: any) {
        showAlert('Något gick fel', e.message)
      } finally {
        setBusy(false)
      }
    }, 'Koppla isär', true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => goBack('/profile')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backButtonText}>← Tillbaka</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Min partner</Text>
        <Text style={styles.intro}>Koppla ihop ert konto så kan ni dela på funktioner för partners – önskelistor, koordinering inför event och mer.</Text>

        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : linked ? (
          <>
            <View style={styles.linkedCard}>
              <Text style={styles.linkedLabel}>NI ÄR IHOPKOPPLADE</Text>
              <View style={styles.avatarRow}>
                {members.map(m => (
                  <View key={m.user_id} style={styles.memberCol}>
                    {m.avatar_url
                      ? <SignedImage path={m.avatar_url} style={styles.avatar} resizeMode="cover" />
                      : <View style={styles.avatarPlaceholder}><MaterialIcons name="person" size={30} color={t.textSecondary} /></View>}
                    <Text style={styles.memberName} numberOfLines={1}>{m.user_id === myId ? 'Du' : m.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {(() => {
              const partner = members.find(m => m.user_id !== myId)
              if (!partner) return null
              return (
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => router.push(`/partner-closet?user=${partner.user_id}&name=${encodeURIComponent(partner.name)}` as any)}
                >
                  <MaterialIcons name="checkroom" size={20} color={t.textPrimary} />
                  <Text style={styles.viewBtnText}>Visa {partner.name}s garderob & outfits</Text>
                </TouchableOpacity>
              )
            })()}

            <TouchableOpacity style={styles.unlinkBtn} onPress={unlink} disabled={busy}>
              <Text style={styles.unlinkBtnText}>Koppla isär</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bjud in din partner</Text>
              <Text style={styles.cardDesc}>Skapa en kod och skicka till din partner. När hen anger koden delar ni hushåll.</Text>
              {inviteCode ? (
                <>
                  <View style={styles.codeBox}><Text style={styles.codeText}>{inviteCode}</Text></View>
                  <TouchableOpacity style={styles.primaryBtn} onPress={copyCode}>
                    <Text style={styles.primaryBtnText}>Kopiera kod</Text>
                  </TouchableOpacity>
                  <Text style={styles.hint}>Koden gäller i 7 dagar. Väntar på att din partner anger den…</Text>
                </>
              ) : (
                <TouchableOpacity style={styles.primaryBtn} onPress={createInvite} disabled={busy}>
                  {busy ? <ActivityIndicator color={t.primary} size="small" /> : <Text style={styles.primaryBtnText}>Skapa inbjudningskod</Text>}
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.orText}>eller</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Har du fått en kod?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ange partnerns kod"
                placeholderTextColor={t.placeholder}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={join} disabled={busy}>
                {busy ? <ActivityIndicator color={t.primary} size="small" /> : <Text style={styles.primaryBtnText}>Koppla ihop</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 8 },
  intro: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 24 },

  card: { backgroundColor: t.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: t.border },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary, marginBottom: 6 },
  cardDesc: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textSecondary, lineHeight: 19, marginBottom: 14 },
  hint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textFaint, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  input: { fontFamily: 'Poppins_600SemiBold', backgroundColor: t.surfaceMuted, borderRadius: 12, padding: 14, color: t.textPrimary, fontSize: 18, letterSpacing: 2, borderWidth: 1, borderColor: t.border, marginBottom: 12, textAlign: 'center' },
  primaryBtn: { backgroundColor: t.surfaceMuted, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 15 },
  codeBox: { backgroundColor: t.surfaceMuted, borderRadius: 12, paddingVertical: 18, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: t.primary, borderStyle: 'dashed' },
  codeText: { fontFamily: 'Poppins_700Bold', fontSize: 30, color: t.textPrimary, letterSpacing: 6 },
  orText: { fontFamily: 'Lora_400Regular', fontSize: 13, color: t.textFaint, textAlign: 'center', marginVertical: 16 },

  linkedCard: { backgroundColor: t.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  linkedLabel: { fontFamily: 'Poppins_700Bold', fontSize: 11, letterSpacing: 1.5, color: t.textSecondary, marginBottom: 18 },
  avatarRow: { flexDirection: 'row', gap: 28, justifyContent: 'center' },
  memberCol: { alignItems: 'center', width: 84 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: t.primary },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: t.border },
  memberName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: t.textPrimary, marginTop: 10 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, paddingVertical: 15, borderRadius: 14, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  viewBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.textPrimary, fontSize: 15 },
  matchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10, paddingVertical: 15, borderRadius: 14, backgroundColor: t.surface, borderWidth: 1, borderColor: t.primary },
  matchBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.primary, fontSize: 15 },
  unlinkBtn: { marginTop: 12, padding: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: t.border },
  unlinkBtnText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
})
