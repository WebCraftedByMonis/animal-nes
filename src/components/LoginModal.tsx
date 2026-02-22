'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Heart, Shield, Star, Users, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { useLoginModal } from '@/contexts/LoginModalContext'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Bangladesh', 'Belgium', 'Bolivia', 'Brazil', 'Canada', 'Chile', 'China',
  'Colombia', 'Croatia', 'Czech Republic', 'Denmark', 'Ecuador', 'Egypt',
  'Ethiopia', 'Finland', 'France', 'Germany', 'Ghana', 'Greece', 'Hungary',
  'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Malaysia', 'Mexico',
  'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan',
  'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Senegal', 'Singapore', 'South Africa', 'South Korea',
  'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland', 'Syria', 'Taiwan',
  'Tanzania', 'Thailand', 'Tunisia', 'Turkey', 'UAE', 'Uganda', 'UK',
  'Ukraine', 'USA', 'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zimbabwe',
]

interface LoginModalProps {
  isOpen?: boolean
  onClose?: () => void
  trigger?: 'button' | 'auto-prompt' | 'cart'
}

function LoginModalContent({ isOpen, onClose, trigger = 'button' }: Required<LoginModalProps>) {
  const { data: session, update: updateSession } = useSession()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [signInShowPassword, setSignInShowPassword] = useState(false)
  const [signInLoading, setSignInLoading] = useState(false)
  const [signInError, setSignInError] = useState('')

  // Sign Up state
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPhone, setSignUpPhone] = useState('')
  const [signUpCountry, setSignUpCountry] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpShowPassword, setSignUpShowPassword] = useState(false)
  const [signUpLoading, setSignUpLoading] = useState(false)
  const [signUpError, setSignUpError] = useState('')
  const [signUpSuccess, setSignUpSuccess] = useState('')

  useEffect(() => {
    if (session?.user) {
      onClose()
    }
  }, [session, onClose])

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google')
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInError('')
    if (!signInEmail || !signInPassword) {
      setSignInError('Please enter your email and password.')
      return
    }
    setSignInLoading(true)
    try {
      const result = await signIn('credentials', {
        email: signInEmail,
        password: signInPassword,
        redirect: false,
      })
      if (result?.error) {
        setSignInError('Invalid email or password.')
      } else {
        // Refresh the session token then close — don't wait for useEffect
        await updateSession()
        onClose()
      }
    } catch {
      setSignInError('Something went wrong. Please try again.')
    } finally {
      setSignInLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignUpError('')
    setSignUpSuccess('')
    if (!signUpName || !signUpEmail || !signUpPassword) {
      setSignUpError('Name, email, and password are required.')
      return
    }
    if (signUpPassword.length < 6) {
      setSignUpError('Password must be at least 6 characters.')
      return
    }
    setSignUpLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName,
          email: signUpEmail,
          phoneNumber: signUpPhone,
          country: signUpCountry,
          password: signUpPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSignUpError(data.error || 'Registration failed.')
      } else {
        setSignUpSuccess('Account created! Signing you in…')
        const signInResult = await signIn('credentials', {
          email: signUpEmail,
          password: signUpPassword,
          redirect: false,
        })
        if (!signInResult?.error) {
          await updateSession()
          onClose()
        }
      }
    } catch {
      setSignUpError('Something went wrong. Please try again.')
    } finally {
      setSignUpLoading(false)
    }
  }

  const getTitleAndMessage = () => {
    switch (trigger) {
      case 'auto-prompt':
        return {
          title: 'Join Animal Wellness Community',
          message: 'Sign in to unlock exclusive features and personalized experience',
        }
      case 'cart':
        return {
          title: 'Sign in to Add to Cart',
          message: 'Create an account to save your favorite animals and make purchases',
        }
      default:
        return {
          title: 'Welcome to Animal Wellness',
          message: 'Sign in to access all features and connect with our community',
        }
    }
  }

  const { title, message } = getTitleAndMessage()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
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
          <p className="text-center text-sm text-muted-foreground">{message}</p>
        </DialogHeader>

        <Tabs defaultValue="signin" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
          </TabsList>

          {/* ── SIGN IN TAB ── */}
          <TabsContent value="signin" className="space-y-4 pt-3">
            {/* Google button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-11 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-zinc-600 font-medium"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Email / Password form */}
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={signInShowPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setSignInShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                    tabIndex={-1}
                  >
                    {signInShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {signInError && (
                <p className="text-sm text-red-500">{signInError}</p>
              )}
              <Button
                type="submit"
                disabled={signInLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {signInLoading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            {/* Benefits grid */}
            <div className="grid grid-cols-2 gap-3 text-center pt-1">
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
          </TabsContent>

          {/* ── SIGN UP TAB ── */}
          <TabsContent value="signup" className="space-y-4 pt-3">
            {/* Google button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-11 bg-white hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-zinc-600 font-medium"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {isGoogleLoading ? 'Signing up…' : 'Sign up with Google'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or fill in details</span>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="signup-name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-email">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-phone">Phone Number</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={signUpPhone}
                  onChange={(e) => setSignUpPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-country">Country</Label>
                <Select value={signUpCountry} onValueChange={setSignUpCountry}>
                  <SelectTrigger id="signup-country">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={signUpShowPassword ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setSignUpShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                    tabIndex={-1}
                  >
                    {signUpShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {signUpError && (
                <p className="text-sm text-red-500">{signUpError}</p>
              )}
              {signUpSuccess && (
                <p className="text-sm text-green-600">{signUpSuccess}</p>
              )}

              <Button
                type="submit"
                disabled={signUpLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {signUpLoading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground pt-1">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
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
