"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/client"
import { TrendingUp, TrendingDown } from "lucide-react"
import Link from "next/link"
import { LeveragedPanel } from "./Leveragedpanel"

interface PageProps {
  params: Promise<{ symbol: string }>
}

interface Ticker {
  lastPrice: number
  price24hPcnt: number
  highPrice24h: number
  lowPrice24h: number
  volume24h: number
}

interface Position {
  quantity: number
  avg_buy_price: number
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

const INTERVALS = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
]

type TradeMode = "spot" | "leverage"

export default function TradePage({ params }: PageProps) {
  const [symbol, setSymbol] = useState("")
  const [coinName, setCoinName] = useState("")
  const [coinImage, setCoinImage] = useState("")
  const [coinId, setCoinId] = useState("")
  const [ticker, setTicker] = useState<Ticker | null>(null)
  const [interval, setInterval] = useState("60")
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy")
  const [amount, setAmount] = useState("")
  const [amountType, setAmountType] = useState<"usd" | "coin">("usd")
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderMessage, setOrderMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [balance, setBalance] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [tradeMode, setTradeMode] = useState<TradeMode>("spot")

  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    params.then(({ symbol: sym }) => {
      const upper = sym.toUpperCase()
      setSymbol(upper)
      localStorage.setItem("lastTradedSymbol", upper)
    })
  }, [params])

  useEffect(() => {
    if (!symbol) return
    const base = symbol.replace("USDT", "").toLowerCase()
    fetch(`https://api.coingecko.com/api/v3/coins/${base}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setCoinName(data.name)
        if (data.image?.small) setCoinImage(data.image.small)
        if (data.id) setCoinId(data.id)
      })
      .catch(() => setCoinName(symbol.replace("USDT", "")))
  }, [symbol])

  useEffect(() => {
    if (!symbol) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setIsLoggedIn(true)
      setUserId(user.id)

      const { data: portfolioData } = await supabase
        .from("portfolios")
        .select("balance")
        .eq("user_id", user.id)
        .single()
      if (portfolioData) setBalance(portfolioData.balance)

      const { data: holdingData } = await supabase
        .from("holdings")
        .select("quantity, avg_buy_price")
        .eq("user_id", user.id)
        .eq("bybit_symbol", symbol)
        .single()
      if (holdingData) setPosition(holdingData)
    })
  }, [symbol])

  const fetchTicker = useCallback(async () => {
    if (!symbol) return
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`)
      const data = await res.json()
      const t = data.result?.list?.[0]
      if (t) {
        setTicker({
          lastPrice: parseFloat(t.lastPrice),
          price24hPcnt: parseFloat(t.price24hPcnt) * 100,
          highPrice24h: parseFloat(t.highPrice24h),
          lowPrice24h: parseFloat(t.lowPrice24h),
          volume24h: parseFloat(t.volume24h),
        })
      }
    } catch (err) {
      console.error("Failed to fetch ticker", err)
    }
  }, [symbol])

  useEffect(() => {
    if (!symbol) return
    fetchTicker()
    const tickerInterval = window.setInterval(fetchTicker, 3000)
    return () => window.clearInterval(tickerInterval)
  }, [symbol, fetchTicker])

  useEffect(() => {
    if (!symbol || !chartContainerRef.current) return

    const initChart = async () => {
      const { createChart, CandlestickSeries } = await import("lightweight-charts")

      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }

      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches

      const chart = createChart(chartContainerRef.current!, {
        width: chartContainerRef.current!.clientWidth,
        height: 420,
        layout: {
          background: { color: isDark ? "#000000" : "#ffffff" },
          textColor: isDark ? "#9ca3af" : "#6b7280",
        },
        grid: {
          vertLines: { color: isDark ? "#111111" : "#f3f4f6" },
          horzLines: { color: isDark ? "#111111" : "#f3f4f6" },
        },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: isDark ? "#1f2937" : "#e5e7eb" },
        timeScale: {
          borderColor: isDark ? "#1f2937" : "#e5e7eb",
          timeVisible: true,
          secondsVisible: false,
        },
      })

      chartRef.current = chart

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      })

      seriesRef.current = series
      await loadKlineData(series, symbol, interval)
      setLoading(false)

      const ro = new ResizeObserver(() => {
        if (chartContainerRef.current && chart) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth })
        }
      })
      ro.observe(chartContainerRef.current!)
      return () => { ro.disconnect() }
    }

    initChart()
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [symbol])

  useEffect(() => {
    if (!seriesRef.current || !symbol) return
    setLoading(true)
    loadKlineData(seriesRef.current, symbol, interval).then(() => setLoading(false))
  }, [interval, symbol])

  async function loadKlineData(series: any, sym: string, int: string) {
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${sym}&interval=${int}&limit=200`)
      const data = await res.json()
      const candles = data.result?.list ?? []
      const formatted = candles
        .map((c: string[]) => ({
          time: Math.floor(parseInt(c[0]) / 1000) as any,
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
        }))
        .reverse()
      series.setData(formatted)
    } catch (err) {
      console.error("Failed to load kline data", err)
    }
  }

  useEffect(() => {
    if (!symbol) return
    const ws = new WebSocket("wss://stream.bybit.com/v5/public/spot")
    wsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ op: "subscribe", args: [`kline.${interval}.${symbol}`] }))
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.data && msg.data[0] && seriesRef.current) {
        const candle = msg.data[0]
        seriesRef.current.update({
          time: Math.floor(parseInt(candle.start) / 1000) as any,
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
        })
      }
    }
    ws.onclose = () => {}
    ws.onerror = () => ws.close()
    return () => ws.close()
  }, [symbol, interval])

  async function handleOrder() {
    if (!userId || !symbol || !amount || !ticker) return
    setOrderLoading(true)
    setOrderMessage(null)

    const supabase = createClient()
    const currentPrice = ticker.lastPrice
    const amountNum = parseFloat(amount)

    if (isNaN(amountNum) || amountNum <= 0) {
      setOrderMessage({ text: "Please enter a valid amount", type: "error" })
      setOrderLoading(false)
      return
    }

    const usdAmount = amountType === "usd" ? amountNum : amountNum * currentPrice
    const coinAmount = amountType === "usd" ? amountNum / currentPrice : amountNum

    try {
      if (orderType === "buy") {
        if (usdAmount > balance + 0.01) {
          setOrderMessage({ text: "Insufficient balance", type: "error" })
          setOrderLoading(false)
          return
        }

        const actualUsdAmount = Math.min(usdAmount, balance)
        const actualCoinAmount = actualUsdAmount / currentPrice
        const newBalance = Math.max(0, balance - actualUsdAmount)

        await supabase.from("portfolios").update({ balance: newBalance }).eq("user_id", userId)

        const { data: existing } = await supabase
          .from("holdings")
          .select("quantity, avg_buy_price")
          .eq("user_id", userId)
          .eq("bybit_symbol", symbol)
          .single()

        if (existing) {
          const newQty = existing.quantity + actualCoinAmount
          const newAvg = ((existing.avg_buy_price * existing.quantity) + (currentPrice * actualCoinAmount)) / newQty
          await supabase.from("holdings").update({
            quantity: newQty,
            avg_buy_price: newAvg,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId).eq("bybit_symbol", symbol)
          setPosition({ quantity: newQty, avg_buy_price: newAvg })
        } else {
          await supabase.from("holdings").insert({
            user_id: userId,
            coin_id: coinId || symbol.replace("USDT", "").toLowerCase(),
            coin_symbol: symbol.replace("USDT", ""),
            coin_name: coinName || symbol.replace("USDT", ""),
            coin_image: coinImage,
            bybit_symbol: symbol,
            quantity: actualCoinAmount,
            avg_buy_price: currentPrice,
          })
          setPosition({ quantity: actualCoinAmount, avg_buy_price: currentPrice })
        }

        await supabase.from("trades").insert({
          user_id: userId,
          coin_id: coinId || symbol.replace("USDT", "").toLowerCase(),
          coin_symbol: symbol.replace("USDT", ""),
          coin_name: coinName || symbol.replace("USDT", ""),
          coin_image: coinImage,
          bybit_symbol: symbol,
          type: "buy",
          quantity: actualCoinAmount,
          price: currentPrice,
          total: actualUsdAmount,
        })

        setBalance(newBalance)
        setOrderMessage({ text: `Bought ${actualCoinAmount.toFixed(6)} ${symbol.replace("USDT", "")} at $${formatPrice(currentPrice)}`, type: "success" })

      } else {
        const currentQty = position?.quantity ?? 0
        if (coinAmount > currentQty + 0.000001) {
          setOrderMessage({ text: "Insufficient holdings", type: "error" })
          setOrderLoading(false)
          return
        }

        const actualCoinAmount = Math.min(coinAmount, currentQty)
        const proceeds = actualCoinAmount * currentPrice
        const newBalance = balance + proceeds
        const newQty = currentQty - actualCoinAmount

        await supabase.from("portfolios").update({ balance: newBalance }).eq("user_id", userId)

        if (newQty <= 0.000001) {
          await supabase.from("holdings").delete().eq("user_id", userId).eq("bybit_symbol", symbol)
          setPosition(null)
        } else {
          await supabase.from("holdings").update({
            quantity: newQty,
            updated_at: new Date().toISOString(),
          }).eq("user_id", userId).eq("bybit_symbol", symbol)
          setPosition((prev) => prev ? { ...prev, quantity: newQty } : null)
        }

        await supabase.from("trades").insert({
          user_id: userId,
          coin_id: coinId || symbol.replace("USDT", "").toLowerCase(),
          coin_symbol: symbol.replace("USDT", ""),
          coin_name: coinName || symbol.replace("USDT", ""),
          coin_image: coinImage,
          bybit_symbol: symbol,
          type: "sell",
          quantity: actualCoinAmount,
          price: currentPrice,
          total: proceeds,
        })

        setBalance(newBalance)
        setOrderMessage({ text: `Sold ${actualCoinAmount.toFixed(6)} ${symbol.replace("USDT", "")} at $${formatPrice(currentPrice)}`, type: "success" })
      }

      setAmount("")
    } catch (err) {
      console.error("Order failed", err)
      setOrderMessage({ text: "Order failed, please try again", type: "error" })
    }

    setOrderLoading(false)
    setTimeout(() => setOrderMessage(null), 5000)
  }

  const coinSymbol = symbol.replace("USDT", "")
  const change = ticker?.price24hPcnt ?? 0
  const positive = change >= 0
  const orderUsdValue = amount
    ? amountType === "usd" ? parseFloat(amount) : parseFloat(amount) * (ticker?.lastPrice ?? 0)
    : 0
  const orderCoinValue = amount
    ? amountType === "coin" ? parseFloat(amount) : parseFloat(amount) / (ticker?.lastPrice ?? 1)
    : 0

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {coinImage && <img src={coinImage} alt={coinName} className="w-8 h-8 rounded-full" />}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{coinSymbol}/USDT</h1>
                {ticker && (
                  <span className={`text-sm font-medium flex items-center gap-1 ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {positive ? "+" : ""}{change.toFixed(2)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{coinName}</p>
            </div>
          </div>
          <Link href="/markets/all" className="text-sm text-gray-400 hover:text-black dark:hover:text-white transition-colors">
            ← Back to markets
          </Link>
        </div>

        {ticker && (
          <div className="flex flex-wrap gap-6 mb-6 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Price</p>
              <p className="text-2xl font-bold font-mono">${formatPrice(ticker.lastPrice)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">24h High</p>
              <p className="font-mono font-medium">${formatPrice(ticker.highPrice24h)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">24h Low</p>
              <p className="font-mono font-medium">${formatPrice(ticker.lowPrice24h)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">24h Volume</p>
              <p className="font-mono font-medium">{ticker.volume24h.toLocaleString("en-US", { maximumFractionDigits: 2 })} {coinSymbol}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Chart */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-1 mb-3">
              {INTERVALS.map((i) => (
                <button
                  key={i.value}
                  onClick={() => setInterval(i.value)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    interval === i.value
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-gray-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-black z-10">
                  <div className="text-sm text-gray-400">Loading chart...</div>
                </div>
              )}
              <div ref={chartContainerRef} className="w-full" />
            </div>
          </div>

          {/* Order panel */}
          <div className="lg:col-span-2">

            {/* Mode tabs */}
            <div className="flex rounded-lg overflow-hidden border border-gray-100 dark:border-gray-900">
              <button
                onClick={() => setTradeMode("spot")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tradeMode === "spot"
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-gray-400 hover:text-black dark:hover:text-white"
                }`}
              >
                Spot
              </button>
              <button
                onClick={() => setTradeMode("leverage")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tradeMode === "leverage"
                    ? "bg-black dark:bg-white text-white dark:text-black"
                    : "text-gray-400 hover:text-black dark:hover:text-white"
                }`}
              >
                ⚡ Leverage
              </button>
            </div>

            {tradeMode === "spot" ? (
              <div className="rounded-xl border border-gray-100 dark:border-gray-900 p-5">

                <div className="flex rounded-lg overflow-hidden border border-gray-100 dark:border-gray-900 mb-5">
                  <button
                    onClick={() => setOrderType("buy")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      orderType === "buy" ? "bg-green-500 text-white" : "text-gray-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => setOrderType("sell")}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      orderType === "sell" ? "bg-red-500 text-white" : "text-gray-400 hover:text-black dark:hover:text-white"
                    }`}
                  >
                    Sell
                  </button>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Cash balance</span>
                    <span className="font-mono font-medium">${formatUSD(balance)}</span>
                  </div>
                  {position && position.quantity > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{coinSymbol} held</span>
                      <span className="font-mono font-medium">{position.quantity.toFixed(6)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setAmountType("usd")}
                    className={`text-xs px-2 py-1 rounded transition-colors ${amountType === "usd" ? "bg-gray-100 dark:bg-gray-900 font-medium" : "text-gray-400"}`}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => setAmountType("coin")}
                    className={`text-xs px-2 py-1 rounded transition-colors ${amountType === "coin" ? "bg-gray-100 dark:bg-gray-900 font-medium" : "text-gray-400"}`}
                  >
                    {coinSymbol}
                  </button>
                </div>

                <div className="relative mb-3">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {amountType === "usd" ? "USD" : coinSymbol}
                  </span>
                </div>

                {orderType === "buy" && (
                  <div className="flex gap-1 mb-4">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => { setAmount(((balance * pct) / 100).toFixed(2)); setAmountType("usd") }}
                        className="flex-1 text-xs py-1 border border-gray-200 dark:border-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-gray-400"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}

                {orderType === "sell" && position && (
                  <div className="flex gap-1 mb-4">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => { setAmount(((position.quantity * pct) / 100).toFixed(6)); setAmountType("coin") }}
                        className="flex-1 text-xs py-1 border border-gray-200 dark:border-gray-800 rounded hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-gray-400"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}

                {amount && ticker && parseFloat(amount) > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price</span>
                      <span className="font-mono">${formatPrice(ticker.lastPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{coinSymbol} amount</span>
                      <span className="font-mono">{orderCoinValue.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t border-gray-200 dark:border-gray-800 pt-1.5">
                      <span className="text-gray-400">Total</span>
                      <span className="font-mono">${formatUSD(orderUsdValue)}</span>
                    </div>
                  </div>
                )}

                {isLoggedIn ? (
                  <button
                    onClick={handleOrder}
                    disabled={orderLoading || !amount || parseFloat(amount) <= 0}
                    className={`w-full py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      orderType === "buy"
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {orderLoading ? "Processing..." : orderType === "buy" ? `Buy ${coinSymbol}` : `Sell ${coinSymbol}`}
                  </button>
                ) : (
                  <Link href="/" className="block w-full py-3 text-sm font-medium text-center rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                    Log in to trade
                  </Link>
                )}

                {orderMessage && (
                  <div className={`mt-3 p-3 rounded-lg text-xs ${
                    orderMessage.type === "success"
                      ? "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-950 text-red-500"
                  }`}>
                    {orderMessage.text}
                  </div>
                )}

                {position && position.quantity > 0 && ticker && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-900 space-y-1.5 text-xs">
                    <p className="text-gray-400 font-medium mb-2">Your position</p>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quantity</span>
                      <span className="font-mono">{position.quantity.toFixed(6)} {coinSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg buy price</span>
                      <span className="font-mono">${formatPrice(position.avg_buy_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current value</span>
                      <span className="font-mono">${formatUSD(position.quantity * ticker.lastPrice)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-400">P&L</span>
                      <span className={`font-mono ${
                        position.quantity * ticker.lastPrice - position.quantity * position.avg_buy_price >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-500"
                      }`}>
                        {(() => {
                          const pnl = position.quantity * ticker.lastPrice - position.quantity * position.avg_buy_price
                          return `${pnl >= 0 ? "+" : ""}$${formatUSD(Math.abs(pnl))}`
                        })()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              isLoggedIn && userId ? (
                <LeveragedPanel
                  symbol={symbol}
                  coinId={coinId}
                  coinName={coinName}
                  coinImage={coinImage}
                  currentPrice={ticker?.lastPrice ?? 0}
                  userId={userId}
                  balance={balance}
                  onBalanceChange={(newBalance) => setBalance(newBalance)}
                />
              ) : (
                <div className="rounded-xl border border-gray-100 dark:border-gray-900 p-5">
                  <Link href="/" className="block w-full py-3 text-sm font-medium text-center rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
                    Log in to trade
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  )
}