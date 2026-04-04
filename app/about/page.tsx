"use client"

import { TrendingUp, ShieldCheck, Zap, BarChart2, Globe, BookOpen } from "lucide-react"
import Link from "next/link"

const features = [
  {
    icon: TrendingUp,
    title: "Real-time market data",
    description: "Trade with live cryptocurrency prices pulled from global markets. Practice with the same data professionals use.",
  },
  {
    icon: ShieldCheck,
    title: "Zero risk, real experience",
    description: "Use virtual funds to build your skills without risking real money. Perfect for beginners and veterans alike.",
  },
  {
    icon: Zap,
    title: "Instant order execution",
    description: "Market, limit, and stop orders executed instantly. Experience how real trading platforms feel.",
  },
  {
    icon: BarChart2,
    title: "Portfolio analytics",
    description: "Track your performance with detailed charts and metrics. Understand your wins, losses, and patterns over time.",
  },
  {
    icon: Globe,
    title: "100+ cryptocurrencies",
    description: "Trade Bitcoin, Ethereum, and hundreds of altcoins. Explore the full breadth of the crypto market.",
  },
  {
    icon: BookOpen,
    title: "Learn as you trade",
    description: "Built-in guides and market insights help you understand the fundamentals while you practice.",
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">

      {/* What is it */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-5">What is TradeX?</h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
              TradeX is a cryptocurrency trading simulator that mirrors the real market.
              You get a virtual portfolio, live price feeds, and the same tools used by
              active traders — without ever touching real money.
            </p>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Whether you're completely new to crypto or an experienced trader testing
              a new strategy, TradeX gives you a safe space to experiment, make mistakes,
              and learn from them.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-8 space-y-4">
            {[
              "Sign up and get virtual funds instantly",
              "Browse live crypto markets in real time",
              "Place trades just like a real exchange",
              "Track your portfolio performance over time",
              "Refine your strategy before going live",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-xs font-mono text-gray-300 dark:text-gray-600 mt-1 w-4 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold mb-3">Everything you need to practice</h2>
          <p className="text-gray-400 mb-14 max-w-xl">
            A full-featured simulator built to feel like the real thing.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title}>
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start trading?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Create a free account and start practicing with virtual funds today.
            No credit card required.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Get started for free
          </Link>
        </div>
      </section>

    </main>
  )
}