'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

interface LoginModalContextType {
  isOpen: boolean
  openModal: (trigger?: 'button' | 'auto-prompt' | 'cart') => void
  closeModal: () => void
  trigger: 'button' | 'auto-prompt' | 'cart'
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined)

export function useLoginModal() {
  const context = useContext(LoginModalContext)
  if (!context) {
    throw new Error('useLoginModal must be used within a LoginModalProvider')
  }
  return context
}

interface LoginModalProviderProps {
  children: ReactNode
}

export function LoginModalProvider({ children }: LoginModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [trigger, setTrigger] = useState<'button' | 'auto-prompt' | 'cart'>('button')
  const [hasShownAutoPrompt, setHasShownAutoPrompt] = useState(false)
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const openModal = (triggerType: 'button' | 'auto-prompt' | 'cart' = 'button') => {
    setTrigger(triggerType)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  // Auto-prompt logic for unauthenticated users after 30 seconds
  useEffect(() => {
    if (status === 'loading') return

    // Don't show on dashboard, login page, or if user is authenticated
    const hiddenRoutes = ['/login', '/dashboard']
    const shouldSkipAutoPrompt =
      session?.user ||
      hasShownAutoPrompt ||
      pathname.startsWith('/dashboard') ||
      hiddenRoutes.includes(pathname)

    if (shouldSkipAutoPrompt) return

    const timer = setTimeout(() => {
      if (!session?.user && !hasShownAutoPrompt) {
        setHasShownAutoPrompt(true)
        openModal('auto-prompt')
      }
    }, 30000) // 30 seconds

    return () => clearTimeout(timer)
  }, [session, status, pathname, hasShownAutoPrompt])

  // Reset hasShownAutoPrompt when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Reset after a delay to avoid immediate re-triggering
      const resetTimer = setTimeout(() => {
        setHasShownAutoPrompt(false)
      }, 2000)

      return () => clearTimeout(resetTimer)
    }
  }, [status])

  return (
    <LoginModalContext.Provider value={{ isOpen, openModal, closeModal, trigger }}>
      {children}
    </LoginModalContext.Provider>
  )
}