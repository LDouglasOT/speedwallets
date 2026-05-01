import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Home, Users, UserCog, Upload, BarChart3, ShoppingCart } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: <Home className="h-4 w-4" /> },
  { label: 'Accounts', href: '/admin/accounts', icon: <Users className="h-4 w-4" /> },
  { label: 'Staff', href: '/admin/staff', icon: <UserCog className="h-4 w-4" /> },
  { label: 'Enrollment', href: '/admin/enrollment', icon: <Upload className="h-4 w-4" /> },
  { label: 'Reports', href: '/admin/reports', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Sales', href: '/staff/sale', icon: <ShoppingCart className="h-4 w-4" /> },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || user.userType !== 'staff' || user.role !== 'admin') {
    redirect('/')
  }

  return (
    <DashboardShell
      userName={user.fullName}
      userRole="Administrator"
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  )
}
