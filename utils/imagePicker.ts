import * as ImagePicker from 'expo-image-picker'
import { ActionSheetIOS, Alert, Platform } from 'react-native'
import { showAlert } from './alert'

const CANCELED: ImagePicker.ImagePickerResult = { canceled: true, assets: null as any }

// Låter användaren välja mellan att ta en ny bild eller välja en befintlig,
// och startar rätt väljare. På webben (där kamera saknas) går den direkt till
// bildbiblioteket. Camera-läget ger alltid en enda bild.
async function askSource(): Promise<'camera' | 'library' | null> {
  if (Platform.OS === 'web') return 'library'

  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Ta bild', 'Välj från galleri', 'Avbryt'],
          cancelButtonIndex: 2,
        },
        (i) => resolve(i === 0 ? 'camera' : i === 1 ? 'library' : null),
      )
    })
  }

  // Android och övrigt: en enkel dialog med tre val.
  return new Promise((resolve) => {
    Alert.alert('Lägg till bild', undefined, [
      { text: 'Ta bild', onPress: () => resolve('camera') },
      { text: 'Välj från galleri', onPress: () => resolve('library') },
      { text: 'Avbryt', style: 'cancel', onPress: () => resolve(null) },
    ])
  })
}

// Frågar om källa och returnerar ett ImagePicker-resultat. Skickas samma
// options vidare som till launchImageLibraryAsync. Kameran ignorerar
// allowsMultipleSelection (går bara att ta en bild i taget).
export async function pickImageSmart(
  options: ImagePicker.ImagePickerOptions,
): Promise<ImagePicker.ImagePickerResult> {
  const source = await askSource()
  if (!source) return CANCELED

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      showAlert('Kameran är avstängd', 'Tillåt kameraåtkomst i inställningarna för att ta en bild.')
      return CANCELED
    }
    return ImagePicker.launchCameraAsync({ ...options, allowsMultipleSelection: false })
  }

  return ImagePicker.launchImageLibraryAsync(options)
}
