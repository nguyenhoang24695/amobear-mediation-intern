"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Smartphone } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { teamMembersApi, structureApi } from "@/lib/api/services"

function formatMappingDate(value?: string | null) {
  if (value == null || value === "") return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface AbUserAppMappingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

export function AbUserAppMappingModal({ open, onOpenChange, userId, userName }: AbUserAppMappingModalProps) {
  const { data: mappingResp, loading: mappingLoading } = useApi(
    () => teamMembersApi.getAbUserAppMapping(userId),
    { enabled: open && !!userId, cacheKey: `ab-user-app-mapping-modal-${userId}` }
  )
  const { data: appsResp } = useApi(() => structureApi.getApps(), {
    enabled: open,
    cacheKey: "ab-user-app-mapping-modal-apps",
  })

  const rows = mappingResp?.data ?? []
  const allApps = appsResp?.apps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AdUser App Mapping</DialogTitle>
          <DialogDescription>
            Rows from <span className="font-mono">gold.ab_user_app_mapping</span> for{" "}
            <span className="font-semibold text-slate-900">{userName}</span> (StarRocks).
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {mappingLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="min-w-[200px]">App</TableHead>
                  <TableHead className="font-mono text-xs">App ID</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>End date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const matchedApp = allApps?.find((a) => a.appId === row.appId)
                  const appLabel = matchedApp?.displayName || matchedApp?.name || row.appId
                  const active = row.endDate == null || row.endDate === ""
                  return (
                    <TableRow key={`${idx}-${row.appId}-${row.startDate ?? ""}-${row.endDate ?? ""}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 rounded-lg">
                            {matchedApp?.iconUri ? <AvatarImage src={matchedApp.iconUri} alt={appLabel} /> : null}
                            <AvatarFallback className="rounded-lg bg-slate-100">
                              <Smartphone className="w-4 h-4 text-slate-400" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-900">{appLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-600">{row.appId}</span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-700">{formatMappingDate(row.startDate)}</TableCell>
                      <TableCell className="text-sm text-slate-700">{formatMappingDate(row.endDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            active
                              ? "border-green-200 bg-green-50 text-green-700 text-xs"
                              : "border-slate-200 bg-slate-50 text-slate-600 text-xs"
                          }
                        >
                          {active ? "Active" : "Ended"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-10 text-sm">
                      No rows in StarRocks for this user, or StarRocks is not configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
