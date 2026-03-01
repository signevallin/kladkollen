import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { supabase } from '../supabase'

export default function Index() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  // Väntar på svar från Supabase
  if (session === undefined) return <View style={{ flex: 1, backgroundColor: '#150408' }} />

  return <Redirect href={session ? '/home' : '/login'} />
}






