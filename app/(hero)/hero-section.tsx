"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import Link from "next/link"

const stats = [
  { value: "100+", label: "Cryptocurrencies" },
  { value: "$0", label: "To start trading" },
  { value: "24/7", label: "Market access" },
  { value: "Live", label: "Price data" },
]

export function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [lastSymbol, setLastSymbol] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.add("no-scrollbar")
    return () => document.documentElement.classList.remove("no-scrollbar")
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
    setLastSymbol(localStorage.getItem("lastTradedSymbol"))
  }, [])

  const tradeHref = lastSymbol ? `/trade/${lastSymbol}` : "/trade"

  return (
    <main className="bg-white dark:bg-black text-black dark:text-white overflow-hidden flex flex-col justify-between" style={{ minHeight: "calc(100vh - 56px)" }}>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 sm:mb-6">
          Learn to trade crypto.{" "}
          <span className="text-gray-400">Without the risk.</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10">
          TradeX gives you a real trading environment powered by live market data —
          so you can build confidence, test strategies, and master crypto trading
          before putting real money on the line.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Link
            href={isLoggedIn ? tradeHref : "/#register"}
            onClick={!isLoggedIn ? (e) => {
              e.preventDefault()
              window.dispatchEvent(new CustomEvent("open-register"))
            } : undefined}
            className="w-full sm:w-auto px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-center"
          >
            Start trading
          </Link>
          <Link
            href="/about"
            className="w-full sm:w-auto px-6 py-3 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors text-center"
          >
            Learn more →
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-b border-gray-100 dark:border-gray-900 shrink-0 mb-24 sm:mb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl sm:text-3xl font-bold">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}