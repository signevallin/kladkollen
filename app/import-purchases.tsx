import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { supabase } from '../supabase'
import { apiPost } from '../utils/api'
import { showAlert } from '../utils/alert'
import { goBack } from '../utils/nav'

// WebView finns bara i native-apparna – på webben visar vi en hänvisning.
// Kräv modulen först när den faktiskt används så webbygget inte kraschar.
let WebView: any = null
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView
}

// Startsidor för respektive butiks orderhistorik. Användaren kan navigera
// fritt i webbläsaren, så exakta URL:er är bara en genväg – importen läser
// den sida som visas när man trycker på Importera.
const STORES: { name: string; emoji: string; url: string }[] = [
  { name: 'H&M', emoji: '🔴', url: 'https://www2.hm.com/sv_se/account/purchases.html' },
  { name: 'Zalando', emoji: '🧡', url: 'https://www.zalando.se/myaccount/orders/' },
  { name: 'Boozt', emoji: '🟢', url: 'https://www.boozt.com/se/sv/account/orders' },
  { name: 'Arket', emoji: '🤎', url: 'https://www.arket.com/en-se/account/orders' },
  { name: 'Zara', emoji: '⚫', url: 'https://www.zara.com/se/sv/user/orders' },
  { name: 'ASOS', emoji: '⚪', url: 'https://my.asos.com/my-account/orders' },
  { name: 'NA-KD', emoji: '🩷', url: 'https://www.na-kd.com/sv/account/orders' },
  { name: 'Vinted', emoji: '💚', url: 'https://www.vinted.se/member/settings/orders' },
  { name: 'Sellpy', emoji: '💛', url: 'https://www.sellpy.se/anvandare/kop' },
]

// Körs i WebView:n när användaren trycker Importera. Plockar sidans synliga
// text + bild-URL:er i dokumentordning (bilder markeras med [BILD]) så att
// AI:n kan para ihop produktnamn med rätt bild. Ingen HTML skickas – bara
// det som faktiskt syns på sidan.
const EXTRACT_JS = `(function(){
  try {
    var out = [];
    function walk(n){
      if(!n) return;
      if(n.nodeType===3){ var t=n.textContent.replace(/\\s+/g,' ').trim(); if(t) out.push(t); return; }
      if(n.nodeType!==1) return;
      var tag=n.tagName;
      if(tag==='SCRIPT'||tag==='STYLE'||tag==='NOSCRIPT'||tag==='SVG'||tag==='IFRAME') return;
      if(tag==='IMG'){ var s=n.currentSrc||n.src; if(s && s.indexOf('http')===0) out.push('[BILD] '+s); return; }
      var kids=n.childNodes; for(var i=0;i<kids.length;i++) walk(kids[i]);
    }
    walk(document.body);
    window.ReactNativeWebView.postMessage(JSON.stringify({ ok:true, content: out.join('\\n').slice(0,120000), url: location.href }));
  } catch(e){ window.ReactNativeWebView.postMessage(JSON.stringify({ ok:false, error: String(e) })); }
  true;
})();`

type ImportedItem = {
  name: string
  brand: string | null
  price: string | null
  orderDate: string | null
  imageUrl: string | null
}

export default function ImportPurchases() {
  const t = useTheme()
  const styles = makeStyles(t)
  const webRef = useRef<any>(null)

  const [store, setStore] = useState<{ name: string; url: string } | null>(null)
  const [step, setStep] = useState<'store' | 'browse' | 'select'>('store')
  const [parsing, setParsing] = useState(false)
  const [items, setItems] = useState<ImportedItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [addProgress, setAddProgress] = useState('')

  function startImport() {
    if (parsing) return
    setParsing(true)
    webRef.current?.injectJavaScript(EXTRACT_JS)
    // Om inget svar kommer (t.ex. sida som blockerar skript) släpper vi spinnern.
    setTimeout(() => setParsing(false), 30000)
  }

  async function onWebViewMessage(event: any) {
    let msg: any = null
    try { msg = JSON.parse(event.nativeEvent.data) } catch { return }
    if (!msg?.ok) { setParsing(false); showAlert('Kunde inte läsa sidan', msg?.error || 'okänt fel'); return }
    try {
      const { items: found } = await apiPost('/api/parse-purchases', { store: store?.name, content: msg.content })
      if (!found || found.length === 0) {
        showAlert('Inga plagg hittades', 'Kontrollera att du är inloggad och står på sidan med din orderhistorik, och försök igen.')
      } else {
        setItems(found)
        setSelected(new Set(found.map((_: any, i: number) => i)))
        setStep('select')
      }
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setParsing(false)
    }
  }

  function toggle(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function fetchImageBase64(url: string): Promise<{ base64: string; contentType: string } | null> {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const base64 = dataUrl.split(',')[1]
      if (!base64) return null
      return { base64, contentType: blob.type || 'image/jpeg' }
    } catch {
      return null
    }
  }

  async function addSelected() {
    const chosen = items.filter((_, i) => selected.has(i))
    if (chosen.length === 0) return
    setAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Inte inloggad')

      let done = 0
      for (const item of chosen) {
        done++
        setAddProgress(`Lägger till ${done}/${chosen.length}…`)

        // Hämta produktbilden, låt AI:n sätta kategori/färg/säsong och ta
        // bort bakgrunden – analysen och bakgrundsborttagningen körs parallellt.
        let imageUrl: string | null = null
        let analysis: any = {}
        if (item.imageUrl) {
          const img = await fetchImageBase64(item.imageUrl)
          if (img) {
            let uploadBase64 = img.base64
            let uploadType = img.contentType
            await Promise.all([
              (async () => {
                try { analysis = await apiPost('/api/analyze-garment', { base64: img.base64 }) } catch { /* analysen är bonus */ }
              })(),
              (async () => {
                try {
                  const data = await apiPost('/api/remove-background', { base64: img.base64 })
                  if (data.base64) { uploadBase64 = data.base64; uploadType = 'image/png' }
                } catch { /* misslyckad bakgrundsborttagning → originalbilden används */ }
              })(),
            ])
            try {
              const ext = uploadType.includes('png') ? 'png' : 'jpg'
              const filePath = `public/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
              const binaryStr = atob(uploadBase64)
              const bytes = new Uint8Array(binaryStr.length)
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
              const { error } = await supabase.storage.from('garments').upload(filePath, bytes, { contentType: uploadType, upsert: true })
              if (!error) {
                const { data: urlData } = supabase.storage.from('garments').getPublicUrl(filePath)
                imageUrl = urlData.publicUrl
              }
            } catch { /* bild är bonus – plagget läggs in ändå */ }
          }
        }

        await supabase.from('garments').insert([{
          user_id: user.id,
          name: item.name,
          category: analysis.category || '',
          subcategory: analysis.subcategory || null,
          color: analysis.color || '',
          season: (analysis.seasons && analysis.seasons.length > 0) ? analysis.seasons.join(', ') : 'Alla årstider',
          image_url: imageUrl,
        }])
      }

      showAlert(`${chosen.length} plagg importerade! 🍒`, 'Du hittar dem i garderoben. Öppna gärna varje plagg och kontrollera kategori och säsong.')
      goBack('/wardrobe')
    } catch (e: any) {
      showAlert('Något gick fel', e.message)
    } finally {
      setAdding(false)
      setAddProgress('')
    }
  }

  // ── Webben: funktionen kräver appen ─────────────────────────
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => goBack('/wardrobe')}>
            <Text style={styles.backButtonText}>← Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Importera köp</Text>
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeEmoji}>📱</Text>
            <Text style={styles.webNoticeText}>
              Import från nätbutiker fungerar bara i appen på din telefon, där du kan
              logga in säkert i butikens egen webbläsare.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Steg 1: välj butik ──────────────────────────────────────
  if (step === 'store') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => goBack('/wardrobe')}>
            <Text style={styles.backButtonText}>← Tillbaka</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Importera köp</Text>
          <Text style={styles.subtitle}>
            Logga in i butiken, gå till din orderhistorik och tryck Importera – så
            hämtas dina köpta plagg automatiskt.
          </Text>
          {STORES.map(s => (
            <TouchableOpacity key={s.name} style={styles.storeRow} onPress={() => { setStore(s); setStep('browse') }}>
              <Text style={styles.storeEmoji}>{s.emoji}</Text>
              <Text style={styles.storeName}>{s.name}</Text>
              <Text style={styles.storeArrow}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.privacyBox}>
            <Text style={styles.privacyTitle}>🔒 Integritet</Text>
            <Text style={styles.privacyText}>
              Du loggar in direkt hos butiken – Klädkollen ser aldrig ditt lösenord.
              Endast produktinformation hämtas (namn, märke, pris, datum, bild).
              Namn, adress och betalningsuppgifter samlas aldrig in.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Steg 3: välj plagg att lägga till ───────────────────────
  if (step === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('browse')} disabled={adding}>
            <Text style={styles.backButtonText}>← Tillbaka till butiken</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Hittade {items.length} plagg</Text>
          <Text style={styles.subtitle}>Bocka ur det du inte vill lägga till i garderoben.</Text>
          {items.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.itemRow, selected.has(i) && styles.itemRowSelected]} onPress={() => toggle(i)} disabled={adding}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="contain" />
                : <View style={styles.itemImageEmpty}><Text style={{ fontSize: 20 }}>👗</Text></View>
              }
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {[item.brand, item.price, item.orderDate].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={[styles.checkbox, selected.has(i) && styles.checkboxOn]}>
                {selected.has(i) && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.primaryBtn, (selected.size === 0 || adding) && styles.primaryBtnDisabled]}
            onPress={addSelected}
            disabled={selected.size === 0 || adding}
          >
            {adding
              ? <View style={styles.btnRow}><ActivityIndicator color={t.onPrimary} /><Text style={styles.primaryBtnText}> {addProgress}</Text></View>
              : <Text style={styles.primaryBtnText}>Lägg till {selected.size} plagg i garderoben</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ── Steg 2: butikens sida i WebView ─────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.browseHeader}>
        <TouchableOpacity onPress={() => { setStep('store'); setStore(null) }}>
          <Text style={styles.backButtonText}>← Butiker</Text>
        </TouchableOpacity>
        <Text style={styles.browseTitle}>{store?.name}</Text>
        <View style={{ width: 60 }} />
      </View>
      {WebView && (
        <WebView
          ref={webRef}
          source={{ uri: store?.url || '' }}
          onMessage={onWebViewMessage}
          style={{ flex: 1 }}
          // Butikssidor kräver ofta cookies/JS – standardinställningarna räcker.
        />
      )}
      <View style={styles.importBar}>
        <Text style={styles.importHint}>Logga in och gå till din orderhistorik</Text>
        <TouchableOpacity style={[styles.primaryBtn, parsing && styles.primaryBtnDisabled]} onPress={startImport} disabled={parsing}>
          {parsing
            ? <View style={styles.btnRow}><ActivityIndicator color={t.onPrimary} /><Text style={styles.primaryBtnText}>  Läser sidan…</Text></View>
            : <Text style={styles.primaryBtnText}>⬇️ Importera från denna sida</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  backButton: { marginBottom: 16 },
  backButtonText: { fontFamily: 'Lora_400Regular', color: t.textSecondary, fontSize: 15 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, color: t.textPrimary, marginBottom: 8 },
  subtitle: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, lineHeight: 21, marginBottom: 20 },

  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  storeEmoji: { fontSize: 20 },
  storeName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: t.textPrimary, flex: 1 },
  storeArrow: { fontFamily: 'Lora_400Regular', fontSize: 22, color: t.textSecondary },

  privacyBox: { backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: t.border },
  privacyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: t.textPrimary, marginBottom: 6 },
  privacyText: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, lineHeight: 18 },

  webNotice: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  webNoticeEmoji: { fontSize: 44 },
  webNoticeText: { fontFamily: 'Lora_400Regular', fontSize: 14, color: t.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 300 },

  browseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  browseTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textPrimary },

  importBar: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.bg },
  importHint: { fontFamily: 'Lora_400Regular', fontSize: 12, color: t.textSecondary, textAlign: 'center', fontStyle: 'italic' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.surfaceMuted, borderRadius: 14, padding: 10, marginBottom: 10, borderWidth: 1.5, borderColor: t.border, opacity: 0.6 },
  itemRowSelected: { opacity: 1, borderColor: t.primary },
  itemImage: { width: 56, height: 68, borderRadius: 8, backgroundColor: t.imageBg },
  itemImageEmpty: { width: 56, height: 68, borderRadius: 8, backgroundColor: t.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontFamily: 'Lora_500Medium', fontSize: 14, color: t.textPrimary },
  itemMeta: { fontFamily: 'Lora_400Regular', fontSize: 11, color: t.textSecondary, marginTop: 3 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: t.primary, borderColor: t.primary },
  checkmark: { color: t.onPrimary, fontSize: 14, fontWeight: 'bold' },

  primaryBtn: { backgroundColor: t.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', color: t.onPrimary, fontSize: 15 },
  btnRow: { flexDirection: 'row', alignItems: 'center' },
})
