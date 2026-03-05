"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import { OrganizationDetailContent } from "./organization-detail-content"

export function MyOrganizationContent() {
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    if (user?.organization?.id) {
      setOrgId(user.organization.id)
    }
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-600 mb-4">You are not associated with any organization.</p>
      </div>
    )
  }

  return (
    <OrganizationDetailContent
      orgId={orgId}
      backLink="/"
      backLabel="Back to Dashboard"
    />
  )
}
