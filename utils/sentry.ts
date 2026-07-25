// Kraschrapportering via Sentry.
//
// Laddas SKYDDAT så appen fungerar även innan @sentry/react-native finns i
// bygget, och startar bara om en DSN är satt (EXPO_PUBLIC_SENTRY_DSN). Utan
// modul eller DSN blir allt no-ops.
//
// Aktivera:
//   1) npx expo install @sentry/react-native
//   2) sätt EXPO_PUBLIC_SENTRY_DSN (EAS secret / .env)
//   3) bygg om (nativ modul)
//   (valfritt: lägg till @sentry/react-native/expo som plugin för läsbara
//    stack traces via source maps)

let Sentry: any = null
try { Sentry = require('@sentry/react-native') } catch { Sentry = null }

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || ''
let started = false

export function initSentry() {
  if (started || !Sentry?.init || !DSN) return
  try {
    Sentry.init({
      dsn: DSN,
      // Måttlig prestanda-spårning; höj vid behov.
      tracesSampleRate: 0.2,
      // Skicka inte med användarens IP/PII per default.
      sendDefaultPii: false,
    })
    started = true
  } catch { /* ignorera – kraschrapportering får aldrig krascha appen */ }
}

// Wrappar rot-komponenten så Sentry fångar renderingsfel och nativa krascher.
export function wrapWithSentry<T>(Component: T): T {
  if (Sentry?.wrap && DSN) {
    try { return Sentry.wrap(Component as any) as T } catch { return Component }
  }
  return Component
}

// Rapporterar ett fel manuellt (använd i catch-block för tysta fel).
export function captureError(e: unknown, context?: Record<string, any>) {
  if (started && Sentry?.captureException) {
    try { Sentry.captureException(e, context ? { extra: context } : undefined) } catch { /* ignorera */ }
  }
}
