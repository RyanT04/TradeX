"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { User2, Lock, ImageIcon, RefreshCw } from "lucide-react"

interface Profile {
  username: string | null
  avatar_url: string | null
}

const PRESET_AVATARS = [
  { id: "bear", emoji: "🐻" },
  { id: "bull", emoji: "🐂" },
  { id: "fox", emoji: "🦊" },
  { id: "wolf", emoji: "🐺" },
  { id: "lion", emoji: "🦁" },
  { id: "eagle", emoji: "🦅" },
  { id: "shark", emoji: "🦈" },
  { id: "dragon", emoji: "🐉" },
  { id: "robot", emoji: "🤖" },
  { id: "alien", emoji: "👾" },
  { id: "ninja", emoji: "🥷" },
  { id: "astronaut", emoji: "👨‍🚀" },
  { id: "wizard", emoji: "🧙" },
  { id: "viking", emoji: "🪖" },
  { id: "diamond", emoji: "💎" },
  { id: "fire", emoji: "🔥" },
  { id: "lightning", emoji: "⚡" },
  { id: "moon", emoji: "🌙" },
  { id: "rocket", emoji: "🚀" },
  { id: "crown", emoji: "👑" },
]

function Section({ title, description, icon: Icon, children }: {
  title: string
  description: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-100 dark:border-gray-900 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function StatusMessage({ message }: { message: { text: string; type: "success" | "error" } | null }) {
  if (!message) return null
  return (
    <p className={`text-xs mt-3 ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
      {message.text}
    </p>
  )
}

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>({ username: null, avatar_url: null })
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // avatar
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // username
  const [username, setUsername] = useState("")
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameMsg, setUsernameMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // password
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // reset portfolio
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [resetBalance, setResetBalance] = useState("10000")
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setIsLoggedIn(true)
      setUserId(user.id)

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single()

      if (data) {
        setProfile(data)
        setUsername(data.username ?? "")
        setSelectedAvatar(data.avatar_url)
      }

      setLoading(false)
    })
  }, [])

  async function handleAvatarSave() {
    if (!userId || !selectedAvatar) return
    setAvatarLoading(true)
    setAvatarMsg(null)

    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: selectedAvatar, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      setAvatarMsg({ text: error.message, type: "error" })
    } else {
      setProfile((prev) => ({ ...prev, avatar_url: selectedAvatar }))
      setAvatarMsg({ text: "Avatar updated successfully", type: "success" })
    }

    setAvatarLoading(false)
    setTimeout(() => setAvatarMsg(null), 4000)
  }

  async function handleUsernameUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setUsernameLoading(true)
    setUsernameMsg(null)

    const trimmed = username.trim()

    if (trimmed.length < 3) {
      setUsernameMsg({ text: "Username must be at least 3 characters", type: "error" })
      setUsernameLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameMsg({ text: "Username can only contain letters, numbers and underscores", type: "error" })
      setUsernameLoading(false)
      return
    }

    const supabase = createClient()

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmed)
      .neq("id", userId)
      .single()

    if (existing) {
      setUsernameMsg({ text: "Username is already taken", type: "error" })
      setUsernameLoading(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: trimmed, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      setUsernameMsg({ text: error.message, type: "error" })
    } else {
      setProfile((prev) => ({ ...prev, username: trimmed }))
      setUsernameMsg({ text: "Username updated successfully", type: "success" })
    }

    setUsernameLoading(false)
    setTimeout(() => setUsernameMsg(null), 4000)
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setPasswordLoading(true)
    setPasswordMsg(null)

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "Passwords do not match", type: "error" })
      setPasswordLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ text: "Password must be at least 6 characters", type: "error" })
      setPasswordLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPasswordLoading(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordMsg({ text: "Current password is incorrect", type: "error" })
      setPasswordLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMsg({ text: error.message, type: "error" })
    } else {
      setPasswordMsg({ text: "Password updated successfully", type: "success" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }

    setPasswordLoading(false)
    setTimeout(() => setPasswordMsg(null), 4000)
  }

  async function handleResetPortfolio() {
    if (!userId || !confirmReset) return
    setResetLoading(true)
    setResetMsg(null)

    const balance = parseFloat(resetBalance)
    if (!balance || isNaN(balance) || balance <= 0) {
      setResetMsg({ text: "Please enter a valid starting balance", type: "error" })
      setResetLoading(false)
      return
    }

    const supabase = createClient()
    await supabase.from("holdings").delete().eq("user_id", userId)
    await supabase.from("trades").delete().eq("user_id", userId)

    const { error } = await supabase
      .from("portfolios")
      .update({ balance, starting_balance: balance })
      .eq("user_id", userId)

    if (error) {
      setResetMsg({ text: error.message, type: "error" })
    } else {
      setResetMsg({ text: "Portfolio reset successfully", type: "success" })
      setConfirmReset(false)
    }

    setResetLoading(false)
    setTimeout(() => setResetMsg(null), 4000)
  }

  const currentEmoji = PRESET_AVATARS.find((a) => a.id === (selectedAvatar ?? profile.avatar_url))?.emoji

  if (!isLoggedIn && !loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center">
        <p className="text-gray-400">Log in to access settings</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-sm text-gray-400">Manage your account preferences</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-gray-100 dark:border-gray-900 rounded-xl p-6">
                <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse w-32 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-900 rounded animate-pulse w-48" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {/* Avatar */}
            <Section title="Avatar" description="Choose an avatar to represent you on TradeX" icon={ImageIcon}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-2xl">
                  {currentEmoji ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {currentEmoji ? PRESET_AVATARS.find((a) => a.id === (selectedAvatar ?? profile.avatar_url))?.id : "No avatar selected"}
                  </p>
                  <p className="text-xs text-gray-400">Select one below</p>
                </div>
              </div>

              <div className="grid grid-cols-10 gap-2 mb-4">
                {PRESET_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                      selectedAvatar === avatar.id
                        ? "bg-black dark:bg-white ring-2 ring-black dark:ring-white"
                        : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                    }`}
                    title={avatar.id}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={handleAvatarSave}
                disabled={avatarLoading || selectedAvatar === profile.avatar_url}
                className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {avatarLoading ? "Saving..." : "Save avatar"}
              </button>
              <StatusMessage message={avatarMsg} />
            </Section>

            {/* Username */}
            <Section title="Username" description="Change how your name appears across TradeX" icon={User2}>
              <form onSubmit={handleUsernameUpdate} className="space-y-3">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                />
                <button
                  type="submit"
                  disabled={usernameLoading || username.trim() === (profile.username ?? "")}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {usernameLoading ? "Saving..." : "Save username"}
                </button>
                <StatusMessage message={usernameMsg} />
              </form>
            </Section>

            {/* Password */}
            <Section title="Password" description="Update your account password" icon={Lock}>
              <form onSubmit={handlePasswordUpdate} className="space-y-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  required
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  required
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                />
                <button
                  type="submit"
                  disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                  className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? "Updating..." : "Update password"}
                </button>
                <StatusMessage message={passwordMsg} />
              </form>
            </Section>

            {/* Reset portfolio */}
            <Section title="Reset portfolio" description="Start fresh with a new virtual balance — all trades and holdings will be deleted" icon={RefreshCw}>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">New starting balance</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input
                      type="number"
                      value={resetBalance}
                      onChange={(e) => setResetBalance(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmReset}
                    onChange={(e) => setConfirmReset(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-gray-400">
                    I understand this will permanently delete all my trades and holdings and cannot be undone.
                  </span>
                </label>

                <button
                  onClick={handleResetPortfolio}
                  disabled={resetLoading || !confirmReset || !resetBalance || parseFloat(resetBalance) <= 0}
                  className="px-4 py-2 text-sm font-medium border border-red-200 dark:border-red-900 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-50"
                >
                  {resetLoading ? "Resetting..." : "Reset portfolio"}
                </button>
                <StatusMessage message={resetMsg} />
              </div>
            </Section>

          </div>
        )}
      </div>
    </main>
  )
}