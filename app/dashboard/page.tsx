import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import DashboardClient from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  // Fetch user's spreadsheets
  const { data: spreadsheets, error } = await supabase
    .from('spreadsheets')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching spreadsheets:', error)
  }

  return <DashboardClient spreadsheets={spreadsheets || []} user={session.user} />
}
