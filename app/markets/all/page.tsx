"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, TrendingUp, TrendingDown, ArrowUpDown, Star } from "lucide-react"
import { createClient } from "@/lib/client"

interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  price_change_percentage_24h: number
  high_24h: number
  low_24h: number
  total_volume: number
  market_cap: number
  bybitSymbol: string
}

const PAGE_SIZE = 20

const COINGECKO_TO_BYBIT: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  binancecoin: "BNBUSDT",
  ripple: "XRPUSDT",
  cardano: "ADAUSDT",
  dogecoin: "DOGEUSDT",
  "avalanche-2": "AVAXUSDT",
  polkadot: "DOTUSDT",
  "matic-network": "MATICUSDT",
  chainlink: "LINKUSDT",
  uniswap: "UNIUSDT",
  litecoin: "LTCUSDT",
  cosmos: "ATOMUSDT",
  "near-protocol": "NEARUSDT",
  aptos: "APTUSDT",
  arbitrum: "ARBUSDT",
  optimism: "OPUSDT",
  "injective-protocol": "INJUSDT",
  sui: "SUIUSDT",
}

const POPULAR_IDS = Object.keys(COINGECKO_TO_BYBIT)

function formatPrice(price: number | null) {
  if (price === null || price === undefined || isNaN(price)) return "N/A"
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 1) return price.toFixed(4)
  return price.toFixed(6)
}

function formatVolume(vol: number | null) {
  if (vol === null || vol === undefined || isNaN(vol)) return "N/A"
  if (vol >= 1_000_000_000) return `$${(vol / 1_000_000_000).toFixed(2)}B`
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`
  return `$${(vol / 1_000).toFixed(2)}K`
}

type SortKey = "name" | "current_price" | "price_change_percentage_24h" | "total_volume"
type SortDir = "asc" | "desc"

export default function AllMarketsPage() {
  const [popularCoins, setPopularCoins] = useState<Coin[]>([])
  const [extraCoins, setExtraCoins] = useState<Coin[]>([])
  const [searchResults, setSearchResults] = useState<Coin[]>([])
  const [showExtra, setShowExtra] = useState(false)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("total_volume")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [favourites, setFavourites] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [loginPrompt, setLoginPrompt] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const pollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const extraCoinsCountRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from("favourites").select("coin_id").eq("user_id", user.id)
      if (data) setFavourites(new Set(data.map((f: any) => f.coin_id)))
    })
  }, [])

  async function toggleFavourite(coin: Coin) {
    if (!userId) {
      setLoginPrompt(true)
      setTimeout(() => setLoginPrompt(false), 3000)
      return
    }
    const supabase = createClient()
    const isFav = favourites.has(coin.id)
    if (isFav) {
      await supabase.from("favourites").delete().eq("user_id", userId).eq("coin_id", coin.id)
      setFavourites((prev) => { const next = new Set(prev); next.delete(coin.id); return next })
    } else {
      await supabase.from("favourites").insert({
        user_id: userId,
        coin_id: coin.id,
        coin_symbol: coin.symbol,
        coin_name: coin.name,
        coin_image: coin.image,
        bybit_symbol: coin.bybitSymbol,
      })
      setFavourites((prev) => new Set(prev).add(coin.id))
    }
  }

  async function fetchPopularCoins() {
    try {
      let res: Response
      try {
        const ids = POPULAR_IDS.join(",")
        res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`)
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 15000))
        return fetchPopularCoins()
      }
      if (res.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 15000))
        return fetchPopularCoins()
      }
      const data = await res.json()
      if (!Array.isArray(data)) return
      const mapped: Coin[] = data.map((c: any) => ({
        id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image,
        current_price: c.current_price, price_change_percentage_24h: c.price_change_percentage_24h,
        high_24h: c.high_24h, low_24h: c.low_24h, total_volume: c.total_volume,
        market_cap: c.market_cap, bybitSymbol: COINGECKO_TO_BYBIT[c.id],
      }))
      const ordered = POPULAR_IDS.map((id) => mapped.find((c) => c.id === id)).filter(Boolean) as Coin[]
      setPopularCoins(ordered)
      setLastUpdated(new Date())
      setLoading(false)
    } catch (err) {
      console.error("Failed to fetch popular coins", err)
      setLoading(false)
    }
  }

  async function fetchExtraCoins(pageNum: number, append = false) {
    try {
      let res: Response
      try {
        res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PAGE_SIZE}&page=${pageNum}&sparkline=false&price_change_percentage=24h`)
      } catch {
        setRetryMessage("Rate limited — retrying in 15s...")
        await new Promise((resolve) => setTimeout(resolve, 15000))
        setRetryMessage(null)
        return fetchExtraCoins(pageNum, append)
      }
      if (res.status === 429) {
        setRetryMessage("Rate limited — retrying in 15s...")
        await new Promise((resolve) => setTimeout(resolve, 15000))
        setRetryMessage(null)
        return fetchExtraCoins(pageNum, append)
      }
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) { setHasMore(false); return }
      const mapped: Coin[] = data.filter((c: any) => !POPULAR_IDS.includes(c.id)).map((c: any) => ({
        id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image,
        current_price: c.current_price, price_change_percentage_24h: c.price_change_percentage_24h,
        high_24h: c.high_24h, low_24h: c.low_24h, total_volume: c.total_volume,
        market_cap: c.market_cap, bybitSymbol: `${c.symbol.toUpperCase()}USDT`,
      }))
      if (append) {
        setExtraCoins((prev) => {
          const existingIds = new Set(prev.map((c) => c.id))
          const newCoins = mapped.filter((c) => !existingIds.has(c.id))
          extraCoinsCountRef.current = prev.length + newCoins.length
          if (newCoins.length === 0) setHasMore(false)
          return [...prev, ...newCoins]
        })
      } else {
        extraCoinsCountRef.current = mapped.length
        setExtraCoins(mapped)
      }
      if (data.length < PAGE_SIZE) setHasMore(false)
    } catch (err) {
      console.error("Failed to fetch extra coins", err)
    }
  }

  async function searchCoins(query: string) {
    if (!query) { setSearchResults([]); return }
    setIsSearching(true)
    try {
      let res: Response
      try {
        res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`)
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 10000))
        return searchCoins(query)
      }
      if (res.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 10000))
        return searchCoins(query)
      }
      const data = await res.json()
      if (!Array.isArray(data)) return
      const mapped: Coin[] = data.map((c: any) => ({
        id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, image: c.image,
        current_price: c.current_price, price_change_percentage_24h: c.price_change_percentage_24h,
        high_24h: c.high_24h, low_24h: c.low_24h, total_volume: c.total_volume,
        market_cap: c.market_cap, bybitSymbol: COINGECKO_TO_BYBIT[c.id] ?? `${c.symbol.toUpperCase()}USDT`,
      }))
      setSearchResults(mapped.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.symbol.toLowerCase().includes(query.toLowerCase())
      ))
    } catch (err) {
      console.error("Search failed", err)
    } finally {
      setIsSearching(false)
    }
  }

  function setupWebSocket(coins: Coin[]) {
    if (wsRef.current) wsRef.current.close()
    const symbols = coins.map((c) => `tickers.${c.bybitSymbol}`)
    if (symbols.length === 0) return
    const ws = new WebSocket("wss://stream.bybit.com/v5/public/spot")
    wsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ op: "subscribe", args: symbols }))
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.data && msg.data.symbol) {
        const sym = msg.data.symbol
        setPopularCoins((prev) => prev.map((c) =>
          c.bybitSymbol === sym ? {
            ...c,
            current_price: msg.data.lastPrice ? parseFloat(msg.data.lastPrice) : c.current_price,
            high_24h: msg.data.highPrice24h ? parseFloat(msg.data.highPrice24h) : c.high_24h,
            low_24h: msg.data.lowPrice24h ? parseFloat(msg.data.lowPrice24h) : c.low_24h,
            price_change_percentage_24h: msg.data.price24hPcnt ? parseFloat(msg.data.price24hPcnt) * 100 : c.price_change_percentage_24h,
          } : c
        ))
      }
    }
    ws.onclose = () => setTimeout(() => setupWebSocket(coins), 3000)
    ws.onerror = () => ws.close()
  }

  async function fetchSingleBybit(bybitSymbol: string) {
    try {
      const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${bybitSymbol}`)
      const data = await res.json()
      const updated = data.result?.list?.[0]
      if (!updated) return
      setExtraCoins((prev) => prev.map((c) =>
        c.bybitSymbol === bybitSymbol ? {
          ...c,
          current_price: parseFloat(updated.lastPrice),
          high_24h: parseFloat(updated.highPrice24h),
          low_24h: parseFloat(updated.lowPrice24h),
          price_change_percentage_24h: parseFloat(updated.price24hPcnt) * 100,
        } : c
      ))
    } catch (err) {
      console.error(`Failed to poll ${bybitSymbol}`, err)
    }
  }

  function startPolling(bybitSymbol: string) {
    if (pollIntervalsRef.current.has(bybitSymbol)) return
    pollIntervalsRef.current.set(bybitSymbol, setInterval(() => fetchSingleBybit(bybitSymbol), 3000))
  }

  function stopAllPolling() {
    pollIntervalsRef.current.forEach((i) => clearInterval(i))
    pollIntervalsRef.current.clear()
  }

  useEffect(() => {
    fetchPopularCoins().then(() => {
      setPopularCoins((current) => { setupWebSocket(current); return current })
    })
    return () => {
      wsRef.current?.close()
      stopAllPolling()
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!showExtra) return
    extraCoins.forEach((c) => startPolling(c.bybitSymbol))
  }, [extraCoins, showExtra])

  async function handleShowMore() {
    if (!hasMore) return
    setLoadingMore(true)
    const prevCount = extraCoinsCountRef.current
    if (!showExtra) { setShowExtra(true); await fetchExtraCoins(1, false); setPage(1) }
    else { const next = page + 1; setPage(next); await fetchExtraCoins(next, true) }
    if (extraCoinsCountRef.current === prevCount) setHasMore(false)
    setLoadingMore(false)
  }

  function handleShowLess() {
    setShowExtra(false); setExtraCoins([]); setPage(1); setHasMore(true)
    extraCoinsCountRef.current = 0; stopAllPolling()
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!val) { setSearchResults([]); setIsSearching(false); return }
    searchTimeoutRef.current = setTimeout(() => searchCoins(val), 400)
  }

  const allCoins = showExtra ? [...popularCoins, ...extraCoins] : popularCoins
  const filtered = (search ? searchResults : allCoins).sort((a, b) => {
    const aVal = a[sortKey] ?? 0
    const bVal = b[sortKey] ?? 0
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1
    return 0
  })

  const isPopular = (coin: Coin) => POPULAR_IDS.includes(coin.id)

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-300" />
    return sortDir === "asc"
      ? <TrendingUp className="w-3 h-3 ml-1 text-black dark:text-white" />
      : <TrendingDown className="w-3 h-3 ml-1 text-black dark:text-white" />
  }

  const skeletonRows = (cols: number, rows: number) =>
    Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
        {Array.from({ length: cols }).map((_, j) => (
          <td key={j} className="px-4 py-4">
            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
          </td>
        ))}
      </tr>
    ))

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-16">

      {loginPrompt && (
        <div className="fixed bottom-6 right-4 sm:right-6 bg-black dark:bg-white text-white dark:text-black text-sm px-4 py-3 rounded-lg shadow-lg z-50">
          Please log in to save favourites
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <p className="text-sm text-gray-400">
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString()}</span>}
        </p>
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search coin..."
              value={search}
              onChange={handleSearchChange}
              suppressHydrationWarning
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
            />
          </div>
          {isSearching && <p className="text-xs text-gray-400 mt-1 pl-1">Searching...</p>}
        </div>
      </div>

      {/* ── MOBILE card list (< md) ── */}
      <div className="md:hidden rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
        {loading || isSearching ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-900 animate-pulse shrink-0" />
                <div>
                  <div className="h-3.5 w-12 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mb-1" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-3.5 w-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mb-1" />
                <div className="h-3 w-10 bg-gray-100 dark:bg-gray-900 rounded animate-pulse ml-auto" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            {search ? `No coins found for "${search}"` : "No coins available"}
          </div>
        ) : (
          filtered.map((coin) => {
            const change = coin.price_change_percentage_24h ?? 0
            const positive = change >= 0
            const isFav = favourites.has(coin.id)
            return (
              <div key={coin.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                {/* Left: star + coin info */}
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleFavourite(coin)} className="text-gray-300 hover:text-yellow-400 transition-colors shrink-0">
                    <Star className={`w-4 h-4 ${isFav ? "fill-yellow-400 text-yellow-400" : ""}`} />
                  </button>
                  <img src={coin.image} alt={coin.name} width={32} height={32} className="rounded-full w-8 h-8 shrink-0" onError={(e) => { e.currentTarget.style.display = "none" }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm">{coin.symbol}</p>
                      {isPopular(coin) && (
                        <span className="text-xs px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-400">Live</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[100px]">{coin.name}</p>
                  </div>
                </div>

                {/* Right: price + change + trade */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-mono font-medium text-sm">${formatPrice(coin.current_price)}</p>
                    <span className={`text-xs font-medium flex items-center justify-end gap-0.5 ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {positive ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  </div>
                  <Link
                    href={`/trade/${coin.bybitSymbol}`}
                    className="px-2.5 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Trade
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── DESKTOP table (≥ md) ── */}
      <div className="hidden md:block rounded-xl border border-gray-100 dark:border-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950">
              <th className="w-10 px-4 py-4" />
              <th className="text-left px-4 py-4 font-medium text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors" onClick={() => handleSort("name")}>
                <span className="flex items-center">Coin <SortIcon k="name" /></span>
              </th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors" onClick={() => handleSort("current_price")}>
                <span className="flex items-center justify-end">Price <SortIcon k="current_price" /></span>
              </th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors" onClick={() => handleSort("price_change_percentage_24h")}>
                <span className="flex items-center justify-end">24h % <SortIcon k="price_change_percentage_24h" /></span>
              </th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 hidden lg:table-cell">24h High</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 hidden lg:table-cell">24h Low</th>
              <th className="text-right px-4 py-4 font-medium text-gray-400 cursor-pointer hover:text-black dark:hover:text-white transition-colors hidden xl:table-cell" onClick={() => handleSort("total_volume")}>
                <span className="flex items-center justify-end">Volume <SortIcon k="total_volume" /></span>
              </th>
              <th className="text-right px-4 py-4 font-medium text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? skeletonRows(8, 10)
              : isSearching ? skeletonRows(8, 5)
              : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                    {search ? `No coins found for "${search}"` : "No coins available"}
                  </td>
                </tr>
              ) : (
                filtered.map((coin) => {
                  const change = coin.price_change_percentage_24h ?? 0
                  const positive = change >= 0
                  const isFav = favourites.has(coin.id)
                  return (
                    <tr key={coin.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors">
                      <td className="px-4 py-4">
                        <button onClick={() => toggleFavourite(coin)} className="text-gray-300 hover:text-yellow-400 transition-colors">
                          <Star className={`w-4 h-4 ${isFav ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img src={coin.image} alt={coin.name} width={32} height={32} className="rounded-full w-8 h-8" onError={(e) => { e.currentTarget.style.display = "none" }} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{coin.symbol}</p>
                              {isPopular(coin) && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-900 text-gray-400">Live</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{coin.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium">${formatPrice(coin.current_price)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-medium ${positive ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {positive ? "+" : ""}{change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-gray-500 hidden lg:table-cell font-mono">${formatPrice(coin.high_24h)}</td>
                      <td className="px-4 py-4 text-right text-gray-500 hidden lg:table-cell font-mono">${formatPrice(coin.low_24h)}</td>
                      <td className="px-4 py-4 text-right text-gray-500 hidden xl:table-cell">{formatVolume(coin.total_volume)}</td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/trade/${coin.bybitSymbol}`} className="px-3 py-1.5 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
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

      {/* Footer */}
      {!search && (
        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-sm text-gray-400">Showing {filtered.length} coins</p>
          {retryMessage && <p className="text-xs text-yellow-500">{retryMessage}</p>}
          <div className="flex items-center gap-3">
            {hasMore && (
              <button onClick={handleShowMore} disabled={loadingMore} className="px-6 py-2 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors disabled:opacity-50">
                {loadingMore ? (retryMessage ? "Waiting for rate limit..." : "Loading...") : "Show more"}
              </button>
            )}
            {showExtra && (
              <button onClick={handleShowLess} className="px-6 py-2 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-gray-400">
                Show less
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-300 dark:text-gray-700 mt-6 text-center">
        Market data via CoinGecko · Popular coins update live via Bybit WebSocket · Others update every 3s
      </p>
    </div>
  )
}