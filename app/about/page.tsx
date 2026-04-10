"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { TrendingUp, ShieldCheck, Zap, BarChart2, Globe, BookOpen, BadgePercent } from "lucide-react"
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
    icon: BadgePercent,
    title: "Zero trading fees",
    description: "No fees, no spreads, no hidden costs. Every virtual dollar goes exactly where you put it — unlike real exchanges.",
  },
  {
    icon: Zap,
    title: "Instant order execution",
    description: "Orders executed instantly at live market prices. Experience how real trading platforms feel.",
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

const faqs = [
  {
    q: "Is this real money?",
    a: "No. TradeX uses virtual funds — you never touch real money. You can practice freely without any financial risk.",
  },
  {
    q: "Are there any trading fees?",
    a: "No. TradeX has zero trading fees. Unlike real exchanges which charge a fee per trade, every transaction on TradeX is completely free — so you can focus purely on learning without fees eating into your virtual balance.",
  },
  {
    q: "Where does the price data come from?",
    a: "Market data is sourced from CoinGecko and Bybit, giving you accurate real-time prices used by professional traders.",
  },
  {
    q: "Can I lose my virtual balance?",
    a: "Yes — just like real trading. If your trades go wrong your balance decreases, which is the point. Learning from losses is part of the experience.",
  },
  {
    q: "How do I get started?",
    a: "Create a free account, choose your starting balance, and you're ready to trade. No credit card or personal information required.",
  },
  {
    q: "Is there a limit to how much I can trade?",
    a: "No limits. Trade as much or as little as you want within your virtual balance.",
  },
]

export default function AboutPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [])

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
              "Place trades with zero fees, just like a real exchange",
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

      {/* How it works */}
      <section className="border-t border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold mb-3">How it works</h2>
          <p className="text-gray-400 mb-14 max-w-xl">
            From sign up to your first trade in under a minute.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create your account",
                description: "Sign up for free and choose your starting virtual balance — anywhere from $1,000 to a custom amount.",
              },
              {
                step: "02",
                title: "Explore the markets",
                description: "Browse 100+ cryptocurrencies with live prices, 24h charts, and real market data powered by Bybit and CoinGecko.",
              },
              {
                step: "03",
                title: "Trade and track",
                description: "Buy and sell coins with zero fees, watch your portfolio grow or shrink in real time, and learn what works before risking real money.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-5xl font-bold text-gray-100 dark:text-gray-900 select-none">
                  {item.step}
                </span>
                <div className="-mt-4">
                  <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold mb-3">Frequently asked questions</h2>
          <p className="text-gray-400 mb-14 max-w-xl">
            Everything you need to know about TradeX.
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-900">
            {faqs.map((faq, i) => (
              <div key={i} className="py-5">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left gap-4"
                >
                  <span className="text-sm font-medium">{faq.q}</span>
                  <span className="text-gray-400 shrink-0 text-lg leading-none">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <p className="mt-3 text-sm text-gray-400 leading-relaxed pr-8">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-100 dark:border-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start trading?</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Create a free account and start practicing with virtual funds today.
            No credit card required. No trading fees. Ever.
          </p>
          {isLoggedIn ? (
            <Link
              href="/trade"
              className="inline-block px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Go to trade
            </Link>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-register"))}
              className="inline-block px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Get started for free
            </button>
          )}
        </div>
      </section>

    </main>
  )
}