import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getDailySpending } from '@/lib/transactions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { User, Phone, Snowflake } from 'lucide-react'
import { AlertThresholdInput } from '@/components/parent/alert-threshold-input'

async function getStudentsWithDetails(parentId: number) {
  const students = await prisma.account.findMany({
    where: { parentId, role: 'student' },
    orderBy: { fullName: 'asc' },
  })
  return Promise.all(
    students.map(async (s) => ({
      ...s,
      phone: decrypt(s.phoneEncrypted),
      dailySpent: await getDailySpending(s.id),
    }))
  )
}

export default async function ParentStudentsPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const students = await getStudentsWithDetails(user.userId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Students</h1>
        <p className="text-muted-foreground">Manage your children&apos;s wallet settings</p>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No students linked</h3>
            <p className="text-muted-foreground text-sm">
              Contact your school administrator to link student accounts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {students.map((student) => {
            const dailyProgress = (student.dailySpent / student.dailyLimitUgx) * 100
            const dailyRemaining = Math.max(0, student.dailyLimitUgx - student.dailySpent)
            return (
              <Card
                key={student.id}
                className={student.isFrozen ? 'border-blue-300 bg-blue-50/50' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.fullName}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {student.phone}
                        </CardDescription>
                      </div>
                    </div>
                    {student.isFrozen && (
                      <Badge variant="secondary" className="gap-1">
                        <Snowflake className="w-3 h-3" />
                        Frozen
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-primary/5">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-3xl font-bold text-primary">
                      UGX {student.balanceUgx.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Today&apos;s Spending</span>
                      <span>
                        UGX {student.dailySpent.toLocaleString()} /{' '}
                        {student.dailyLimitUgx.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={dailyProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      UGX {dailyRemaining.toLocaleString()} remaining today
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Daily Limit</p>
                      <p className="font-semibold">UGX {student.dailyLimitUgx.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-semibold">{student.isFrozen ? 'Frozen' : 'Active'}</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <AlertThresholdInput
                      studentId={student.id}
                      initialThreshold={student.alertThreshold}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
