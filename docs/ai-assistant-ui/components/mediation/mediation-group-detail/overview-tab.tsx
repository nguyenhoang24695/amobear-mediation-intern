"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Percent,
  Calendar,
  Clock,
  Hash,
  Gift,
  Globe,
  Smartphone,
  ArrowRight,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Mock data
const basicInfo = {
  groupId: "grp_abc123xyz",
  admobGroupId: "ca-app-pub-1234567890123456/9876543210",
  created: "Dec 15, 2024",
  lastModified: "Jan 15, 2025",
  format: "Rewarded",
  appName: "Weather Plus Pro",
  appId: "app_123",
}

const targetingInfo = {
  countries: [
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  ],
  devices: "All devices",
  osVersion: "iOS 14.0+, Android 10+",
  customRules: "Premium users only",
}

const performanceStats = [
  { label: "eCPM", value: "$18.45", change: 8.2, icon: DollarSign },
  { label: "Fill Rate", value: "94.5%", change: 2.1, icon: Percent },
  { label: "Impressions", value: "1.2M", change: 12.5, icon: Eye },
  { label: "Revenue (7D)", value: "$22,140", change: 15.3, icon: DollarSign },
]

const adSourcesPreview = {
  bidding: [
    { name: "AdMob Bidding", color: "bg-yellow-400" },
    { name: "Meta AN", color: "bg-blue-600" },
    { name: "Unity Ads", color: "bg-slate-800" },
    { name: "AppLovin", color: "bg-red-500" },
  ],
  waterfall: [
    { name: "ironSource", color: "bg-purple-600" },
    { name: "Vungle", color: "bg-blue-500" },
    { name: "Chartboost", color: "bg-green-500" },
    { name: "Pangle", color: "bg-cyan-500" },
    { name: "InMobi", color: "bg-indigo-500" },
    { name: "Mintegral", color: "bg-pink-500" },
    { name: "Fyber", color: "bg-orange-500" },
    { name: "AdColony", color: "bg-teal-500" },
  ],
}

export function MediationGroupOverviewTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-6">
      {/* Left Column */}
      <div className="flex flex-col gap-6">
        {/* Basic Information Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Group ID</p>
                <code className="text-sm font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {basicInfo.groupId}
                </code>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">AdMob Group ID</p>
                <code className="text-sm font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded truncate block">
                  {basicInfo.admobGroupId}
                </code>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created
                </p>
                <p className="text-sm font-medium text-slate-900">{basicInfo.created}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last Modified
                </p>
                <p className="text-sm font-medium text-slate-900">{basicInfo.lastModified}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Gift className="w-3 h-3" />
                  Format
                </p>
                <Badge className="bg-amber-100 text-amber-700 border-0">{basicInfo.format}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  App
                </p>
                <Link href={`/apps/${basicInfo.appId}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {basicInfo.appName}
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Targeting Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Targeting</CardTitle>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-600">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Countries */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Countries
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {targetingInfo.countries.map((country) => (
                    <Badge key={country.code} variant="outline" className="gap-1.5 bg-slate-50 border-slate-200">
                      <span>{country.flag}</span>
                      {country.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Devices */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Devices
                </p>
                <p className="text-sm text-slate-900">{targetingInfo.devices}</p>
              </div>

              {/* OS Version */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500">OS Version</p>
                <p className="text-sm text-slate-900">{targetingInfo.osVersion}</p>
              </div>

              {/* Custom Rules */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Custom Rules</p>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {targetingInfo.customRules}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-6">
        {/* Performance Summary Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Performance (7D)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              {performanceStats.map((stat, idx) => (
                <div key={idx} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <stat.icon className="w-3 h-3" />
                    {stat.label}
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    {stat.change > 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={cn("text-xs font-medium", stat.change > 0 ? "text-green-600" : "text-red-600")}>
                      {stat.change > 0 ? "+" : ""}
                      {stat.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ad Sources Preview Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Ad Sources</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Bidding Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-slate-700">Bidding</p>
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {adSourcesPreview.bidding.length} sources
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {adSourcesPreview.bidding.map((source, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold",
                        source.color,
                      )}
                      title={source.name}
                    >
                      {source.name.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Waterfall Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-slate-700">Waterfall</p>
                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700">
                    {adSourcesPreview.waterfall.length} sources
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  {adSourcesPreview.waterfall.slice(0, 5).map((source, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-4">{idx + 1}</span>
                      <div className={cn("w-3 h-3 rounded-sm", source.color)} />
                      <span className="text-sm text-slate-700">{source.name}</span>
                    </div>
                  ))}
                  {adSourcesPreview.waterfall.length > 5 && (
                    <p className="text-xs text-slate-500 ml-6">+{adSourcesPreview.waterfall.length - 5} more sources</p>
                  )}
                </div>
              </div>

              <Button variant="link" className="p-0 h-auto text-blue-600 gap-1">
                Edit Waterfall
                <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
