"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, KeyRound, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (email === "notfound@example.com") {
      setError("No account found with this email address.")
    } else if (email === "rate@example.com") {
      setError("Too many requests. Please wait 5 minutes before trying again.")
    } else {
      setIsSuccess(true)
    }

    setIsLoading(false)
  }

  const handleResend = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Back Link */}
          <div className="flex justify-start">
            <Link href="/login" className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to login
            </Link>
          </div>

          {!isSuccess ? (
            <>
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <KeyRound className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
                <p className="text-sm text-slate-500">No worries, we'll send you reset instructions.</p>
              </div>
            </>
          ) : (
            <>
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </div>

              {/* Success Title */}
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
                <p className="text-sm text-slate-500">
                  We've sent a password reset link to <span className="font-medium text-slate-700">{email}</span>
                </p>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {error && error.includes("Too many") && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  required
                />
                {error && !error.includes("Too many") && <p className="text-xs text-red-500">{error}</p>}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-slate-500">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={handleResend}
                  className="font-medium text-blue-600 hover:text-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Resending..." : "click here to resend"}
                </button>
              </p>

              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/login">Back to login</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-slate-400">© 2026 Mediation Pro. All rights reserved.</p>
      </footer>
    </div>
  )
}
