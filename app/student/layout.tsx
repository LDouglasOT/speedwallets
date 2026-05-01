import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Home, History } from 'lucide-react'

const navItems = [
  { label: 'My Wallet', href: '/student', icon: <Home className="h-4 w-4" /> },
  { label: 'History', href: '/student/history', icon: <History className="h-4 w-4" /> },
]

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.userType !== 'account' || user.role !== 'student') {
    redirect('/')
  }

  return (
    <DashboardShell
      userName={user.fullName}
      userRole="Student"
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  )
}
