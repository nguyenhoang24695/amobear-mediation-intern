"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  getMobileNavHub,
  getVisibleMobileNavHubItems,
} from "@/lib/navigation/mobile-nav-hubs"

interface MobileNavHubContentProps {
  slug: string
}

export function MobileNavHubContent({ slug }: MobileNavHubContentProps) {
  const router = useRouter()
  const hub = getMobileNavHub(slug)
  const items = hub ? getVisibleMobileNavHubItems(hub) : []

  useEffect(() => {
    if (items.length === 1) {
      router.replace(items[0].href)
    }
  }, [items, router])

  if (!hub || items.length === 0) {
    return (
      <div className="flex flex-col gap-4 py-8 text-center">
        <p className="text-sm text-slate-500">This section is not available.</p>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-sm text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">{hub.title}</h1>
        {hub.description ? (
          <p className="mt-1 text-sm text-slate-500">{hub.description}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href} className="block min-w-0">
              <Card
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-2 border-slate-200 p-4 text-center transition-colors",
                  "hover:border-blue-200 hover:bg-blue-50/40 active:bg-blue-50/60",
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex w-full min-w-0 flex-col items-center gap-1 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                    {item.isNew ? (
                      <Badge className="h-5 shrink-0 bg-green-500 px-1.5 text-[10px] hover:bg-green-600">
                        New
                      </Badge>
                    ) : null}
                  </div>
                  {item.description ? (
                    <p className="text-xs leading-snug text-slate-500">{item.description}</p>
                  ) : null}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
