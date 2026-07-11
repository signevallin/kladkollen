import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { supabase } from '../supabase'
import { useTheme } from '../theme/ThemeProvider'

// På webben i produktion serveras "/" av den statiska landningssidan
// (public/landing.html via vercel.json), så den här routen träffas främst
// på native och i utvecklingsläge: skicka användaren rätt beroende på session.
export default function Index() {
  const t = useTheme()
  const [session, setSession] = useState<any>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  if (session === undefined) return <View style={{ flex: 1, backgroundColor: t.bg }} />
  if (session) return <Redirect href="/home" />
  return <Redirect href="/login" />
}
