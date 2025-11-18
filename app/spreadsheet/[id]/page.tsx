import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import SpreadsheetEditor from '@/components/spreadsheet/SpreadsheetEditor'

export const dynamic = 'force-dynamic'

export default async function SpreadsheetPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  // Fetch the spreadsheet
  const { data: spreadsheet, error } = await supabase
    .from('spreadsheets')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !spreadsheet) {
    redirect('/dashboard')
  }

  return <SpreadsheetEditor spreadsheet={spreadsheet} />
}
