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
import { Menu, X, User2Icon, ChevronDown } from "lucide-react"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

export function NavBar() {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoginOpen, setIsLoginOpen] = React.useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/"
  }

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
                  <span className="text-sm font-medium text-black dark:text-white">
                    {user.email}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={5}>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <User2Icon className="size-4 mr-2" />
                    Preferences
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
                <span className="text-sm font-medium text-black dark:text-white truncate max-w-[140px]">
                  {user ? user.email : "Account"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user ? (
                  <>
                    <DropdownMenuItem onClick={() => router.push("/settings")}>
                      Preferences
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
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false)
          setIsLoginOpen(true)
        }}
      />
    </>
  )
}