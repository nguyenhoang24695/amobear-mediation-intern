"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DataSourceOverviewItemDto } from "@/types/api"
import { formatDistanceToNow } from "date-fns"

function formatIso(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

export function SourcesOverviewGrid({ sources }: { sources: DataSourceOverviewItemDto[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Data Sources Overview</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {sources.map((src) => (
            <Card key={src.key} className="overflow-hidden">
              <div className={cn("h-1", src.brandColorClass)} />
              <CardHeader className="pb-2 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{src.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-snug">{src.role}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {src.domains.map((dom) => {
                  const dk = `${src.key}__${dom.domainKey}`
                  const expanded = open[dk] ?? true
                  return (
                  <Collapsible
                    key={dk}
                    open={expanded}
                    onOpenChange={(v) => setOpen((prev) => ({ ...prev, [dk]: v }))}
                    className="border border-slate-100 rounded-md"
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between h-9 px-2 font-medium text-slate-700">
                        <span className="text-xs">{dom.label}</span>
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-2 pb-2 space-y-2">
                      <p className="text-[11px] text-slate-500 leading-snug">{dom.description}</p>
                      {dom.minioPathPattern && (
                        <p className="text-[10px] font-mono text-slate-400 break-all">MinIO: {dom.minioPathPattern}</p>
                      )}
                      {dom.starRocksNotes && <p className="text-[10px] text-slate-500">{dom.starRocksNotes}</p>}
                      <div className="space-y-1.5">
                        {dom.jobs.length === 0 && (
                          <p className="text-[11px] text-slate-400 italic py-1">
                            No Hangfire recurring jobs mapped — add schedules in Job Management or update the Data Sources registry.
                          </p>
                        )}
                        {dom.jobs.map((j) => (
                          <div
                            key={j.jobId}
                            className="flex flex-wrap items-center gap-1.5 text-[11px] bg-slate-50 rounded px-2 py-1.5"
                          >
                            <span className="font-mono text-slate-700">{j.displayName || j.jobId}</span>
                            <Badge variant={j.enabled ? "outline" : "secondary"} className="text-[10px] h-5">
                              {j.enabled ? "on" : "off"}
                            </Badge>
                            {j.lastCheckpointAt && (
                              <span className="text-slate-500">checkpoint {formatIso(j.lastCheckpointAt)}</span>
                            )}
                            <Link
                              href={`/jobs?search=${encodeURIComponent(j.jobId)}`}
                              className="inline-flex items-center gap-0.5 text-blue-600 hover:underline ml-auto"
                            >
                              Jobs <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  )
                })}
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}
