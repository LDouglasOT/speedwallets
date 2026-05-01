'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface EnrollmentResult {
  success: boolean
  parentsCreated: number
  parentsUpdated: number
  studentsCreated: number
  studentsUpdated: number
  errors: string[]
}

export function BulkEnrollmentForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<EnrollmentResult | null>(null)
  const [error, setError] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setResult(null)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(10)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      setProgress(30)

      const response = await fetch('/api/admin/enrollment', {
        method: 'POST',
        body: formData,
      })

      setProgress(80)

      const data = await response.json()

      setProgress(100)

      if (!response.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setResult(data)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload CSV
        </CardTitle>
        <CardDescription>
          Select a CSV file to enroll parents and students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">Click to select CSV file</p>
              <p className="text-sm text-muted-foreground">
                or drag and drop
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Processing enrollment...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <Alert className={result.errors.length > 0 ? 'border-accent' : 'bg-primary/10 border-primary'}>
              {result.errors.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-accent" />
              ) : (
                <CheckCircle className="h-4 w-4 text-primary" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Enrollment {result.errors.length > 0 ? 'completed with warnings' : 'successful'}!
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>Parents created: {result.parentsCreated}</li>
                    <li>Parents updated: {result.parentsUpdated}</li>
                    <li>Students created: {result.studentsCreated}</li>
                    <li>Students updated: {result.studentsUpdated}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {result.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="font-medium text-destructive mb-2">Errors ({result.errors.length}):</p>
                <ul className="text-sm text-destructive space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i}>- {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Spinner className="mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload and Enroll
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
