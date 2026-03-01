import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Index() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
  }, [])

  if (loading) return null

  return <Redirect href={session ? '/home' : '/login'} />
}


