"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2, CheckCircle2, Upload, X, Eye, EyeOff, RefreshCw } from "lucide-react"
import { organizationsApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

interface CreateOrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30)
}

function generatePassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%"
  let pass = ""
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pass
}

export function CreateOrganizationModal({ open, onOpenChange, onSuccess }: CreateOrganizationModalProps) {
  const [step, setStep] = useState<"form" | "success">("form")
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  // Basic Info
  const [orgName, setOrgName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugError, setSlugError] = useState("")
  const [logoFile, setLogoFile] = useState<string | null>(null)

  // Admin User
  const [createAdmin, setCreateAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminFirstName, setAdminFirstName] = useState("")
  const [adminLastName, setAdminLastName] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setStep("form")
      setOrgName("")
      setSlug("")
      setSlugManuallyEdited(false)
      setSlugChecking(false)
      setSlugError("")
      setLogoFile(null)
      setCreateAdmin(false)
      setAdminEmail("")
      setAdminFirstName("")
      setAdminLastName("")
      setAdminPassword("")
      setShowPassword(false)
      setErrors({})
      setSaving(false)
    }
  }, [open])

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && orgName) {
      setSlug(generateSlug(orgName))
      setSlugError("")
    }
  }, [orgName, slugManuallyEdited])

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30)
    setSlug(cleaned)
    setSlugManuallyEdited(true)
    setSlugError("")
  }

  const handleSlugBlur = async () => {
    if (slug.length < 3) {
      setSlugError("Slug must be at least 3 characters")
      return
    }
    // Note: Could add API call to check slug availability here
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!orgName.trim()) newErrors.orgName = "Organization name is required"
    if (orgName.length > 100) newErrors.orgName = "Name must be 100 characters or less"
    if (!slug.trim()) newErrors.slug = "Slug is required"
    if (slug.length < 3) newErrors.slug = "Slug must be at least 3 characters"
    if (!/^[a-z0-9-]+$/.test(slug)) newErrors.slug = "Only lowercase letters, numbers, and hyphens"
    if (slugError) newErrors.slug = slugError

    if (createAdmin) {
      if (!adminEmail.trim()) newErrors.adminEmail = "Email is required"
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) newErrors.adminEmail = "Invalid email"
      if (!adminFirstName.trim()) newErrors.adminFirstName = "First name is required"
      if (!adminLastName.trim()) newErrors.adminLastName = "Last name is required"
      if (!adminPassword.trim()) newErrors.adminPassword = "Password is required"
      else if (adminPassword.length < 8) newErrors.adminPassword = "Min 8 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await organizationsApi.create({
        name: orgName.trim(),
        slug: slug.trim(),
        logoUrl: logoFile || undefined,
      })

      // TODO: If createAdmin is true, create admin user via separate API

      setStep("success")
      onSuccess?.()
    } catch (err: any) {
      console.error("Failed to create organization:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to create organization",
        variant: "destructive",
      })

      // Check for slug conflict
      if (err.message?.includes("Slug already exists")) {
        setSlugError("Slug already taken")
        setErrors(prev => ({ ...prev, slug: "Slug already taken" }))
      }
    } finally {
      setSaving(false)
    }
  }

  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg border-border bg-background text-foreground shadow-2xl">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Organization created!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-medium text-foreground">{orgName}</span> has been created successfully.
            </p>
            {createAdmin && adminEmail && (
              <p className="text-sm text-muted-foreground">
                An admin account has been created for{" "}
                <span className="font-medium text-foreground">{adminEmail}</span>
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setStep("form")
                  setOrgName("")
                  setSlug("")
                  setSlugManuallyEdited(false)
                  setLogoFile(null)
                  setCreateAdmin(false)
                  setAdminEmail("")
                  setAdminFirstName("")
                  setAdminLastName("")
                  setAdminPassword("")
                  setErrors({})
                }}
              >
                Create Another
              </Button>
              <Button className="bg-blue-600 text-white hover:bg-blue-500" onClick={() => onOpenChange(false)}>
                View Organization
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-border bg-background text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>Add a new organization to the platform</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Basic Information</h3>

            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="orgName"
                placeholder="Enter organization name"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value)
                  setErrors((prev) => ({ ...prev, orgName: "" }))
                }}
                className={errors.orgName ? "border-red-500" : ""}
                disabled={saving}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">This will be displayed throughout the platform</p>
              {errors.orgName && <p className="text-xs text-red-500">{errors.orgName}</p>}
            </div>

            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="orgSlug">
                Organization Slug <span className="text-red-500">*</span>
              </Label>
              <div className="flex">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted px-3 text-sm text-muted-foreground">
                  https://
                </span>
                <Input
                  id="orgSlug"
                  placeholder="your-org"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  onBlur={handleSlugBlur}
                  className={`rounded-none ${errors.slug || slugError ? "border-red-500" : ""}`}
                  disabled={saving}
                />
                <span className="inline-flex items-center whitespace-nowrap rounded-r-md border border-l-0 border-border bg-muted px-3 text-sm text-muted-foreground">
                  .nexus.io
                  {slugChecking && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier. Only lowercase letters, numbers, and hyphens.
              </p>
              {(errors.slug || slugError) && (
                <p className="text-xs text-red-500">{errors.slug || slugError}</p>
              )}
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Organization Logo <span className="text-muted-foreground">(optional)</span></Label>
              {logoFile ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-background">
                    <span className="text-xs text-muted-foreground">Logo</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{logoFile}</p>
                    <p className="text-xs text-muted-foreground">Image uploaded</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setLogoFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 flex flex-col items-center gap-2 transition-colors hover:border-blue-400/50 hover:bg-muted"
                  onClick={() => setLogoFile("logo.png")}
                >
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    Drag & drop or <span className="font-medium text-blue-400">click to upload</span>
                  </span>
                  <span className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</span>
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* Section: Initial Admin User */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Create admin user for this organization</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Optional: Set up an initial admin account</p>
              </div>
              <Switch checked={createAdmin} onCheckedChange={setCreateAdmin} disabled={saving} />
            </div>

            {createAdmin && (
              <div className="space-y-4 pt-2">
                {/* Admin Email */}
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@organization.com"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value)
                      setErrors((prev) => ({ ...prev, adminEmail: "" }))
                    }}
                    className={errors.adminEmail ? "border-red-500" : ""}
                    disabled={saving}
                  />
                  {errors.adminEmail && <p className="text-xs text-red-500">{errors.adminEmail}</p>}
                </div>

                {/* First & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminFirst">First Name</Label>
                    <Input
                      id="adminFirst"
                      placeholder="John"
                      value={adminFirstName}
                      onChange={(e) => {
                        setAdminFirstName(e.target.value)
                        setErrors((prev) => ({ ...prev, adminFirstName: "" }))
                      }}
                      className={errors.adminFirstName ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {errors.adminFirstName && <p className="text-xs text-red-500">{errors.adminFirstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminLast">Last Name</Label>
                    <Input
                      id="adminLast"
                      placeholder="Doe"
                      value={adminLastName}
                      onChange={(e) => {
                        setAdminLastName(e.target.value)
                        setErrors((prev) => ({ ...prev, adminLastName: "" }))
                      }}
                      className={errors.adminLastName ? "border-red-500" : ""}
                      disabled={saving}
                    />
                    {errors.adminLastName && <p className="text-xs text-red-500">{errors.adminLastName}</p>}
                  </div>
                </div>

                {/* Temporary Password */}
                <div className="space-y-2">
                  <Label htmlFor="adminPass">Temporary Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="adminPass"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value)
                          setErrors((prev) => ({ ...prev, adminPassword: "" }))
                        }}
                        className={`pr-10 ${errors.adminPassword ? "border-red-500" : ""}`}
                        disabled={saving}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5 whitespace-nowrap border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => {
                        setAdminPassword(generatePassword())
                        setShowPassword(true)
                        setErrors((prev) => ({ ...prev, adminPassword: "" }))
                      }}
                      disabled={saving}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">User will be required to change password on first login</p>
                  {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword}</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-border bg-background text-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-500" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
