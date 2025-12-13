import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { API_URL } from '@/lib/config' // if you use config.ts

type User = {
    userId: number
    email: string
    displayName: string
    role: string
}

type AuthContextType = {
    user: User | null
    isAuthenticated: boolean
    loading: boolean
    refresh: () => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                method: 'GET',
                credentials: 'include'
            })

            if (!response.ok) {
                setUser(null)
                return
            }

            const data = await response.json()
            setUser({
                userId: data.userId,
                email: data.email,
                displayName: data.displayName,
                role: data.role
            })
        } catch {
            setUser(null)
        }
    }

    const logout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            })
        } catch {
            // ignore errors, just clear state
        }
        setUser(null)
    }

    useEffect(() => {
        const init = async () => {
            await refresh()
            setLoading(false)
        }
        void init()
    }, [])

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                loading,
                refresh,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return ctx
}
