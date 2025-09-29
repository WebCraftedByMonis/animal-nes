'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Heart, Shield, Star, Users } from 'lucide-react'
import Image from 'next/image'

import { useLoginModal } from '@/contexts/LoginModalContext'

interface LoginModalProps {
  isOpen?: boolean
  onClose?: () => void
  trigger?: 'button' | 'auto-prompt' | 'cart'
}

function LoginModalContent({ isOpen, onClose, trigger = 'button' }: Required<LoginModalProps>) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      onClose()
    }
  }, [session, onClose])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google')
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTitleAndMessage = () => {
    switch (trigger) {
      case 'auto-prompt':
        return {
          title: 'Join Animal Wellness Community',
          message: 'Sign in to unlock exclusive features and personalized experience'
        }
      case 'cart':
        return {
          title: 'Sign in to Add to Cart',
          message: 'Create an account to save your favorite animals and make purchases'
        }
      default:
        return {
          title: 'Welcome to Animal Wellness',
          message: 'Sign in to access all features and connect with our community'
        }
    }
  }

  const { title, message } = getTitleAndMessage()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="relative h-16 w-auto">
              <Image
                src="/logo.jpg"
                alt="Animal Wellness Logo"
                width={120}
                height={60}
                className="object-contain h-full w-auto"
                priority
              />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            {title}
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            {message}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-medium"
          >
            <svg
              className="w-5 h-5 mr-3"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Why join us?
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <Heart className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Save Favorites</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Shield className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Secure Purchases</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Star className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Exclusive Deals</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <Users className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <p className="text-xs font-medium">Community</p>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function LoginModal() {
  const { isOpen, closeModal, trigger } = useLoginModal()

  return (
    <LoginModalContent
      isOpen={isOpen}
      onClose={closeModal}
      trigger={trigger}
    />
  )
}