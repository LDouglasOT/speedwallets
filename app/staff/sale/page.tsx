import { SaleForm } from '@/components/staff/sale-form'

export default function SalePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Sale</h1>
        <p className="text-muted-foreground">
          Process a student canteen purchase
        </p>
      </div>

      <SaleForm />
    </div>
  )
}
