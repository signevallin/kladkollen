import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="sv">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA – iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Klädkollen" />
        <link rel="apple-touch-icon" href="/icon.png" />

        {/* PWA – generellt */}
        <meta name="theme-color" content="#150408" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  )
}
