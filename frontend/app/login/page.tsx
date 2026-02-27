"use client"

import type React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api/services"
import { setAuthData, isRememberMeEnabled, getRememberedOrganization, setRememberedOrganization } from "@/lib/auth"
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Zap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(true)
  const [formData, setFormData] = useState({
    organization: "",
    email: "",
    password: "",
  })

  // Khôi phục Remember me và Organization đã lưu (khi user từng đăng nhập với Remember me).
  useEffect(() => {
    if (typeof window === "undefined") return
    const savedRememberMe = isRememberMeEnabled()
    setRememberMe(savedRememberMe)
    if (savedRememberMe) {
      const savedOrg = getRememberedOrganization()
      if (savedOrg) {
        setFormData((prev) => ({ ...prev, organization: savedOrg }))
      }
    }
  }, [])

  const [validationErrors, setValidationErrors] = useState<{
    organization?: string
    email?: string
    password?: string
  }>({})


  // Clear validation errors when fields change
  useEffect(() => {
    setValidationErrors({})
    setError(null)
  }, [formData])

  const validateForm = () => {
    const errors: typeof validationErrors = {}

    if (!formData.organization.trim()) {
      errors.organization = "This field is required"
    }

    if (!formData.email.trim()) {
      errors.email = "This field is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email"
    }

    if (!formData.password.trim()) {
      errors.password = "This field is required"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
        organizationSlug: formData.organization || undefined,
        deviceInfo: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      })

      if (response.success && response.data) {
        // Store authentication data
        setAuthData(
          response.data.accessToken,
          response.data.refreshToken,
          response.data.user
        )

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          setRememberedOrganization(formData.organization.trim())
        } else {
          localStorage.removeItem('rememberMe')
          setRememberedOrganization('')
        }

        toast({
          title: "Login successful",
          description: `Welcome back, ${response.data.user.firstName || response.data.user.email}!`,
        })

        // Navigate to dashboard
        router.push("/")
      } else {
        // Extract error message from response
        const errorMessage = response.error?.message || "Invalid email or password. Please try again."
        setError(errorMessage)
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (err: any) {
      // Handle different error types
      let errorMessage = "An error occurred during login"

      if (err?.response?.data) {
        // API returned error response
        const errorData = err.response.data
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error
        }
      } else if (err?.message) {
        // Error object with message
        errorMessage = err.message
      } else if (typeof err === 'string') {
        // String error
        errorMessage = err
      }

      setError(errorMessage)
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider: string) => {
    toast({
      title: "Coming Soon",
      description: `${provider} login will be available soon.`,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <Select defaultValue="en">
          <SelectTrigger className="w-32 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="vi">Tiếng Việt</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-4 text-center pb-2">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-900">Mediation Pro</span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500">Sign in to your account</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Organization Field */}
              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <div className="relative">
                  <Input
                    id="organization"
                    type="text"
                    placeholder="your-company"
                    className={`pr-32 ${validationErrors.organization ? "border-red-500" : ""}`}
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    .mediationpro.io
                  </span>
                </div>
                {validationErrors.organization ? (
                  <p className="text-xs text-red-500">{validationErrors.organization}</p>
                ) : (
                  <p className="text-xs text-slate-500">Enter your organization identifier</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className={`pl-10 ${validationErrors.email ? "border-red-500" : ""}`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {validationErrors.email && <p className="text-xs text-red-500">{validationErrors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`pl-10 pr-10 ${validationErrors.password ? "border-red-500" : ""}`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.password && <p className="text-xs text-red-500">{validationErrors.password}</p>}
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                  />
                  <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleSocialLogin("Google")}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleSocialLogin("Microsoft")}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                </svg>
                Microsoft
              </Button>
            </div>
          </CardContent>

          <CardFooter className="justify-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link href="#" className="font-medium text-blue-600 hover:text-blue-700">
                Contact your administrator
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-slate-400">© 2026 Mediation Pro. All rights reserved.</p>
      </footer>
    </div>
  )
}
