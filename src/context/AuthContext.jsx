import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContextInstance'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const TOKEN_STORAGE_KEY = 'allevent_auth_token'

async function apiRequest(path, options = {}, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errorMessage =
      payload?.message || payload?.error || 'Une erreur est survenue.'
    throw new Error(errorMessage)
  }
  return payload
}

function mapAuthFromUser(user, token) {
  return {
    isAuthenticated: true,
    role: user?.role || 'guest',
    user: user || null,
    token,
    isLoading: false,
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    role: 'guest',
    user: null,
    token: null,
    isLoading: true,
  })

  useEffect(() => {
    let isMounted = true
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)

    if (!token) {
      setAuth((current) => ({ ...current, isLoading: false }))
      return undefined
    }

    apiRequest('/client/auth/me', { method: 'GET' }, token)
      .then((user) => {
        if (!isMounted) return
        setAuth(mapAuthFromUser(user, token))
      })
      .catch(() => {
        if (!isMounted) return
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        setAuth({
          isAuthenticated: false,
          role: 'guest',
          user: null,
          token: null,
          isLoading: false,
        })
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const data = await apiRequest('/public/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setAuth(mapAuthFromUser(data.user, data.token))
    return data.user
  }, [])

  const register = useCallback(
    async ({ name, email, password, passwordConfirmation }) => {
      const data = await apiRequest('/public/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      }),
    })
      if (data?.token && data?.user) {
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
        setAuth(mapAuthFromUser(data.user, data.token))
        return { user: data.user, otpRequired: false }
      }

      return {
        user: data?.user || null,
        otpRequired: Boolean(data?.otp_required),
      }
    },
    [],
  )

  const verifyOtp = useCallback(async ({ email, otp }) => {
    const data = await apiRequest('/public/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setAuth(mapAuthFromUser(data.user, data.token))
    return data.user
  }, [])

  const resendOtp = useCallback(async ({ email }) => {
    return apiRequest('/public/auth/otp/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      if (auth.token) {
        await apiRequest('/client/auth/logout', { method: 'POST' }, auth.token)
      }
    } catch {
      // no-op: local logout still required if API fails
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setAuth({
        isAuthenticated: false,
        role: 'guest',
        user: null,
        token: null,
        isLoading: false,
      })
    }
  }, [auth.token])

  const value = useMemo(
    () => ({ auth, setAuth, login, register, verifyOtp, resendOtp, logout }),
    [auth, login, logout, register, resendOtp, verifyOtp],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
