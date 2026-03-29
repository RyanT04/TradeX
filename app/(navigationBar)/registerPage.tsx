"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface RegisterDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function RegisterDialog({ isOpen, onClose }: RegisterDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Register an account</CardTitle>
          <CardAction>
            <Button variant="outline" onClick={onClose}>X</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="register-password">Password</Label>
                <Input id="register-password" type="password" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" required />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full w-full hover:text-blue-600">
            Register
          </Button>
          <div className="text-center text-sm mt-2 ">
            Already have an account?{" "}
            <a href="#" className="underline w-full hover:text-blue-600" onClick={(e) => { e.preventDefault(); onClose(); }}>
              Login
            </a>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
