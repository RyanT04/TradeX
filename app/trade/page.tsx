"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BarChart2 } from "lucide-react"

export default function TradePage() {
  const router = useRouter()

  useEffect(() => {
    const lastSymbol = localStorage.getItem("lastTradedSymbol")
    if (lastSymbol) {
      router.replace(`/trade/${lastSymbol}`)
    }
  }, [])

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center">
      <div className="text-center">
        <BarChart2 className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Select a coin to trade</h1>
        <p className="text-sm text-gray-400 mb-6">
          Browse the markets and click Trade on any coin to get started
        </p>
        <Link
          href="/markets/all"
          className="px-5 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Explore markets
        </Link>
      </div>
    </main>
  )
}