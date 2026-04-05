"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/client"
import { LoginDialog } from "./loginPage"
import { RegisterDialog } from "./registerPage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, X, ChevronDown, Settings, BarChart2, TrendingUp, Info, Star } from "lucide-react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

const PRESET_AVATARS: Record<string, string> = {
  bear: "🐻", bull: "🐂", fox: "🦊", wolf: "🐺", lion: "🦁",
  eagle: "🦅", shark: "🦈", dragon: "🐉", robot: "🤖", alien: "👾",
  ninja: "🥷", astronaut: "👨‍🚀", wizard: "🧙", viking: "🪖", diamond: "💎",
  fire: "🔥", lightning: "⚡", moon: "🌙", rocket: "🚀", crown: "👑",
}

const NAV_LINKS = [
  { href: "/about", label: "About", icon: Info },
  { href: "/markets/all", label: "Markets", icon: TrendingUp },
  { href: "/trade", label: "Trade", icon: Star },
]

export function NavBar() {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const [username, setUsername] = React.useState<string | null>(null)
  const [avatar, setAvatar] = React.useState<string | null>(null)
  const [isLoginOpen, setIsLoginOpen] = React.useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  async function fetchProfile(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single()
    if (data?.username) setUsername(data.username)
    if (data?.avatar_url) setAvatar(data.avatar_url)
  }

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchProfile(user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfile(session.user.id)
        } else {
          setUsername(null)
          setAvatar(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  React.useEffect(() => {
    const handler = () => setIsRegisterOpen(true)
    window.addEventListener("open-register", handler)
    return () => window.removeEventListener("open-register", handler)
  }, [])

  // close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUsername(null)
    setAvatar(null)
    window.location.href = "/"
  }

  const displayName = username ?? user?.email ?? "Account"
  const avatarEmoji = avatar && PRESET_AVATARS[avatar] ? PRESET_AVATARS[avatar] : null

  return (
    <>
      <nav className="border-b bg-white dark:bg-black sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:h-16">

            {/* Left: logo + desktop nav */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="text-lg sm:text-xl font-bold text-black dark:text-white mr-1 sm:mr-3 shrink-0"
              >
                TradeX
              </Link>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-950"
                  >
                    {label}
                  </Link>
                ))}
                {user && (
                  <Link
                    href="/portfolio"
                    className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-gray-950"
                  >
                    Portfolio
                  </Link>
                )}
              </div>
            </div>

            {/* Right: desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <>
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Register
                  </button>
                </>
              ) : (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-950">
                    {avatarEmoji && <span className="text-lg leading-none">{avatarEmoji}</span>}
                    <span className="text-sm font-medium text-black dark:text-white max-w-[140px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={5}>
                    <DropdownMenuItem onClick={() => router.push("/portfolio")}>
                      <BarChart2 className="size-4 mr-2" />
                      Portfolio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="size-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Mobile right: account dropdown + hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              {user ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 outline-none px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-950">
                    {avatarEmoji && <span className="text-base leading-none">{avatarEmoji}</span>}
                    <span className="text-sm font-medium text-black dark:text-white truncate max-w-[100px]">
                      {displayName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push("/portfolio")}>
                      <BarChart2 className="size-4 mr-2" />
                      Portfolio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      <Settings className="size-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="text-sm font-medium text-black dark:text-white px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-800"
                >
                  Login
                </button>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-1.5 text-black dark:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-950 rounded-lg transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
              {user && (
                <Link
                  href="/portfolio"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-950 rounded-lg transition-colors"
                >
                  <BarChart2 className="w-4 h-4" />
                  Portfolio
                </Link>
              )}
              {!user && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); setIsRegisterOpen(true) }}
                  className="flex items-center justify-center gap-2 mt-2 px-4 py-2.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                >
                  Create account
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <LoginDialog
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false)
          setIsRegisterOpen(true)
        }}
      />
      <RegisterDialog
        isOpen={isRegisterOpen}
        onClose={() => {
          setIsRegisterOpen(false)
          if (user) router.push("/portfolio/setup")
        }}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false)
          setIsLoginOpen(true)
        }}
      />
    </>
  )
}