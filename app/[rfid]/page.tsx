import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getDailySpending } from '@/lib/transactions'
import { Snowflake, Wallet, TrendingDown, ShieldCheck, AlertTriangle, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const letters =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  return <span className="text-3xl font-bold text-white select-none">{letters}</span>
}

function BalanceBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0)
  const remaining = Math.max(0, limit - spent)
  const isNearLimit = pct >= 80
  const isAtLimit = pct >= 100

  const fillColor = isAtLimit
    ? 'from-red-500 to-red-400'
    : isNearLimit
    ? 'from-amber-400 to-amber-300'
    : 'from-emerald-400 to-teal-400'

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-blue-200/50 font-medium">Daily Spending</span>
        <span className="text-[11px] text-white/70 font-medium">
          UGX {spent.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-[5px] rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fillColor} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-[11px] ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-blue-200/40'}`}>
        {isAtLimit ? 'Daily limit reached' : `UGX ${remaining.toLocaleString()} remaining today`}
      </p>
    </div>
  )
}

// Decorative chip component mimicking a smart card chip
function CardChip() {
  return (
    <div className="w-8 h-6 rounded-[4px] bg-gradient-to-br from-amber-300 to-amber-500 border border-white/20 shadow-lg grid grid-cols-3 grid-rows-3 gap-0.5 p-[3px]">
      <div className="col-span-3 bg-black/20 rounded-[1px]" />
      <div className="bg-black/20 rounded-[1px]" />
      <div className="bg-black/20 rounded-[1px]" />
      <div className="bg-black/20 rounded-[1px]" />
      <div className="col-span-3 bg-black/20 rounded-[1px]" />
    </div>
  )
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ rfid: string }>
}) {
  const { rfid } = await params

  if (!rfid) notFound()

  const account = await prisma.account.findFirst({
    where: { studentNumber: rfid, role: 'student' } as never,
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      balanceUgx: true,
      dailyLimitUgx: true,
      isFrozen: true,
    },
  })

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050d1f] via-[#0a1a3a] to-[#0d2460] p-4">
        {/* Ambient orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500/10 blur-[80px]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-[80px]" />
        </div>
        <div className="relative text-center space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 shadow-xl">
            <AlertTriangle className="w-9 h-9 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Card Not Registered</h1>
          <p className="text-blue-200/40 max-w-xs text-sm leading-relaxed">
            This RFID card is not linked to any student account. Please contact the school administrator.
          </p>
          <p className="text-blue-200/25 text-xs tracking-widest uppercase">
            Kitende International School
          </p>
        </div>
      </div>
    )
  }

  const dailySpent = await getDailySpending(account.id)
  const isLowBalance = !account.isFrozen && account.balanceUgx < 5000

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#050d1f] via-[#0a1a3a] to-[#0d2460] p-4">

      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-48 -left-48 w-[380px] h-[380px] rounded-full bg-blue-500/15 blur-[90px]" />
        <div className="absolute -bottom-48 -right-48 w-[320px] h-[320px] rounded-full bg-indigo-600/12 blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full bg-sky-400/8 blur-[70px]" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* School brand above card */}
        <div className="text-center mb-6">
          <p className="text-blue-200/30 text-[10px] tracking-[0.2em] uppercase font-medium">
            SpeedWallets · Kitende International School
          </p>
        </div>

        {/* ── Main card ── */}
        <div
          className="rounded-[20px] overflow-hidden shadow-2xl border border-white/[0.16]"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 100%)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          {/* Top shine line */}
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
          />

          {/* ── Card header: school identity ── */}
          <div
            className="relative px-5 py-4 flex items-center gap-3 border-b border-white/[0.08]"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.55) 0%, rgba(67,56,202,0.38) 100%)' }}
          >
            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.45), transparent)' }}
            />

            {/* KIS crest */}
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-[18px] font-bold text-blue-900 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 2px 14px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                border: '1.5px solid rgba(251,191,36,0.45)',
                fontFamily: 'Georgia, serif',
              }}
            >
              K
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[13px] leading-tight tracking-[0.01em]">
                Kitende International School
              </p>
              <p className="text-blue-200/70 text-[10px] tracking-[0.1em] uppercase mt-0.5 font-medium">
                Student Wallet Card
              </p>
            </div>

            <CardChip />
          </div>

          {/* ── Avatar + name ── */}
          <div className="px-5 pt-5 pb-0 flex gap-4 items-start">
            {/* Avatar */}
            <div
              className={`relative w-[72px] h-[72px] rounded-[14px] flex-shrink-0 overflow-hidden shadow-xl
                border-2 ${account.isFrozen ? 'border-blue-400/30' : 'border-white/[0.15]'}`}
            >
              {account.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.photoUrl} alt={account.fullName} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: account.isFrozen
                      ? 'linear-gradient(135deg, #1e3a8a, #1e40af)'
                      : 'linear-gradient(135deg, #1d4ed8, #3730a3)',
                    filter: account.isFrozen ? 'saturate(0.5) brightness(0.75)' : 'none',
                  }}
                >
                  <Initials name={account.fullName} />
                </div>
              )}
            </div>

            {/* Name + status */}
            <div className="flex-1 pt-1 min-w-0">
              <h1
                className="text-[19px] font-bold text-white leading-tight tracking-[-0.01em] truncate"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {account.fullName}
              </h1>
              <p className="text-blue-200/60 text-[10px] tracking-[0.1em] uppercase font-medium mt-0.5">
                Student
              </p>

              {/* Status pill */}
              {account.isFrozen ? (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                  bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <Snowflake className="w-3 h-3" />
                  Frozen
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                  bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Active
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div
            className="mx-5 my-5 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
          />

          {/* ── Balance ── */}
          <div className="px-5">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="w-3 h-3 text-blue-300/50" />
              <span className="text-[10px] uppercase tracking-[0.12em] text-blue-200/50 font-medium">
                Available Balance
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p
                className={`text-[32px] font-semibold tracking-[-0.025em] leading-none
                  ${account.isFrozen ? 'text-blue-300' : isLowBalance ? 'text-amber-400' : 'text-white'}`}
              >
                UGX {account.balanceUgx.toLocaleString()}
              </p>
              {isLowBalance && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full
                  bg-amber-500/15 border border-amber-400/30 text-amber-400">
                  <TrendingDown className="w-2.5 h-2.5" />
                  Low
                </span>
              )}
            </div>
          </div>

          {/* ── Daily spending bar ── */}
          <div className="px-5 pt-4 pb-5">
            <BalanceBar spent={dailySpent} limit={account.dailyLimitUgx} />
          </div>

          {/* ── Card footer ── */}
          <div className="border-t border-white/[0.07] px-5 py-3 flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-white/20">
              <CreditCard className="w-3 h-3" />
              <span className="text-[10px] tracking-[0.08em] font-medium">Scan to Pay</span>
            </div>
            <p className="text-white/20 text-[10px]">
              {new Date().toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
        </div>

        {/* Below-card tag */}
        <p className="text-center text-blue-200/20 text-[10px] mt-5 tracking-[0.15em] uppercase">
          Powered by SpeedWallets
        </p>
      </div>
    </div>
  )
}