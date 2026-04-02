"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { TrendingUp, TrendingDown, Star } from "lucide-react"
import { createClient } from "@/lib/client"

interface FavCoin {
  id: string
  coin_id: string
  coin_symbol: string
  coin_name: string
  coin_image: string
  bybit_symbol: string
  current_price: number | null
  price_change_percentage_24h: number | null
  high_24h: number | null
  low_24h: number | null
}

function formatPrice(price: number | null) {
  if (price === null || price === undefined || isNaN(price)) return "N/A"
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

export default function FavouritesPage() {
  const [coins, setCoins] = useState<FavCoin[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      setIsLoggedIn(true)

      const { data } = await supabase
        .from("favourites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data) {
        const mapped: FavCoin[] = data.map((f: any) => ({
          id: f.id,
          coin_id: f.coin_id,
          coin_symbol: f.coin_symbol,
          coin_name: f.coin_name,
          coin_image: f.coin_image,
          bybit_symbol: f.bybit_symbol,
          current_price: null,
          price_change_percentage_24h: null,
          high_24h: null,
          low_24h: null,
        }))
        setCoins(mapped)
        fetchPrices(mapped)
      }
      setLoading(false)
    })

    return () => {
      wsRef.current?.close()
      pollIntervalsRef.current.forEach((i) => clearInterval(i))
      pollIntervalsRef.current.clear()
    }
  }, [])

  async function fetchPrices(favCoins: FavCoin[]) {
    // fetch all prices via Bybit
    await Promise.all(
      favCoins.map(async (coin) => {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${coin.bybit_symbol}`)
          const data = await res.json()
          const updated = data.result?.list?.[0]
          if (!updated) return
          setCoins((prev) => prev.map((c) =>
            c.coin_id === coin.coin_id ? {
              ...c,
              current_price: parseFloat(updated.lastPrice),
              price_change_percentage_24h: parseFloat(updated.price24hPcnt) * 100,
              high_24h: parseFloat(updated.highPrice24h),
              low_24h: parseFloat(updated.lowPrice24h),
            } : c
          ))
        } catch (err) {
          console.error(`Failed to fetch price for ${coin.bybit_symbol}`, err)
        }
      })
    )

    // setup WebSocket for live updates
    setupWebSocket(favCoins)
  }

  function setupWebSocket(favCoins: FavCoin[]) {
    if (wsRef.current) wsRef.current.close()
    const symbols = favCoins.map((c) => `tickers.${c.bybit_symbol}`)
    if (symbols.length === 0) return

    const ws = new WebSocket("wss://stream.bybit.com/v5/public/spot")
    wsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ op: "subscribe", args: symbols }))
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.data && msg.data.symbol) {
        const sym = msg.data.symbol
        setCoins((prev) => prev.map((c) =>
          c.bybit_symbol === sym ? {
            ...c,
            current_price: msg.data.lastPrice ? parseFloat(msg.data.lastPrice) : c.current_price,
            price_change_percentage_24h: msg.data.price24hPcnt ? parseFloat(msg.data.price24hPcnt) * 100 : c.price_change_percentage_24h,
            high_24h: msg.data.highPrice24h ? parseFloat(msg.data.highPrice24h) : c.high_24h,
            low_24h: msg.data.lowPrice24h ? parseFloat(msg.data.lowPrice24h) : c.low_24h,
          } : c
        ))
      }
    }
    ws.onclose = () => setTimeout(() => setupWebSocket(favCoins), 3000)
    ws.onerror = () => ws.close()
  }

  async function removeFavourite(coinId: string) {
    if (!userId) return
    const supabase = createClient()
    await supabase.from("favourites").delete().eq("user_id", userId).eq("coin_id", coinId)
    setCoins((prev) => prev.filter((c) => c.coin_id !== coinId))
  }

  if (!isLoggedIn && !loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-xl border border-gray-100 dark:border-gray-900 py-24 text-center">
          <Star className="w-10 h-10 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Log in to save and view your favourite coins</p>
          <Link href="/" className="px-5 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            Go to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-16">
      <div className="rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950">
              <th className="w-10 px-4 py-4" />
              <th className="text-left px-4 py-4 font-medium text-gray-400">Coin</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400">Price</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400">24h %</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 hidden md:table-cell">24h High</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 hidden md:table-cell">24h Low</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : coins.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-24 text-center">
                  <Star className="w-10 h-10 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
                  <p className="text-gray-400 mb-1">No favourites yet</p>
                  <p className="text-xs text-gray-300 dark:text-gray-700">
                    Star a coin from the{" "}
                    <Link href="/markets/all" className="underline hover:text-black dark:hover:text-white">
                      All Markets
                    </Link>{" "}
                    tab to add it here
                  </p>
                </td>
              </tr>
            ) : (
              coins.map((coin) => {
                const change = coin.price_change_percentage_24h ?? 0
                const positive = change >= 0

                return (
                  <tr key={coin.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                    <td className="px-4 py-4">
                      <button onClick={() => removeFavourite(coin.coin_id)} className="text-yellow-400 hover:text-gray-300 transition-colors">
                        <Star className="w-4 h-4 fill-yellow-400" />
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img src={coin.coin_image} alt={coin.coin_name} width={32} height={32} className="rounded-full w-8 h-8" onError={(e) => { e.currentTarget.style.display = "none" }} />
                        <div>
                          <p className="font-medium">{coin.coin_symbol}</p>
                          <p className="text-xs text-gray-400">{coin.coin_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-medium">
                      {coin.current_price ? `$${formatPrice(coin.current_price)}` : (
                        <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse w-20 ml-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {coin.price_change_percentage_24h !== null ? (
                        <span className={`inline-flex items-center gap-1 font-medium ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {positive ? "+" : ""}{change.toFixed(2)}%
                        </span>
                      ) : (
                        <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse w-16 ml-auto" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500 hidden md:table-cell font-mono">
                      {coin.high_24h ? `$${formatPrice(coin.high_24h)}` : "—"}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-500 hidden md:table-cell font-mono">
                      {coin.low_24h ? `$${formatPrice(coin.low_24h)}` : "—"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link href={`/trade/${coin.bybit_symbol}`} className="px-3 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
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

      {coins.length > 0 && (
        <p className="text-xs text-gray-300 dark:text-gray-700 mt-6 text-center">
          Prices update live via Bybit WebSocket
        </p>
      )}
    </div>
  )
}