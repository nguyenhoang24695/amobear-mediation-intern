"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Edit, MoreHorizontal, Copy, ToggleLeft, Trash2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { OrgOverviewTab } from "./tabs/org-overview-tab"
import { OrgUsersTab } from "./tabs/org-users-tab"
import { OrgSettingsTab } from "./tabs/org-settings-tab"

// Mock data
const orgsData: Record<string, {
  id: string
  name: string
  slug: string
  initials: string
  bgColor: string
  status: "active" | "inactive"
  created: string
  users: number
  activeUsers: number
  teams: number
  appsAccess: number
}> = {
  "1": {
    id: "1",
    name: "Amobear Inc",
    slug: "Nexus",
    initials: "WP",
    bgColor: "bg-blue-100 text-blue-700",
    status: "active",
    created: "January 15, 2025",
    users: 45,
    activeUsers: 42,
    teams: 8,
    appsAccess: 24,
  },
  "2": {
    id: "2",
    name: "GameStudio Pro",
    slug: "gamestudio",
    initials: "GS",
    bgColor: "bg-green-100 text-green-700",
    status: "active",
    created: "January 20, 2025",
    users: 32,
    activeUsers: 30,
    teams: 5,
    appsAccess: 18,
  },
}

interface OrganizationDetailContentProps {
  orgId: string
}

export function OrganizationDetailContent({ orgId }: OrganizationDetailContentProps) {
  const org = orgsData[orgId] || orgsData["1"]
  const [copied, setCopied] = useState(false)

  const handleCopySlug = () => {
    navigator.clipboard.writeText(`${org.slug}.mediationpro.io`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/organizations"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Organizations
      </Link>

      {/* Organization Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 rounded-xl">
            <AvatarFallback className={`rounded-xl text-lg font-bold ${org.bgColor}`}>
              {org.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
              <Badge
                className={
                  org.status === "active"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-red-100 text-red-700 border-red-200"
                }
              >
                {org.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{org.slug}.mediationpro.io</span>
              <button
                onClick={handleCopySlug}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Copy slug"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-sm text-slate-500">Created {org.created}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-transparent">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="bg-transparent">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem>
                <ToggleLeft className="w-4 h-4 mr-2" />
                {org.status === "active" ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OrgOverviewTab org={org} />
        </TabsContent>

        <TabsContent value="users">
          <OrgUsersTab org={org} />
        </TabsContent>

        <TabsContent value="settings">
          <OrgSettingsTab org={org} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
