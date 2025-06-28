import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
})

// Helper functions
export const fetchCollection = async (table: string) => {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  return data
}

export const updateRecord = async (table: string, id: string, updates: object) => {
  const { error } = await supabase.from(table).update(updates).eq('id', id)
  if (error) throw error
}