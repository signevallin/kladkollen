import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import type { Database } from './types/models'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Ren webbmekanism: läser window.location. På native är den en no-op, och
    // att lämna den true har lurat läsaren att tro att djuplänkade tokens
    // plockas upp automatiskt – det gör de inte (se app/reset-password.tsx).
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
})