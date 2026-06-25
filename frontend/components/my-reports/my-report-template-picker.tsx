"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { myReportSavedApi, type MyReportSavedListItem } from "@/lib/api/my-report-saved"

export type MyReportTemplatePickerProps = {
  onLoadTemplate: (templateId: string) => void | Promise<void>
  disabled?: boolean
}

export function MyReportTemplatePicker({ onLoadTemplate, disabled }: MyReportTemplatePickerProps) {
  const [mine, setMine] = useState<MyReportSavedListItem[]>([])
  const [shared, setShared] = useState<MyReportSavedListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([
      myReportSavedApi.list().catch(() => [] as MyReportSavedListItem[]),
      myReportSavedApi.listShared().catch(() => [] as MyReportSavedListItem[]),
    ])
      .then(([mineItems, sharedItems]) => {
        if (cancelled) return
        setMine(mineItems)
        setShared(sharedItems)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const hasTemplates = mine.length > 0 || shared.length > 0
  const label = useMemo(() => {
    if (loading) return "Loading templates…"
    if (!hasTemplates) return "No templates"
    return "Load template"
  }, [hasTemplates, loading])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={disabled || loading || !hasTemplates}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {label}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {mine.length > 0 ? (
          <>
            <DropdownMenuLabel>My templates</DropdownMenuLabel>
            {mine.map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => void onLoadTemplate(item.id)}>
                {item.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {mine.length > 0 && shared.length > 0 ? <DropdownMenuSeparator /> : null}
        {shared.length > 0 ? (
          <>
            <DropdownMenuLabel>Shared (org)</DropdownMenuLabel>
            {shared.map((item) => (
              <DropdownMenuItem key={item.id} onClick={() => void onLoadTemplate(item.id)}>
                {item.name}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
