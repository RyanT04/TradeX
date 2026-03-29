"use client"

import * as React from "react"
import { LoginDialog } from "./loginPage"
import { RegisterDialog } from "./registerPage"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

const components = [
  {
    title: "Alert Dialog",
    href: "/docs/primitives/alert-dialog",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
  },
]

export function NavBar() {
  const [isLoginOpen, setIsLoginOpen] = React.useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = React.useState(false)

  return (
    <>
      <nav className="border-b bg-white dark:bg-black p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink href="/" className={navigationMenuTriggerStyle()}>
                  Home
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="/about" className={navigationMenuTriggerStyle()}>
                  About
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="/contact" className={navigationMenuTriggerStyle()}>
                  Contact
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </nav>

      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <RegisterDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </>
  )
}
