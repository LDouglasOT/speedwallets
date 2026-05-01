import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

async function getAccounts() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    include: { parent: { select: { fullName: true } } },
  })
  return accounts.map((a) => ({ ...a, phone: decrypt(a.phoneEncrypted) }))
}

export default async function AccountsPage() {
  const accounts = await getAccounts()
  const parents = accounts.filter((a) => a.role === 'parent')
  const students = accounts.filter((a) => a.role === 'student')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Management</h1>
        <p className="text-muted-foreground">View and manage all parent and student accounts</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
          <TabsTrigger value="parents">Parents ({parents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Accounts</CardTitle>
              <CardDescription>All enrolled students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Daily Limit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{student.phone}</TableCell>
                        <TableCell>{student.parent?.fullName || '-'}</TableCell>
                        <TableCell>UGX {student.balanceUgx.toLocaleString()}</TableCell>
                        <TableCell>UGX {student.dailyLimitUgx.toLocaleString()}</TableCell>
                        <TableCell>
                          {student.isFrozen ? (
                            <Badge variant="secondary">Frozen</Badge>
                          ) : (
                            <Badge className="bg-primary/10 text-primary">Active</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Parent Accounts</CardTitle>
              <CardDescription>All registered parents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parents.map((parent) => {
                      const childCount = students.filter((s) => s.parentId === parent.id).length
                      return (
                        <TableRow key={parent.id}>
                          <TableCell className="font-medium">{parent.fullName}</TableCell>
                          <TableCell className="font-mono text-sm">{parent.phone}</TableCell>
                          <TableCell>
                            {childCount} student{childCount !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell>
                            {new Date(parent.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
