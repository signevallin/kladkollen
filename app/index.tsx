import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Index() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setTarget(session ? '/home' : '/login')
    })
  }, [])

  if (!target) return null

  return <Redirect href={target} />
}


