"use client"

import { useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, Circle, Eye, EyeOff, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { teamMembersApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

const passwordRequirements = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lowercase", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { id: "number", label: "One number", test: (value: string) => /\d/.test(value) },
  { id: "special", label: "One special character", test: (value: string) => /[!@#$%^&*(),.?":{}|<>]/.test(value) },
]

interface ResetUserPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  userEmail: string
  onSuccess?: () => void
}

export function ResetUserPasswordModal({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
  onSuccess,
}: ResetUserPasswordModalProps) {
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [mustChangePassword, setMustChangePassword] = useState(true)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordValidation = useMemo(() => {
    return passwordRequirements.map((requirement) => ({
      ...requirement,
      met: requirement.test(newPassword),
    }))
  }, [newPassword])

  const allRequirementsMet = passwordValidation.every((requirement) => requirement.met)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const canSubmit = allRequirementsMet && passwordsMatch

  const resetState = () => {
    setNewPassword("")
    setConfirmPassword("")
    setMustChangePassword(true)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setSubmitting(false)
    setError(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await teamMembersApi.resetUserPassword(userId, {
        newPassword,
        confirmPassword,
        mustChangePassword,
      })

      if (response.success) {
        toast({
          title: "Password reset",
          description: `Password for ${userEmail} has been updated.`,
        })
        onSuccess?.()
        handleOpenChange(false)
        return
      }

      const message = response.message || "Failed to reset password"
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password"
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-medium text-slate-900">{userName || userEmail}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-reset-new-password">New password</Label>
            <div className="relative">
              <Input
                id="admin-reset-new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-1 pt-1">
              {passwordValidation.map((requirement) => (
                <div key={requirement.id} className="flex items-center gap-2">
                  {requirement.met ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-slate-300" />
                  )}
                  <span className={`text-xs ${requirement.met ? "text-green-600" : "text-slate-500"}`}>
                    {requirement.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-reset-confirm-password">Confirm password</Label>
            <div className="relative">
              <Input
                id="admin-reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500">Passwords don&apos;t match</p>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
            <Checkbox
              id="must-change-password"
              checked={mustChangePassword}
              onCheckedChange={(checked) => setMustChangePassword(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="must-change-password" className="cursor-pointer">
                Force password change on next login
              </Label>
              <p className="text-xs text-slate-500">
                Recommended for temporary passwords or admin-initiated resets.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
