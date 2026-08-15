import { useTheme } from '../theme/ThemeProvider'
import type { Theme } from '../theme/theme'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
import { invalidateGarments } from '../utils/garmentsStore'
import { apiPost } from '../utils/api'
import { removeBackground } from '../utils/removeBg'
import { showAlert } from '../utils/alert'
import { parsePrice } from '../utils/brands'
import { goBack } from '../utils/nav'
import { useSettings } from '../utils/settings'
import { toast } from '../components/Toast'
import { newImageId } from '../utils/id'
import { uploadUserImage } from '../utils/storage'
import { fetchLocations, type Location } from '../utils/locations'

// WebView finns bara i native-apparna – på webben visar vi en hänvisning.
// Kräv modulen först när den faktiskt används så webbygget inte kraschar.
let WebView: any = null
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView
}

// Startsidor för respektive butiks orderhistorik. Användaren kan navigera
// fritt i webbläsaren, så exakta URL:er är bara en genväg – importen läser
// den sida som visas när man trycker på Importera.
// Startsidor (inte djupa order-URL:er): djupa länkar 404:ar ofta när man inte
// är inloggad eller när butiken bytt sökväg. Startsidan finns alltid – man
// loggar in, går till sin orderhistorik och trycker Importera.
const STORES: { name: string; url: string }[] = [
  { name: 'H&M', url: 'https://www2.hm.com/sv_se/' },
  { name: 'Zalando', url: 'https://www.zalando.se/' },
  { name: 'Boozt', url: 'https://www.boozt.com/se/sv' },
  { name: 'Arket', url: 'https://www.arket.com/en-se/' },
  { name: 'Zara', url: 'https://www.zara.com/se/' },
  { name: 'ASOS', url: 'https://www.asos.com/se/' },
  { name: 'NA-KD', url: 'https://www.na-kd.com/sv' },
  { name: 'Vinted', url: 'https://www.vinted.se/' },
  { name: 'Sellpy', url: 'https://www.sellpy.se/' },
  { name: 'Gina Tricot', url: 'https://www.ginatricot.com/se' },
  { name: 'Nelly', url: 'https://nelly.com/se/' },
  { name: 'Lindex', url: 'https://www.lindex.com/se/' },
  { name: 'Åhléns', url: 'https://www.ahlens.se/' },
  { name: 'KappAhl', url: 'https://www.kappahl.com/sv-se/' },
  { name: 'About You', url: 'https://www.aboutyou.se/' },
  { name: 'Ellos', url: 'https://www.ellos.se/' },
  { name: 'Tradera', url: 'https://www.tradera.com/' },
  { name: 'COS', url: 'https://www.cos.com/en-sek/' },
  { name: '& Other Stories', url: 'https://www.stories.com/en_sek/' },
  // Populära butiker i övriga Europa.
  { name: 'Mango', url: 'https://shop.mango.com/' },
  { name: 'Uniqlo', url: 'https://www.uniqlo.com/eu/en/' },
  { name: 'Bershka', url: 'https://www.bershka.com/' },
  { name: 'Pull&Bear', url: 'https://www.pullandbear.com/' },
  { name: 'Stradivarius', url: 'https://www.stradivarius.com/' },
  { name: 'Weekday', url: 'https://www.weekday.com/' },
  { name: 'Monki', url: 'https://www.monki.com/' },
  { name: 'Next', url: 'https://www.next.co.uk/' },
  { name: 'Boohoo', url: 'https://www.boohoo.com/' },
  // Populära butiker i USA.
  { name: 'SHEIN', url: 'https://www.shein.com/' },
  { name: 'Nordstrom', url: 'https://www.nordstrom.com/' },
  { name: "Macy's", url: 'https://www.macys.com/' },
  { name: 'Gap', url: 'https://www.gap.com/' },
  { name: 'Old Navy', url: 'https://oldnavy.gap.com/' },
  { name: 'Nike', url: 'https://www.nike.com/' },
  { name: 'Abercrombie & Fitch', url: 'https://www.abercrombie.com/' },
  { name: 'American Eagle', url: 'https://www.ae.com/' },
  { name: 'Urban Outfitters', url: 'https://www.urbanoutfitters.com/' },
  { name: 'Anthropologie', url: 'https://www.anthropologie.com/' },
  { name: 'Revolve', url: 'https://www.revolve.com/' },
]

// Butikens logga hämtas som favicon utifrån rot­domänen (inte underdomäner
// som my.asos.com, som ofta saknar favicon) – funkar för alla butiker utan
// att vi behöver bundla bilder, och överlever omdesigner.
function storeLogoUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\d*\./, '')
    const parts = host.split('.')
    const root = parts.length > 2 ? parts.slice(-2).join('.') : host
    return `https://www.google.com/s2/favicons?sz=64&domain=${root}`
  } catch {
    return null
  }
}

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
  const { t: tr } = useSettings()
  const webRef = useRef<any>(null)
  // target=wishlist → plaggen hamnar på köplistan i stället för i garderoben.
  const { target } = useLocalSearchParams()
  const toWishlist = target === 'wishlist'

  const [store, setStore] = useState<{ name: string; url: string } | null>(null)
  const [step, setStep] = useState<'store' | 'browse' | 'select'>('store')
  const [parsing, setParsing] = useState(false)
  const [items, setItems] = useState<ImportedItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)
  const [addProgress, setAddProgress] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [importLocation, setImportLocation] = useState('')

  useEffect(() => {
    if (!toWishlist) fetchLocations().then(setLocations).catch(() => {})
  }, [toWishlist])

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
    if (!msg?.ok) { setParsing(false); showAlert(tr('Kunde inte läsa sidan'), msg?.error || tr('okänt fel')); return }
    try {
      const { items: found } = await apiPost('/api/parse-purchases', { store: store?.name, content: msg.content })
      if (!found || found.length === 0) {
        showAlert(tr('Inga plagg hittades'), tr('Kontrollera att du är inloggad och står på sidan med din orderhistorik, och försök igen.'))
      } else {
        setItems(found)
        setSelected(new Set(found.map((_: any, i: number) => i)))
        setStep('select')
      }
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
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
                  const b64 = await removeBackground(img.base64)
                  if (b64) { uploadBase64 = b64; uploadType = 'image/png' }
                } catch { /* misslyckad bakgrundsborttagning → originalbilden används */ }
              })(),
            ])
            try {
              const ext = uploadType.includes('png') ? 'png' : 'jpg'
              const binaryStr = atob(uploadBase64)
              const bytes = new Uint8Array(binaryStr.length)
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
              imageUrl = await uploadUserImage(bytes, ext, uploadType)
            } catch { /* bild är bonus – plagget läggs in ändå */ }
          }
        }

        if (toWishlist) {
          await supabase.from('wishlist').insert([{
            user_id: user.id,
            name: item.name,
            category: analysis.category || null,
            color: analysis.color || null,
            season: (analysis.seasons && analysis.seasons.length > 0) ? analysis.seasons.join(', ') : null,
            image_url: imageUrl,
          }])
        } else {
          await supabase.from('garments').insert([{
            user_id: user.id,
            name: item.name,
            category: analysis.category || '',
            subcategory: analysis.subcategory || null,
            color: analysis.color || '',
            season: (analysis.seasons && analysis.seasons.length > 0) ? analysis.seasons.join(', ') : 'Alla årstider',
            image_url: imageUrl,
            brand: item.brand || null,
            price: parsePrice(item.price),
            location: importLocation || null,
          }])
        }
      }
      invalidateGarments()

      toast(
        (chosen.length === 1 ? tr('{n} plagg tillagt!') : tr('{n} plagg tillagda!')).replace('{n}', String(chosen.length)),
        toWishlist ? tr('Du hittar dem på köplistan.') : tr('Du hittar dem i garderoben – kolla gärna kategori och säsong.'),
      )
      goBack('/wardrobe')
    } catch (e: any) {
      showAlert(tr('Något gick fel'), e.message)
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
            <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tr('Importera köp')}</Text>
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeText}>
              {tr('Import från nätbutiker fungerar bara i appen på din telefon, där du kan logga in säkert i butikens egen webbläsare.')}
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
            <Text style={styles.backButtonText}>← {tr('Tillbaka')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tr('Importera köp')}</Text>
          <Text style={styles.subtitle}>
            {tr('Välj din butik nedan. Logga in, gå till din orderhistorik (t.ex. "Mina köp" eller "Mina ordrar") och tryck Importera – så hämtas dina köpta plagg automatiskt.')}
          </Text>
          {STORES.map(s => (
            <TouchableOpacity key={s.name} style={styles.storeRow} onPress={() => { setStore(s); setStep('browse') }}>
              <View style={styles.storeLogoWrap}>
                {storeLogoUrl(s.url)
                  ? <Image source={{ uri: storeLogoUrl(s.url)! }} style={styles.storeLogo} resizeMode="contain" />
                  : <Text style={styles.storeLogoFallback}>{s.name.charAt(0)}</Text>}
              </View>
              <Text style={styles.storeName}>{s.name}</Text>
              <Text style={styles.storeArrow}>›</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.privacyBox}>
            <Text style={styles.privacyTitle}>{tr('Integritet')}</Text>
            <Text style={styles.privacyText}>
              {tr('Du loggar in direkt hos butiken – Skrud ser aldrig ditt lösenord. Endast produktinformation hämtas (namn, märke, pris, datum, bild). Namn, adress och betalningsuppgifter samlas aldrig in.')}
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
            <Text style={styles.backButtonText}>← {tr('Tillbaka till butiken')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tr('Hittade')} {items.length} {tr('plagg')}</Text>
          <Text style={styles.subtitle}>{tr('Bocka ur det du inte vill lägga till')} {toWishlist ? tr('på köplistan') : tr('i garderoben')}.</Text>
          {items.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.itemRow, selected.has(i) && styles.itemRowSelected]} onPress={() => toggle(i)} disabled={adding}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="contain" />
                : <View style={styles.itemImageEmpty} />
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

          {!toWishlist && locations.length > 0 && (
            <>
              <Text style={styles.locationLabel}>{tr('Var finns plaggen? (valfritt)')}</Text>
              <View style={styles.locationPills}>
                {locations.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.locationPill, importLocation === l.name && styles.locationPillActive]}
                    onPress={() => setImportLocation(importLocation === l.name ? '' : l.name)}
                    disabled={adding}
                  >
                    <Text style={[styles.locationPillText, importLocation === l.name && styles.locationPillTextActive]}>
                      {l.name}{l.is_archive ? tr(' (arkiv)') : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, (selected.size === 0 || adding) && styles.primaryBtnDisabled]}
            onPress={addSelected}
            disabled={selected.size === 0 || adding}
          >
            {adding
              ? <View style={styles.btnRow}><ActivityIndicator color={t.onPrimary} /><Text style={styles.primaryBtnText}> {addProgress}</Text></View>
              : <Text style={styles.primaryBtnText}>{tr('Lägg till')} {selected.size} {tr('plagg')} {toWishlist ? tr('i köplistan') : tr('i garderoben')}</Text>
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
          <Text style={styles.backButtonText}>← {tr('Butiker')}</Text>
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
        <Text style={styles.importHint}>{tr('Logga in och gå till din orderhistorik')}</Text>
        <TouchableOpacity style={[styles.primaryBtn, parsing && styles.primaryBtnDisabled]} onPress={startImport} disabled={parsing}>
          {parsing
            ? <View style={styles.btnRow}><ActivityIndicator color={t.onPrimary} /><Text style={styles.primaryBtnText}>  {tr('Läser sidan…')}</Text></View>
            : <Text style={styles.primaryBtnText}>{tr('Importera från denna sida')}</Text>
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
  storeLogoWrap: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  storeLogo: { width: 22, height: 22 },
  storeLogoFallback: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: t.textSecondary },
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
  locationLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: t.textSecondary, letterSpacing: 0.5, marginTop: 18, marginBottom: 10 },
  locationPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  locationPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: t.surfaceMuted, borderWidth: 1, borderColor: t.border },
  locationPillActive: { backgroundColor: t.primary, borderColor: t.primary },
  locationPillText: { fontFamily: 'Lora_500Medium', fontSize: 13, color: t.textSecondary },
  locationPillTextActive: { color: t.onPrimary },
})
