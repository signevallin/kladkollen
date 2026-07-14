import { router } from 'expo-router'

/**
 * Säker tillbaka-navigering.
 *
 * router.back() gör ingenting om det saknas navigeringshistorik – vilket
 * händer efter en omladdning på webben eller när en sida öppnats via djuplänk.
 * Då fastnar användaren. goBack() faller tillbaka till en given sida i stället.
 */
export function goBack(fallback = '/home') {
  if (router.canGoBack()) router.back()
  else router.replace(fallback as any)
}
