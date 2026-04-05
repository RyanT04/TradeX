"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/client"
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react"

interface LeveragedPanelProps {
  symbol: string
  coinId: string
  coinName: string
  coinImage: string
  currentPrice: number
  userId: string
  balance: number
  onBalanceChange: (newBalance: number) => void
}

interface Position {
  id: string
  direction: "long" | "short"
  leverage: number
  entry_price: number
  size_usd: number
  margin_usd: number
  liquidation_price: number
  coin_symbol: string
  bybit_symbol: string
  created_at: string
  current_price?: number
  pnl?: number
  pnl_percent?: number
}

const LEVERAGE_OPTIONS = [2, 5, 10, 25, 50]

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

function calcLiquidationPrice(entryPrice: number, leverage: number, direction: "long" | "short") {
  if (direction === "long") return entryPrice * (1 - 1 / leverage)
  else return entryPrice * (1 + 1 / leverage)
}

function calcPnl(position: Position, currentPrice: number) {
  const priceChange = currentPrice - position.entry_price
  const pricePct = priceChange / position.entry_price
  const directedPct = position.direction === "long" ? pricePct : -pricePct
  const pnl = directedPct * position.size_usd
  const pnlPercent = directedPct * 100 * position.leverage
  return { pnl, pnlPercent }
}

export function LeveragedPanel({
  symbol, coinId, coinName, coinImage, currentPrice, userId, balance, onBalanceChange
}: LeveragedPanelProps) {
  const [direction, setDirection] = useState<"long" | "short">("long")
  const [leverage, setLeverage] = useState(10)
  const [margin, setMargin] = useState("")
  const [positions, setPositions] = useState<Position[]>([])
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMsg, setOrderMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const positionsRef = useRef<Position[]>([])

  useEffect(() => { positionsRef.current = positions }, [positions])

  const marginNum = parseFloat(margin) || 0
  const positionSize = marginNum * leverage
  const liqPrice = currentPrice > 0 ? calcLiquidationPrice(currentPrice, leverage, direction) : 0

  const fetchPositions = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("leveraged_positions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_open", true)
      .order("created_at", { ascending: false })
    if (data) {
      const enriched = data.map((p: Position) => {
        const { pnl, pnlPercent } = calcPnl(p, currentPrice)
        return { ...p, current_price: currentPrice, pnl, pnl_percent: pnlPercent }
      })
      setPositions(enriched)
    }
  }, [userId, currentPrice])

  useEffect(() => {
    if (userId) fetchPositions()
  }, [userId])

  useEffect(() => {
    if (!userId || positionsRef.current.length === 0) return

    const interval = setInterval(async () => {
      const supabase = createClient()
      const toCheck = positionsRef.current

      for (const pos of toCheck) {
        let livePrice = currentPrice
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pos.bybit_symbol}`)
          const data = await res.json()
          livePrice = parseFloat(data.result?.list?.[0]?.lastPrice ?? currentPrice)
        } catch {}

        const isLiquidated = pos.direction === "long"
          ? livePrice <= pos.liquidation_price
          : livePrice >= pos.liquidation_price

        if (isLiquidated) {
          await supabase.from("leveraged_positions").update({
            is_open: false,
            closed_at: new Date().toISOString(),
            close_price: livePrice,
            pnl: -pos.margin_usd,
          }).eq("id", pos.id)

          setPositions((prev) => prev.filter((p) => p.id !== pos.id))
          setOrderMsg({ text: `⚠ Position liquidated! Lost $${formatUSD(pos.margin_usd)} margin.`, type: "error" })
          setTimeout(() => setOrderMsg(null), 6000)
        } else {
          const { pnl, pnlPercent } = calcPnl(pos, livePrice)
          setPositions((prev) => prev.map((p) =>
            p.id === pos.id ? { ...p, current_price: livePrice, pnl, pnl_percent: pnlPercent } : p
          ))
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [userId, positionsRef.current.length])

  async function handleOpenPosition() {
    if (!userId || !margin || marginNum <= 0 || currentPrice <= 0) return
    setOrderLoading(true)
    setOrderMsg(null)

    if (marginNum > balance + 0.01) {
      setOrderMsg({ text: "Insufficient balance", type: "error" })
      setOrderLoading(false)
      return
    }

    const actualMargin = Math.min(marginNum, balance)
    const size = actualMargin * leverage
    const liqPriceCalc = calcLiquidationPrice(currentPrice, leverage, direction)
    const newBalance = Math.max(0, balance - actualMargin)

    const supabase = createClient()
    await supabase.from("portfolios").update({ balance: newBalance }).eq("user_id", userId)

    const { data, error } = await supabase.from("leveraged_positions").insert({
      user_id: userId,
      coin_id: coinId,
      coin_symbol: symbol.replace("USDT", ""),
      coin_name: coinName,
      coin_image: coinImage,
      bybit_symbol: symbol,
      direction,
      leverage,
      entry_price: currentPrice,
      size_usd: size,
      margin_usd: actualMargin,
      liquidation_price: liqPriceCalc,
    }).select().single()

    if (error) {
      setOrderMsg({ text: "Failed to open position", type: "error" })
    } else {
      onBalanceChange(newBalance)
      setMargin("")
      const { pnl, pnlPercent } = calcPnl(data, currentPrice)
      setPositions((prev) => [{ ...data, current_price: currentPrice, pnl, pnl_percent: pnlPercent }, ...prev])
      setOrderMsg({ text: `Opened ${direction.toUpperCase()} ${leverage}x — $${formatUSD(size)} position`, type: "success" })
    }

    setOrderLoading(false)
    setTimeout(() => setOrderMsg(null), 5000)
  }

  async function handleClosePosition(pos: Position) {
    setClosingId(pos.id)
    const supabase = createClient()

    let closePrice = currentPrice
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pos.bybit_symbol}`)
      const data = await res.json()
      closePrice = parseFloat(data.result?.list?.[0]?.lastPrice ?? currentPrice)
    } catch {}

    const { pnl } = calcPnl(pos, closePrice)
    const returnAmount = pos.margin_usd + pnl
    const newBalance = balance + Math.max(0, returnAmount)

    await supabase.from("leveraged_positions").update({
      is_open: false,
      closed_at: new Date().toISOString(),
      close_price: closePrice,
      pnl,
    }).eq("id", pos.id)

    await supabase.from("portfolios").update({ balance: newBalance }).eq("user_id", userId)

    onBalanceChange(newBalance)
    setPositions((prev) => prev.filter((p) => p.id !== pos.id))
    setOrderMsg({
      text: `Closed position — ${pnl >= 0 ? "+" : ""}$${formatUSD(pnl)} P&L`,
      type: pnl >= 0 ? "success" : "error"
    })
    setTimeout(() => setOrderMsg(null), 5000)
    setClosingId(null)
  }

  const thisSymbolPositions = positions.filter((p) => p.bybit_symbol === symbol)
  const otherPositions = positions.filter((p) => p.bybit_symbol !== symbol)

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-900 p-5 space-y-5">

      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        <h3 className="text-sm font-semibold">Leveraged Trading</h3>
        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400">
          High risk
        </span>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-gray-100 dark:border-gray-900">
        <button
          onClick={() => setDirection("long")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            direction === "long" ? "bg-green-500 text-white" : "text-gray-400 hover:text-black dark:hover:text-white"
          }`}
        >
          Long ↑
        </button>
        <button
          onClick={() => setDirection("short")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            direction === "short" ? "bg-red-500 text-white" : "text-gray-400 hover:text-black dark:hover:text-white"
          }`}
        >
          Short ↓
        </button>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">Leverage</p>
        <div className="flex gap-1.5">
          {LEVERAGE_OPTIONS.map((lev) => (
            <button
              key={lev}
              onClick={() => setLeverage(lev)}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                leverage === lev
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {lev}x
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-2">Margin (collateral)</p>
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors font-mono"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USD</span>
        </div>
        <div className="flex gap-1 mt-1.5">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => setMargin(((balance * pct) / 100).toFixed(2))}
              className="flex-1 text-xs py-1 border border-gray-200 dark:border-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-gray-400"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {marginNum > 0 && currentPrice > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Position size</span>
            <span className="font-mono font-medium">${formatUSD(positionSize)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Entry price</span>
            <span className="font-mono">${formatPrice(currentPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className={`font-medium ${direction === "long" ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
              Liquidation price
            </span>
            <span className={`font-mono font-medium ${direction === "long" ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
              ${formatPrice(liqPrice)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 dark:border-gray-800 pt-1.5">
            <span className="text-gray-400">Max loss</span>
            <span className="font-mono text-red-500">-${formatUSD(marginNum)}</span>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Leveraged trading is high risk. You can lose your entire margin if the price hits your liquidation price.
        </p>
      </div>

      <button
        onClick={handleOpenPosition}
        disabled={orderLoading || !margin || marginNum <= 0 || currentPrice <= 0}
        className={`w-full py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
          direction === "long"
            ? "bg-green-500 hover:bg-green-600 text-white"
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        {orderLoading ? "Opening..." : `Open ${direction === "long" ? "Long" : "Short"} ${leverage}x`}
      </button>

      {orderMsg && (
        <div className={`p-3 rounded-lg text-xs ${
          orderMsg.type === "success"
            ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
            : "bg-red-50 dark:bg-red-950 text-red-500"
        }`}>
          {orderMsg.text}
        </div>
      )}

      {thisSymbolPositions.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 font-medium mb-3">Open positions</p>
          <div className="space-y-3">
            {thisSymbolPositions.map((pos) => {
              const pnl = pos.pnl ?? 0
              const pnlPct = pos.pnl_percent ?? 0
              const positive = pnl >= 0
              return (
                <div key={pos.id} className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg space-y-2">

                  {/* Direction + leverage */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-sm font-bold ${
                      pos.direction === "long"
                        ? "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-950 text-red-500"
                    }`}>
                      {pos.direction === "long" ? "LONG" : "SHORT"}
                    </span>
                    <span className="text-sm font-semibold">{pos.leverage}x leverage</span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Size</span>
                      <span className="font-mono font-medium">${formatUSD(pos.size_usd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Entry</span>
                      <span className="font-mono">${formatPrice(pos.entry_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liq.</span>
                      <span className="font-mono text-red-500">${formatPrice(pos.liquidation_price)}</span>
                    </div>
                  </div>

                  {/* P&L */}
                  <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-2">
                    <span className="text-sm text-gray-400">P&L</span>
                    <span className={`font-medium font-mono flex items-center gap-1 text-sm ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {positive ? "+" : ""}{pnlPct.toFixed(2)}%
                      <span className={positive ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                        ({positive ? "+" : ""}${formatUSD(Math.abs(pnl))})
                      </span>
                    </span>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => handleClosePosition(pos)}
                    disabled={closingId === pos.id}
                    className="w-full py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    {closingId === pos.id ? "Closing..." : "Close position"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {otherPositions.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 font-medium mb-3">Other open positions</p>
          <div className="space-y-2">
            {otherPositions.map((pos) => {
              const pnl = pos.pnl ?? 0
              const positive = pnl >= 0
              return (
                <div key={pos.id} className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      pos.direction === "long"
                        ? "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
                        : "bg-red-100 dark:bg-red-950 text-red-500"
                    }`}>
                      {pos.coin_symbol} {pos.direction.toUpperCase()} {pos.leverage}x
                    </span>
                    <span className={`font-mono font-medium ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {positive ? "+" : ""}${formatUSD(pnl)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}