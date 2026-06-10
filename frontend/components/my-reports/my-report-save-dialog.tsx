"use client"

import { useEffect, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import type { MyReportConfig } from "@/components/my-reports/hooks/use-my-report-config"
import { serializeMyReportConfig } from "@/lib/reports/my-report-config-serializer"
import { myReportSavedApi, type MyReportSavedListItem } from "@/lib/api/my-report-saved"

export type MyReportSaveDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: MyReportConfig
  reportTitle: string
  onSaved?: (item: MyReportSavedListItem) => void
}

export function MyReportSaveDialog({
  open,
  onOpenChange,
  config,
  reportTitle,
  onSaved,
}: MyReportSaveDialogProps) {
  const [name, setName] = useState(reportTitle)
  const [overwrite, setOverwrite] = useState(false)
  const [existingTemplates, setExistingTemplates] = useState<MyReportSavedListItem[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(reportTitle)
    setOverwrite(false)
    setSelectedTemplateId("")
    setError(null)
    setLoadingList(true)
    void myReportSavedApi
      .list()
      .then((items) => setExistingTemplates(items))
      .catch(() => setExistingTemplates([]))
      .finally(() => setLoadingList(false))
  }, [open, reportTitle])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Template name is required")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload = {
        name: trimmed,
        config: serializeMyReportConfig(config),
        visibility: "private" as const,
      }

      const saved = overwrite && selectedTemplateId
        ? await myReportSavedApi.update(selectedTemplateId, payload)
        : await myReportSavedApi.create(payload)

      onSaved?.({
        id: saved.id,
        name: saved.name,
        visibility: saved.visibility,
        updatedAt: saved.updatedAt,
        ownerId: saved.ownerId,
        ownerName: saved.ownerName,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save report template</DialogTitle>
          <DialogDescription>
            Save the current filters, metrics, charts, and pivot settings as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My UA summary"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <Checkbox checked={overwrite} onCheckedChange={(checked) => setOverwrite(checked === true)} />
            Overwrite an existing template
          </label>

          {overwrite ? (
            <div className="space-y-1.5">
              <Label htmlFor="template-overwrite">Existing template</Label>
              <select
                id="template-overwrite"
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                disabled={loadingList}
              >
                <option value="">Select template…</option>
                {existingTemplates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
