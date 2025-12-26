import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import SpreadsheetEditor from '@/components/spreadsheet/SpreadsheetEditor'

export const dynamic = 'force-dynamic'

export default async function SpreadsheetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  // Fetch the spreadsheet
  const { data: spreadsheet, error } = await supabase
    .from('spreadsheets')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (error || !spreadsheet) {
    redirect('/dashboard')
  }

  return <SpreadsheetEditor spreadsheet={spreadsheet} />
}
