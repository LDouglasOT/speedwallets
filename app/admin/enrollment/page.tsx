import { BulkEnrollmentForm } from '@/components/admin/bulk-enrollment-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSpreadsheet, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EnrollmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Enrollment</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to register parents and students in bulk
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BulkEnrollmentForm />
        </div>

        <div className="space-y-4">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                CSV Format
              </CardTitle>
              <CardDescription>
                Required columns for bulk enrollment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p className="font-medium">Required columns:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="text-xs bg-muted px-1 rounded">parent_name</code> - Full name of parent</li>
                  <li><code className="text-xs bg-muted px-1 rounded">parent_phone</code> - Parent phone number</li>
                  <li><code className="text-xs bg-muted px-1 rounded">parent_id_number</code> - National ID (optional)</li>
                  <li><code className="text-xs bg-muted px-1 rounded">parent_pin</code> - 4-6 digit PIN</li>
                  <li><code className="text-xs bg-muted px-1 rounded">student_name</code> - Full name of student</li>
                  <li><code className="text-xs bg-muted px-1 rounded">student_phone</code> - Student phone number</li>
                  <li><code className="text-xs bg-muted px-1 rounded">student_pin</code> - 4-6 digit PIN</li>
                  <li><code className="text-xs bg-muted px-1 rounded">daily_limit</code> - Daily spending limit (UGX)</li>
                </ul>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">Sibling handling:</p>
                <p className="text-muted-foreground">
                  For siblings, use the same parent phone number. The system will automatically link students to existing parents.
                </p>
              </div>

              <a href="/sample-enrollment.csv" download>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>- Phone numbers should include country code (e.g., +256...)</p>
              <p>- PINs must be 4-6 digits</p>
              <p>- Daily limits should be in UGX (no commas)</p>
              <p>- Duplicate phones will update existing accounts</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
