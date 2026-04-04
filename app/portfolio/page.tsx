"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TrendingUp, TrendingDown, Clock, Wallet, BarChart2, Zap } from "lucide-react"

interface Portfolio {
  balance: number
  starting_balance: number
}

interface Holding {
  coin_id: string
  coin_symbol: string
  coin_name: string
  coin_image: string
  bybit_symbol: string
  quantity: number
  avg_buy_price: number
  current_price?: number
  current_value?: number
  pnl?: number
  pnl_percent?: number
}

interface Trade {
  id: string
  coin_symbol: string
  coin_name: string
  coin_image: string
  type: "buy" | "sell"
  quantity: number
  price: number
  total: number
  created_at: string
}

interface LeveragedPosition {
  id: string
  coin_symbol: string
  coin_name: string
  coin_image: string
  bybit_symbol: string
  direction: "long" | "short"
  leverage: number
  entry_price: number
  size_usd: number
  margin_usd: number
  liquidation_price: number
  is_open: boolean
  close_price: number | null
  pnl: number | null
  created_at: string
  closed_at: string | null
  current_price?: number
  live_pnl?: number
  live_pnl_percent?: number
}

function formatPrice(price: number) {
  if (!price || isNaN(price)) return "0.00"
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

function formatUSD(value: number) {
  const fixed = Math.abs(value) < 0.005 ? 0 : value
  return fixed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type Tab = "holdings" | "history"

export default function PortfolioPage() {
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [leveragedPositions, setLeveragedPositions] = useState<LeveragedPosition[]>([])
  const [closedPositions, setClosedPositions] = useState<LeveragedPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [tab, setTab] = useState<Tab>("holdings")
  const [totalValue, setTotalValue] = useState(0)
  const [leveragedValue, setLeveragedValue] = useState(0)
  const holdingsRef = useRef<Holding[]>([])
  const leveragedRef = useRef<LeveragedPosition[]>([])

  useEffect(() => { holdingsRef.current = holdings }, [holdings])
  useEffect(() => { leveragedRef.current = leveragedPositions }, [leveragedPositions])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setIsLoggedIn(true)

      const { data: portfolioData } = await supabase
        .from("portfolios")
        .select("balance, starting_balance")
        .eq("user_id", user.id)
        .single()

      if (!portfolioData) { router.push("/portfolio/setup"); return }
      setPortfolio(portfolioData)

      const { data: holdingsData } = await supabase
        .from("holdings")
        .select("*")
        .eq("user_id", user.id)
        .gt("quantity", 0)
        .order("created_at", { ascending: false })

      const { data: tradesData } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      const { data: openPositions } = await supabase
        .from("leveraged_positions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_open", true)
        .order("created_at", { ascending: false })

      const { data: closedPos } = await supabase
        .from("leveraged_positions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_open", false)
        .order("closed_at", { ascending: false })
        .limit(50)

      if (tradesData) setTrades(tradesData)
      if (closedPos) setClosedPositions(closedPos)

      if (holdingsData && holdingsData.length > 0) {
        const enriched = await enrichHoldings(holdingsData)
        setHoldings(enriched)
        const total = enriched.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
        setTotalValue(total)
      }

      if (openPositions && openPositions.length > 0) {
        const enriched = await enrichLeveraged(openPositions)
        setLeveragedPositions(enriched)
        const lev = enriched.reduce((sum, p) => sum + Math.max(0, p.margin_usd + (p.live_pnl ?? 0)), 0)
        setLeveragedValue(lev)
      }

      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (holdings.length === 0 && leveragedPositions.length === 0) return

    const interval = setInterval(async () => {
      if (holdingsRef.current.length > 0) {
        const enriched = await enrichHoldings(holdingsRef.current)
        setHoldings(enriched)
        const total = enriched.reduce((sum, h) => sum + (h.current_value ?? 0), 0)
        setTotalValue(total)
      }
      if (leveragedRef.current.length > 0) {
        const enriched = await enrichLeveraged(leveragedRef.current)
        setLeveragedPositions(enriched)
        const lev = enriched.reduce((sum, p) => sum + Math.max(0, p.margin_usd + (p.live_pnl ?? 0)), 0)
        setLeveragedValue(lev)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [holdings.length, leveragedPositions.length])

  async function enrichHoldings(holdingsData: Holding[]) {
    return Promise.all(
      holdingsData.map(async (h) => {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${h.bybit_symbol}`)
          const data = await res.json()
          const ticker = data.result?.list?.[0]
          const currentPrice = ticker ? parseFloat(ticker.lastPrice) : h.avg_buy_price
          const currentValue = currentPrice * h.quantity
          const costBasis = h.avg_buy_price * h.quantity
          const pnl = currentValue - costBasis
          const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
          return { ...h, current_price: currentPrice, current_value: currentValue, pnl, pnl_percent: pnlPercent }
        } catch {
          const currentValue = h.avg_buy_price * h.quantity
          return { ...h, current_price: h.avg_buy_price, current_value: currentValue, pnl: 0, pnl_percent: 0 }
        }
      })
    )
  }

  async function enrichLeveraged(positions: LeveragedPosition[]) {
    return Promise.all(
      positions.map(async (p) => {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${p.bybit_symbol}`)
          const data = await res.json()
          const currentPrice = parseFloat(data.result?.list?.[0]?.lastPrice ?? p.entry_price)
          const priceChange = currentPrice - p.entry_price
          const pricePct = priceChange / p.entry_price
          const directedPct = p.direction === "long" ? pricePct : -pricePct
          const live_pnl = directedPct * p.size_usd
          const live_pnl_percent = directedPct * 100 * p.leverage
          return { ...p, current_price: currentPrice, live_pnl, live_pnl_percent }
        } catch {
          return { ...p, live_pnl: 0, live_pnl_percent: 0 }
        }
      })
    )
  }

  if (!isLoggedIn && !loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Log in to view your portfolio</p>
          <Link href="/" className="px-5 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            Go to home
          </Link>
        </div>
      </main>
    )
  }

  const totalPortfolioValue = (portfolio?.balance ?? 0) + totalValue + leveragedValue
  const startingBalance = portfolio?.starting_balance ?? 10000
  const truePnl = totalPortfolioValue - startingBalance
  const truePnlPercent = ((truePnl / startingBalance) * 100).toFixed(2)

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">Portfolio</h1>
          <p className="text-sm text-gray-400">Your virtual trading account</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-950 rounded-xl p-5">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-3 w-20" />
                <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Total value</p>
              <p className="text-xl font-bold">${formatUSD(totalPortfolioValue)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Cash balance</p>
              <p className="text-xl font-bold">${formatUSD(portfolio?.balance ?? 0)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Holdings value</p>
              <p className="text-xl font-bold">${formatUSD(totalValue + leveragedValue)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-5">
              <p className="text-xs text-gray-400 mb-1">Total P&L</p>
              <p className={`text-xl font-bold ${truePnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {truePnl >= 0 ? "+" : "-"}${formatUSD(Math.abs(truePnl))}
              </p>
              <p className={`text-xs mt-0.5 ${truePnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                {truePnl >= 0 ? "+" : ""}{truePnlPercent}% from ${formatUSD(startingBalance)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-900 mb-8">
          {([
            { key: "holdings", label: "Holdings", icon: BarChart2 },
            { key: "history", label: "Trade History", icon: Clock },
          ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Holdings tab */}
        {tab === "holdings" && (
          <div className="space-y-6">

            {/* Spot holdings */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-400">Spot holdings</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-900">
                    <th className="text-left px-6 py-4 font-medium text-gray-400">Coin</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Quantity</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Avg buy price</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Current price</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Value</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">P&L</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : holdings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <p className="text-gray-400 mb-2 text-sm">No spot holdings</p>
                        <Link href="/markets/all" className="text-xs text-gray-400 underline hover:text-black dark:hover:text-white">
                          Explore markets
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    holdings.map((h) => {
                      const pnl = h.pnl ?? 0
                      const pnlPercent = h.pnl_percent ?? 0
                      const positive = pnl >= 0
                      return (
                        <tr key={h.coin_id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {h.coin_image && (
                                <img src={h.coin_image} alt={h.coin_name} width={32} height={32} className="rounded-full w-8 h-8" onError={(e) => { e.currentTarget.style.display = "none" }} />
                              )}
                              <div>
                                <p className="font-medium">{h.coin_symbol}</p>
                                <p className="text-xs text-gray-400">{h.coin_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono">{h.quantity.toFixed(6)}</td>
                          <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono">${formatPrice(h.avg_buy_price)}</td>
                          <td className="px-6 py-4 text-right font-mono font-medium">${formatPrice(h.current_price ?? 0)}</td>
                          <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono">${formatUSD(h.current_value ?? 0)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className={`inline-flex flex-col items-end ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                              <span className="font-medium flex items-center gap-1">
                                {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {positive ? "+" : ""}${formatUSD(Math.abs(pnl))}
                              </span>
                              <span className="text-xs">{positive ? "+" : ""}{pnlPercent.toFixed(2)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/trade/${h.bybit_symbol}`} className="px-3 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                              Trade
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Leveraged positions */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-medium text-gray-400">Leveraged positions</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-900">
                    <th className="text-left px-6 py-4 font-medium text-gray-400">Coin</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Direction</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Size</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Entry</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Liq. price</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">P&L</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : leveragedPositions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <p className="text-gray-400 mb-2 text-sm">No open leveraged positions</p>
                        <Link href="/trade" className="text-xs text-gray-400 underline hover:text-black dark:hover:text-white">
                          Open a position
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    leveragedPositions.map((p) => {
                      const pnl = p.live_pnl ?? 0
                      const pnlPct = p.live_pnl_percent ?? 0
                      const positive = pnl >= 0
                      return (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {p.coin_image && (
                                <img src={p.coin_image} alt={p.coin_name} width={32} height={32} className="rounded-full w-8 h-8" onError={(e) => { e.currentTarget.style.display = "none" }} />
                              )}
                              <div>
                                <p className="font-medium">{p.coin_symbol}</p>
                                <p className="text-xs text-gray-400">{p.coin_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              p.direction === "long"
                                ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                                : "bg-red-50 dark:bg-red-950 text-red-500"
                            }`}>
                              {p.direction === "long" ? "LONG" : "SHORT"} {p.leverage}x
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono">${formatUSD(p.size_usd)}</td>
                          <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono">${formatPrice(p.entry_price)}</td>
                          <td className="px-6 py-4 text-right text-red-500 hidden md:table-cell font-mono">${formatPrice(p.liquidation_price)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className={`inline-flex flex-col items-end ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                              <span className="font-medium flex items-center gap-1">
                                {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {positive ? "+" : ""}${formatUSD(Math.abs(pnl))}
                              </span>
                              <span className="text-xs">{positive ? "+" : ""}{pnlPct.toFixed(2)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link href={`/trade/${p.bybit_symbol}`} className="px-3 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                              Manage
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trade history tab */}
        {tab === "history" && (
          <div className="space-y-6">

            {/* Spot trades */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-400">Spot trades</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-900">
                    <th className="text-left px-6 py-4 font-medium text-gray-400">Coin</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Type</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Quantity</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Price</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Total</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : trades.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-sm text-gray-400">No spot trades yet</p>
                      </td>
                    </tr>
                  ) : (
                    trades.map((t) => (
                      <tr key={t.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {t.coin_image && (
                              <img src={t.coin_image} alt={t.coin_name} width={32} height={32} className="rounded-full w-8 h-8" onError={(e) => { e.currentTarget.style.display = "none" }} />
                            )}
                            <div>
                              <p className="font-medium">{t.coin_symbol}</p>
                              <p className="text-xs text-gray-400">{t.coin_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            t.type === "buy"
                              ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                              : "bg-red-50 dark:bg-red-950 text-red-500"
                          }`}>
                            {t.type === "buy" ? "Buy" : "Sell"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono">{t.quantity.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right font-mono">${formatPrice(t.price)}</td>
                        <td className="px-6 py-4 text-right font-mono font-medium">${formatUSD(t.total)}</td>
                        <td className="px-6 py-4 text-right text-gray-400 hidden md:table-cell text-xs">
                          {new Date(t.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Closed leveraged positions */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-xs font-medium text-gray-400">Closed leveraged positions</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-900">
                    <th className="text-left px-6 py-4 font-medium text-gray-400">Coin</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Direction</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Size</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Entry → Close</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400">Result</th>
                    <th className="text-right px-6 py-4 font-medium text-gray-400 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : closedPositions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <p className="text-sm text-gray-400">No closed leveraged positions yet</p>
                      </td>
                    </tr>
                  ) : (
                    closedPositions.map((p) => {
                      const pnl = p.pnl ?? 0
                      const positive = pnl >= 0
                      const isLiquidated = p.pnl !== null && Math.abs(p.pnl + p.margin_usd) < 0.01
                      return (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {p.coin_image && (
                                <img src={p.coin_image} alt={p.coin_name} width={32} height={32} className="rounded-full w-8 h-8" onError={(e) => { e.currentTarget.style.display = "none" }} />
                              )}
                              <div>
                                <p className="font-medium">{p.coin_symbol}</p>
                                <p className="text-xs text-gray-400">{p.coin_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                p.direction === "long"
                                  ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                                  : "bg-red-50 dark:bg-red-950 text-red-500"
                              }`}>
                                {p.direction === "long" ? "LONG" : "SHORT"} {p.leverage}x
                              </span>
                              {isLiquidated && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-500 font-medium">
                                  Liquidated
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono">${formatUSD(p.size_usd)}</td>
                          <td className="px-6 py-4 text-right text-gray-500 hidden md:table-cell font-mono text-xs">
                            ${formatPrice(p.entry_price)} → ${formatPrice(p.close_price ?? 0)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={`inline-flex flex-col items-end ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                              <span className="font-medium flex items-center gap-1">
                                {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {positive ? "+" : ""}${formatUSD(Math.abs(pnl))}
                              </span>
                              <span className="text-xs font-medium">{positive ? "Win" : "Loss"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-400 hidden md:table-cell text-xs">
                            {p.closed_at ? new Date(p.closed_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            }) : "—"}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </main>
  )
}