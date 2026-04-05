"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

const PRESET_AVATARS = [
  { id: "bear", emoji: "🐻" }, { id: "bull", emoji: "🐂" },
  { id: "fox", emoji: "🦊" }, { id: "wolf", emoji: "🐺" },
  { id: "lion", emoji: "🦁" }, { id: "eagle", emoji: "🦅" },
  { id: "shark", emoji: "🦈" }, { id: "dragon", emoji: "🐉" },
  { id: "robot", emoji: "🤖" }, { id: "alien", emoji: "👾" },
  { id: "ninja", emoji: "🥷" }, { id: "astronaut", emoji: "👨‍🚀" },
  { id: "wizard", emoji: "🧙" }, { id: "viking", emoji: "🪖" },
  { id: "diamond", emoji: "💎" }, { id: "fire", emoji: "🔥" },
  { id: "lightning", emoji: "⚡" }, { id: "moon", emoji: "🌙" },
  { id: "rocket", emoji: "🚀" }, { id: "crown", emoji: "👑" },
]

export default function AuthSetupPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [selectedAvatar, setSelectedAvatar] = useState("rocket")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) { router.push("/"); return }
        setUserId(user.id)

        const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single()

        // skip if both already set
        if (data?.username && data?.avatar_url) {
        router.push("/")
        return
        }

        // pre-fill if partially set
        if (data?.username) setUsername(data.username)
        if (data?.avatar_url) setSelectedAvatar(data.avatar_url)
    })
    }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setError(null)

    const trimmed = username.trim()

    if (trimmed.length < 3) {
      setError("Username must be at least 3 characters")
      setLoading(false)
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Username can only contain letters, numbers and underscores")
      setLoading(false)
      return
    }

    const supabase = createClient()

    // check if username is taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmed)
      .single()

    if (existing) {
      setError("Username is already taken")
      setLoading(false)
      return
    }

    // upsert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        username: trimmed,
        avatar_url: selectedAvatar,
        updated_at: new Date().toISOString(),
      })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // redirect to portfolio setup
    router.push("/portfolio/setup")
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Set up your profile</h1>
        <p className="text-sm text-gray-400 mb-8">
          Choose a username and avatar before you start trading.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar picker */}
          <div>
            <p className="text-sm font-medium mb-3">Choose your avatar</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-2xl">
                {PRESET_AVATARS.find(a => a.id === selectedAvatar)?.emoji}
              </div>
              <p className="text-sm text-gray-400">{selectedAvatar}</p>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {PRESET_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    selectedAvatar === avatar.id
                      ? "bg-black dark:bg-white ring-2 ring-black dark:ring-white"
                      : "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-sm font-medium block mb-2">Username</label>
            <input
              type="text"
              placeholder="e.g. cryptotrader99"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username}
            className="w-full py-3 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  )
}