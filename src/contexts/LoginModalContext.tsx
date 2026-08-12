'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

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

  const openModal = (triggerType: 'button' | 'auto-prompt' | 'cart' = 'button') => {
    setTrigger(triggerType)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
  }

  return (
    <LoginModalContext.Provider value={{ isOpen, openModal, closeModal, trigger }}>
      {children}
    </LoginModalContext.Provider>
  )
}