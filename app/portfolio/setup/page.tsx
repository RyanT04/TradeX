"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

const PRESETS = [5000, 10000, 25000, 50000]

export default function PortfolioSetupPage() {
  const [selected, setSelected] = useState(10000)
  const [custom, setCustom] = useState("")
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/")
        return
      }
      setAuthChecked(true)
    })
  }, [])

  async function handleStart() {
    setLoading(true)
    const balance = useCustom ? parseFloat(custom) : selected

    if (!balance || isNaN(balance) || balance <= 0) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    await supabase.from("portfolios").insert({
      user_id: user.id,
      balance,
      starting_balance: balance
    })
    router.push("/portfolio")
  }

  if (!authChecked) return null

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Set up your portfolio</h1>
        <p className="text-sm text-gray-400 mb-8">
          Choose your starting balance. This is virtual money — no real funds involved.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {PRESETS.map((amount) => (
            <button
              key={amount}
              onClick={() => { setSelected(amount); setUseCustom(false) }}
              className={`py-4 rounded-xl border text-sm font-medium transition-colors ${
                !useCustom && selected === amount
                  ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                  : "border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <button
            onClick={() => setUseCustom(true)}
            className={`w-full py-3 rounded-xl border text-sm transition-colors mb-2 ${
              useCustom
                ? "border-black dark:border-white"
                : "border-gray-200 dark:border-gray-800 text-gray-400"
            }`}
          >
            Custom amount
          </button>
          {useCustom && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                placeholder="Enter amount"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                autoFocus
                className="w-full pl-7 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors font-mono"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={loading || (useCustom && (!custom || parseFloat(custom) <= 0))}
          className="w-full py-3 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? "Setting up..." : `Start with $${useCustom ? (parseFloat(custom) || 0).toLocaleString() : selected.toLocaleString()}`}
        </button>
      </div>
    </main>
  )
}