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

interface CreateOrganizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const [step, setStep] = useState<"form" | "success">("form")
  const [saving, setSaving] = useState(false)

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
    setSlugChecking(true)
    // Simulate uniqueness check
    await new Promise((resolve) => setTimeout(resolve, 600))
    setSlugChecking(false)
    // Simulate: "mediacorp" is taken
    if (slug === "mediacorp") {
      setSlugError("Slug already taken. Try: mediacorp-1")
    }
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
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    setStep("success")
  }

  if (step === "success") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Organization created!</h2>
            <p className="text-sm text-slate-500 mb-1">
              <span className="font-medium text-slate-700">{orgName}</span> has been created successfully.
            </p>
            {createAdmin && adminEmail && (
              <p className="text-sm text-slate-500">
                An admin account has been created for{" "}
                <span className="font-medium text-slate-700">{adminEmail}</span>
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="bg-transparent"
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
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onOpenChange(false)}>
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>Add a new organization to the platform</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Basic Information</h3>

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
              <p className="text-xs text-slate-500">This will be displayed throughout the platform</p>
              {errors.orgName && <p className="text-xs text-red-500">{errors.orgName}</p>}
            </div>

            {/* Organization Slug */}
            <div className="space-y-2">
              <Label htmlFor="orgSlug">
                Organization Slug <span className="text-red-500">*</span>
              </Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-50 border border-r-0 border-slate-200 rounded-l-md">
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
                <span className="inline-flex items-center px-3 text-sm text-slate-500 bg-slate-50 border border-l-0 border-slate-200 rounded-r-md whitespace-nowrap">
                  .mediationpro.io
                  {slugChecking && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                URL-friendly identifier. Only lowercase letters, numbers, and hyphens.
              </p>
              {(errors.slug || slugError) && (
                <p className="text-xs text-red-500">{errors.slug || slugError}</p>
              )}
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Organization Logo <span className="text-slate-400">(optional)</span></Label>
              {logoFile ? (
                <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <span className="text-xs text-slate-500">Logo</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{logoFile}</p>
                    <p className="text-xs text-slate-500">Image uploaded</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setLogoFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                  onClick={() => setLogoFile("logo.png")}
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    Drag & drop or <span className="text-blue-600 font-medium">click to upload</span>
                  </span>
                  <span className="text-xs text-slate-400">PNG, JPG, SVG up to 2MB</span>
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* Section: Initial Admin User */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Create admin user for this organization</h3>
                <p className="text-xs text-slate-500 mt-0.5">Optional: Set up an initial admin account</p>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent gap-1.5 whitespace-nowrap"
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
                  <p className="text-xs text-slate-500">User will be required to change password on first login</p>
                  {errors.adminPassword && <p className="text-xs text-red-500">{errors.adminPassword}</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" className="bg-transparent" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
