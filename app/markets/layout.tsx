"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

function MarketsTabs() {
  const pathname = usePathname()
  const tabs = [
    { label: "All Markets", href: "/markets/all" },
    { label: "Favourites", href: "/markets/favourites" },
  ]
  return (
    <div className="flex items-center gap-1 border-b border-gray-100 dark:border-gray-900 mb-8">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto px-6 pt-16">
        <h1 className="text-3xl font-bold mb-1">Explore Cryptocurrencies</h1>
        <p className="text-sm text-gray-400 mb-6">
          Market data via CoinGecko · Trade prices via Bybit.
        </p>
        <MarketsTabs />
      </div>
      {children}
    </div>
  )
}