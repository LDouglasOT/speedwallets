import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Home, ShoppingCart, History, RotateCcw } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/staff', icon: <Home className="h-4 w-4" /> },
  { label: 'New Sale', href: '/staff/sale', icon: <ShoppingCart className="h-4 w-4" /> },
  { label: 'Refunds', href: '/staff/refunds', icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'History', href: '/staff/history', icon: <History className="h-4 w-4" /> },
]

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.userType !== 'staff') {
    redirect('/')
  }

  return (
    <DashboardShell
      userName={user.fullName}
      userRole={user.role === 'admin' ? 'Admin' : 'Staff'}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  )
}
