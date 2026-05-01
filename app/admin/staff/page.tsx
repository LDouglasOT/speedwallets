import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AddStaffForm } from '@/components/admin/add-staff-form'

async function getStaff() {
  const staff = await prisma.staff.findMany({
    orderBy: [{ role: 'desc' }, { fullName: 'asc' }],
  })
  return staff.map((s) => ({ ...s, phone: decrypt(s.phoneEncrypted) }))
}

export default async function StaffPage() {
  const staff = await getStaff()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <p className="text-muted-foreground">Manage canteen staff and administrators</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>
                {staff.length} staff member{staff.length !== 1 ? 's' : ''} registered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{member.phone}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {member.isActive ? (
                            <Badge className="bg-primary/10 text-primary">Active</Badge>
                          ) : (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(member.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <AddStaffForm />
        </div>
      </div>
    </div>
  )
}
