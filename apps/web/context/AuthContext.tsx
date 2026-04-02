"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { auth, setToken, clearToken } from "../lib/api"

interface User {
  id: string
  email: string
  name?: string
  role: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("zyra_token")
    if (token) {
      auth.me()
        .then((data) => {
          setUser(data.user)
          setProfile(data.profile)
        })
        .catch(() => {
          clearToken()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await auth.login(email, password)
    setToken(data.token)
    setUser(data.user)
  }

  const register = async (email: string, password: string, name?: string) => {
    const data = await auth.register(email, password, name)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    clearToken()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
