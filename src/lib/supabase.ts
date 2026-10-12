import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// This is null until .env.local has the Supabase values.
export const supabase = url && key ? createClient(url, key, { auth: { flowType: 'pkce' } }) : null

export const allowedEmail = ((import.meta.env.VITE_ALLOWED_EMAIL as string | undefined) ?? '').toLowerCase()
