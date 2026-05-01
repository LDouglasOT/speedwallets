import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Home, Users, History, Settings } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/parent', icon: <Home className="h-4 w-4" /> },
  { label: 'Students', href: '/parent/students', icon: <Users className="h-4 w-4" /> },
  { label: 'History', href: '/parent/history', icon: <History className="h-4 w-4" /> },
]

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.userType !== 'account' || user.role !== 'parent') {
    redirect('/')
  }

  return (
    <DashboardShell
      userName={user.fullName}
      userRole="Parent"
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  )
}
