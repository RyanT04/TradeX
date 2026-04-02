"use client"

import { useEffect } from "react"
import Link from "next/link"

const stats = [
  { value: "100+", label: "Cryptocurrencies" },
  { value: "$0", label: "To start trading" },
  { value: "24/7", label: "Market access" },
  { value: "Live", label: "Price data" },
]

export function Hero() {
  useEffect(() => {
    document.documentElement.classList.add("no-scrollbar")
    return () => document.documentElement.classList.remove("no-scrollbar")
  }, [])

  return (
    <main className="bg-white dark:bg-black text-black dark:text-white overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-40 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Learn to trade crypto.{" "}
          <span className="text-gray-400">Without the risk.</span>
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          TradeX gives you a real trading environment powered by live market data — 
          so you can build confidence, test strategies, and master crypto trading 
          before putting real money on the line.
        </p>
        <div className="flex items-center justify-center gap-4 mt-10">
          <Link
            href="/"
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Start trading
          </Link>
          <Link
            href="/about"
            className="px-6 py-3 text-sm font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            Learn more →
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-b border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

    </main>
  )
}