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
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Menu, X, ChevronDown, Settings, BarChart2 } from "lucide-react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

const PRESET_AVATARS: Record<string, string> = {
  bear: "🐻", bull: "🐂", fox: "🦊", wolf: "🐺", lion: "🦁",
  eagle: "🦅", shark: "🦈", dragon: "🐉", robot: "🤖", alien: "👾",
  ninja: "🥷", astronaut: "👨‍🚀", wizard: "🧙", viking: "🪖", diamond: "💎",
  fire: "🔥", lightning: "⚡", moon: "🌙", rocket: "🚀", crown: "👑",
}

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
      <nav className="border-b bg-white dark:bg-black p-4">
        <div className="flex items-center justify-between w-full px-4">

          {/* Left side: logo + nav links */}
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-black dark:text-white mr-2">
              TradeX
            </Link>
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/about" className={navigationMenuTriggerStyle()}>
                    About
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/markets/all" className={navigationMenuTriggerStyle()}>
                    Markets
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/trade" className={navigationMenuTriggerStyle()}>
                    Trade
                  </NavigationMenuLink>
                </NavigationMenuItem>
                {user && (
                  <NavigationMenuItem>
                    <NavigationMenuLink href="/portfolio" className={navigationMenuTriggerStyle()}>
                      Portfolio
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            {!user ? (
              <>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Login
                </button>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200"
                >
                  Register
                </button>
              </>
            ) : (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger className="flex items-center gap-2 outline-none hover:opacity-80 transition-opacity">
                  {avatarEmoji && (
                    <span className="text-lg leading-none">{avatarEmoji}</span>
                  )}
                  <span className="text-sm font-medium text-black dark:text-white">
                    {displayName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
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

          {/* Mobile controls */}
          <div className="flex items-center gap-3 md:hidden">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger className="flex items-center gap-1 outline-none">
                {avatarEmoji && (
                  <span className="text-lg leading-none">{avatarEmoji}</span>
                )}
                <span className="text-sm font-medium text-black dark:text-white truncate max-w-[120px]">
                  {user ? displayName : "Account"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user ? (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/portfolio")}>
                      Portfolio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setIsLoginOpen(true)}>
                      Login
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsRegisterOpen(true)}>
                      Register
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-black dark:text-white"
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="mt-4 flex flex-col gap-4 md:hidden">
            <a href="/about" onClick={() => setIsMobileMenuOpen(false)}>About</a>
            <a href="/markets/all" onClick={() => setIsMobileMenuOpen(false)}>Markets</a>
            <a href="/trade" onClick={() => setIsMobileMenuOpen(false)}>Trade</a>
            {user && (
              <a href="/portfolio" onClick={() => setIsMobileMenuOpen(false)}>Portfolio</a>
            )}
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