import { RefundForm } from '@/components/staff/refund-form'

export default function RefundsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Process Refund</h1>
        <p className="text-muted-foreground">
          Refund a student purchase
        </p>
      </div>

      <RefundForm />
    </div>
  )
}
