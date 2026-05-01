import { redirect } from 'next/navigation'
import { getCurrentUser, getRedirectPath } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'
import { Wallet } from 'lucide-react'

export default async function HomePage() {
  const user = await getCurrentUser()
  
  if (user) {
    redirect(getRedirectPath(user.userType, user.role))
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SpeedWallets</h1>
          <p className="text-muted-foreground text-center">
            School digital wallet for parents and students
          </p>
        </div>
        
        <LoginForm />
      </div>
    </main>
  )
}
