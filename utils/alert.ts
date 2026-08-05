import { Alert, Platform } from 'react-native'
import { toast } from '../components/Toast'
import { confirmDialog } from '../components/ConfirmDialog'

// Titlar som signalerar ett fel/varning snarare än en bekräftelse – används
// för att välja rätt utseende (röd ruta + varningsikon) på toasten.
const ERROR_HINT = /(fel|kunde inte|misslyck|ogiltig|saknas|stöds inte|för många|hittade inte|tom |välj |skriv in|minst)/i

// Enkla informations-/bekräftelserutor visas numera som den temaanpassade
// toasten (samma överallt) istället för systemets grå Alert-ruta.
export function showAlert(title: string, message?: string) {
  toast(title, message, ERROR_HINT.test(title) ? 'error' : 'success')
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = 'OK',
  destructive: boolean = false
) {
  // Temaanpassad in-app-dialog (samma överallt). Faller tillbaka på systemets
  // ruta bara om <ConfirmHost/> inte hunnit monteras.
  if (confirmDialog({ title, message, onConfirm, confirmText, destructive })) return

  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n${message}` : title)) {
      onConfirm()
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Avbryt', style: 'cancel' },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm }
    ])
  }
}
