"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Eye, EyeOff, CheckCircle2, Circle, Loader2, Clock, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"

const passwordRequirements = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

const appAccess = [
  { name: "Weather Plus Pro", permission: "Edit" },
  { name: "Game Master", permission: "View" },
  { name: "Photo Editor Pro", permission: "View" },
  { name: "Fitness Tracker", permission: "Edit" },
  { name: "Music Player", permission: "View" },
]

type PageState = "form" | "expired" | "already-accepted"

export default function AcceptInvitationPage() {
  const [pageState] = useState<PageState>("form")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAppAccess, setShowAppAccess] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  })

  const passwordValidation = useMemo(() => {
    return passwordRequirements.map((req) => ({
      ...req,
      met: req.test(formData.password),
    }))
  }, [formData.password])

  const allRequirementsMet = passwordValidation.every((req) => req.met)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
  const canSubmit = formData.firstName && formData.lastName && allRequirementsMet && passwordsMatch && agreeTerms

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    // Redirect to dashboard on success
    window.location.href = "/"
  }

  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0 text-center">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">Invitation expired</h1>
              <p className="text-sm text-slate-500">
                This invitation has expired. Please contact John Doe to send a new invitation.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (pageState === "already-accepted") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-0 text-center">
          <CardHeader className="space-y-4 pb-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900">Invitation already used</h1>
              <p className="text-sm text-slate-500">This invitation has already been accepted.</p>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/login">Sign in to your account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 py-8">
      <Card className="w-full max-w-lg shadow-lg border-0">
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Organization Logo */}
          <div className="flex justify-center">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-purple-100 text-purple-600 text-xl font-bold">WP</AvatarFallback>
            </Avatar>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-900">You&apos;ve been invited to join WeatherPlus Inc</h1>
            <p className="text-sm text-slate-500">John Doe invited you to collaborate on Mediation Pro</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Invitation Details */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Role:</span>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Editor</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Teams:</span>
              <span className="text-sm font-medium text-slate-900">Mobile Team, Analytics Team</span>
            </div>
            <Collapsible open={showAppAccess} onOpenChange={setShowAppAccess}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">App Access:</span>
                <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                  5 apps
                  {showAppAccess ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-3">
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  {appAccess.map((app) => (
                    <div key={app.name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{app.name}</span>
                      <Badge
                        variant="outline"
                        className={
                          app.permission === "Edit"
                            ? "border-blue-200 text-blue-700"
                            : "border-slate-200 text-slate-600"
                        }
                      >
                        {app.permission}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="space-y-1 pt-1">
                {passwordValidation.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    {req.met ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span className={`text-xs ${req.met ? "text-green-600" : "text-slate-500"}`}>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  className="pr-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-red-500">Passwords don&apos;t match</p>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm text-slate-600 leading-tight cursor-pointer">
                I agree to the{" "}
                <Link href="#" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={!canSubmit || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Accept invitation & create account"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t pt-4">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in instead
            </Link>
          </p>
        </CardFooter>
      </Card>

      <footer className="mt-8 text-center">
        <p className="text-xs text-slate-400">© 2026 Mediation Pro. All rights reserved.</p>
      </footer>
    </div>
  )
}
