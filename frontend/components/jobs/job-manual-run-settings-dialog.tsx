"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Loader2, Settings2 } from "lucide-react"
import type { Job } from "./job-management-content"
import type { HangfireJobSchedule, ManualRunInputType, ManualRunQueryParamField } from "@/types/api"
import { parseManualRunJson } from "@/lib/jobs/manual-run"
import { jobSchedulesApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"

const PARAM_TYPES: { value: ManualRunInputType; label: string }[] = [
  { value: "string", label: "String" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "DateTime" },
  { value: "integer", label: "Integer" },
  { value: "boolean", label: "Boolean" },
]

type DraftRow = {
  id: string
  key: string
  inputType: ManualRunInputType
  isRequired: boolean
}

function newRow(): DraftRow {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r-${Date.now()}`,
    key: "",
    inputType: "string",
    isRequired: false,
  }
}

function configToDraftRows(cfg: ReturnType<typeof parseManualRunJson>): DraftRow[] {
  const qp = cfg?.queryParams ?? []
  return qp.map((p) => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `r-${Date.now()}-${p.key}`,
    key: p.key,
    inputType: p.inputType,
    isRequired: p.isRequired,
  }))
}

function draftToFields(rows: DraftRow[]): ManualRunQueryParamField[] {
  const out: ManualRunQueryParamField[] = []
  for (const r of rows) {
    const key = r.key.trim()
    if (!key) continue
    out.push({
      key,
      inputType: r.inputType,
      isRequired: r.isRequired,
    })
  }
  return out
}

interface JobManualRunSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job | null
  /** Gọi sau khi lưu thành công; nhận bản ghi mới từ API (có manualRunJson cập nhật). */
  onSaved?: (schedule: HangfireJobSchedule) => void
  /** Gọi sau khi xóa cấu hình manual_run_json. */
  onCleared?: () => void
}

export function JobManualRunSettingsDialog({
  open,
  onOpenChange,
  job,
  onSaved,
  onCleared,
}: JobManualRunSettingsDialogProps) {
  const { toast } = useToast()
  const [useAsyncRun, setUseAsyncRun] = useState(false)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [saving, setSaving] = useState(false)

  const jobKey = job?.jobId ?? ""

  useEffect(() => {
    if (!open || !job) return
    const cfg = parseManualRunJson(job.manualRunJson)
    setUseAsyncRun(!!cfg?.useAsyncRun)
    const next = configToDraftRows(cfg)
    setRows(next.length > 0 ? next : [])
  }, [open, job, jobKey, job?.manualRunJson])

  const hasDuplicateKeys = useMemo(() => {
    const keys = rows.map((r) => r.key.trim()).filter(Boolean)
    return new Set(keys).size !== keys.length
  }, [rows])

  const handleSave = async () => {
    if (!job) return
    if (hasDuplicateKeys) {
      toast({
        title: "Trùng key",
        description: "Mỗi query key phải duy nhất.",
        variant: "destructive",
      })
      return
    }
    for (const r of rows) {
      if (!r.key.trim()) {
        toast({
          title: "Thiếu key",
          description: "Xóa dòng trống hoặc điền tên tham số (query key).",
          variant: "destructive",
        })
        return
      }
    }

    const fields = draftToFields(rows)
    const json = {
      useAsyncRun,
      queryParams: fields,
    }
    const manualRunJson = JSON.stringify(json)

    setSaving(true)
    try {
      const updated = await jobSchedulesApi.update(job.jobId, {
        setManualRunJson: true,
        manualRunJson,
      })
      toast({
        title: "Đã lưu",
        description: "Cấu hình Run now (manual_run_json) đã ghi vào database.",
      })
      onOpenChange(false)
      onSaved?.(updated)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Lưu thất bại"
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    if (!job) return
    setSaving(true)
    try {
      await jobSchedulesApi.update(job.jobId, {
        setManualRunJson: true,
        manualRunJson: null,
      })
      toast({
        title: "Đã xóa",
        description: "manual_run_json đã được xóa cho job này.",
      })
      onOpenChange(false)
      onCleared?.()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Xóa thất bại"
      toast({ title: "Lỗi", description: message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Run now — Tham số
          </DialogTitle>
          <DialogDescription>
            Ghi <span className="font-mono">manual_run_json</span> cho{" "}
            <span className="font-semibold">{job.displayName || job.jobId}</span> (
            <span className="font-mono text-xs">{job.jobId}</span>). Endpoint jobs-test luôn suy ra từ job id (bỏ hậu tố{" "}
            <span className="font-mono">-job</span> nếu có).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="masync">Chạy nền (async + SSE log)</Label>
              <p className="text-xs text-muted-foreground">POST /api/v1/jobs-test/runs thay vì POST trực tiếp.</p>
            </div>
            <Switch id="masync" checked={useAsyncRun} onCheckedChange={setUseAsyncRun} disabled={saving} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tham số query</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setRows((x) => [...x, newRow()])} disabled={saving}>
                <Plus className="h-4 w-4 mr-1" />
                Thêm tham số
              </Button>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md p-4 text-center">
                Chưa có tham số — Run now chỉ gọi endpoint không kèm query.
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-lg border p-3 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                      <div className="sm:col-span-1">
                        <Label className="text-xs">Query key</Label>
                        <Input
                          className="font-mono h-8 text-sm"
                          placeholder="force"
                          value={row.key}
                          onChange={(e) =>
                            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)))
                          }
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Input type</Label>
                        <Select
                          value={row.inputType}
                          onValueChange={(v: ManualRunInputType) =>
                            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, inputType: v } : r)))
                          }
                          disabled={saving}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PARAM_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pb-1">
                        <Checkbox
                          id={`req-${row.id}`}
                          checked={row.isRequired}
                          onCheckedChange={(c) =>
                            setRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, isRequired: c === true } : r))
                            )
                          }
                          disabled={saving}
                        />
                        <Label htmlFor={`req-${row.id}`} className="text-xs font-normal cursor-pointer">
                          Bắt buộc
                        </Label>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                        disabled={saving}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Xóa dòng
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {hasDuplicateKeys ? <p className="text-sm text-destructive">Có ít nhất hai tham số trùng query key.</p> : null}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="text-destructive border-destructive/50" onClick={() => void handleClear()} disabled={saving}>
            Xóa cấu hình DB
          </Button>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Hủy
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || hasDuplicateKeys}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Lưu vào database
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
