import { Alert, Platform } from 'react-native'

export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title)
  } else {
    Alert.alert(title, message)
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = 'OK',
  destructive: boolean = false
) {
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
