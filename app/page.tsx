import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-green-700 to-teal-800 relative overflow-hidden">
      {/* Decorative grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Floating icons */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 text-white/20 text-6xl">📊</div>
        <div className="absolute top-40 right-32 text-white/20 text-5xl">📈</div>
        <div className="absolute bottom-32 left-32 text-white/20 text-7xl">📉</div>
        <div className="absolute bottom-20 right-20 text-white/20 text-6xl">🗂️</div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <LoginForm />
      </div>
    </main>
  )
}
