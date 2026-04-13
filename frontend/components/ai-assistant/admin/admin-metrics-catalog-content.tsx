"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Database,
  Tag,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { aiAdminApi, MetricsCatalogDto } from "@/lib/api/ai-admin"

const domainColors: Record<string, string> = {
  revenue: "bg-emerald-100 text-emerald-700",
  engagement: "bg-blue-100 text-blue-700",
  retention: "bg-purple-100 text-purple-700",
  iap: "bg-amber-100 text-amber-700",
  ua: "bg-rose-100 text-rose-700",
  game: "bg-indigo-100 text-indigo-700",
  ad_perf: "bg-orange-100 text-orange-700",
  product: "bg-sky-100 text-sky-700",
  growth: "bg-teal-100 text-teal-700",
  health: "bg-violet-100 text-violet-700",
}

const domainLabels: Record<string, string> = {
  revenue: "Revenue",
  engagement: "Engagement",
  retention: "Retention",
  iap: "IAP",
  ua: "UA",
  game: "Game",
  ad_perf: "Ad Perf",
  product: "Product",
  growth: "Growth",
  health: "Health",
}

const domains = [
  "all",
  "revenue",
  "engagement",
  "retention",
  "iap",
  "ua",
  "game",
  "ad_perf",
  "product",
  "growth",
  "health",
] as const

const emptyMetricForm = {
  metricKey: "",
  displayName: "",
  domain: "revenue",
  formula: "",
  formulaSql: "",
  description: "",
  sourceTable: "",
  unit: "%",
  thresholdHealthy: "",
  thresholdWarning: "",
  thresholdCritical: "",
  tagsInput: "",
  defaultPriority: 5,
}

export function AdminMetricsCatalogContent() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [metrics, setMetrics] = useState<MetricsCatalogDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [activeDomain, setActiveDomain] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<MetricsCatalogDto | null>(null)
  const [editingMetric, setEditingMetric] = useState<MetricsCatalogDto | null>(null)
  const [form, setForm] = useState(emptyMetricForm)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await aiAdminApi.getMetricsCatalog()
      setMetrics(data)
    } catch (error) {
      console.error("Failed to load metrics", error)
      toast({ title: "Error", description: "Failed to load metrics catalog", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = { all: metrics.length }
    for (const m of metrics) {
      counts[m.domain] = (counts[m.domain] || 0) + 1
    }
    return counts
  }, [metrics])

  const filteredMetrics = useMemo(() => {
    let result = metrics
    if (activeDomain !== "all") {
      result = result.filter((m) => m.domain === activeDomain)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.metricKey.toLowerCase().includes(q) ||
          m.displayName.toLowerCase().includes(q) ||
          m.formula.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return result
  }, [metrics, activeDomain, search])

  const openAddDialog = () => {
    setEditingMetric(null)
    setForm(emptyMetricForm)
    setShowAddDialog(true)
  }

  const openEditDialog = (metric: MetricsCatalogDto) => {
    setEditingMetric(metric)
    setForm({
      metricKey: metric.metricKey,
      displayName: metric.displayName,
      domain: metric.domain,
      formula: metric.formula,
      formulaSql: metric.formulaSql ?? "",
      description: metric.description ?? "",
      sourceTable: metric.sourceTable ?? "",
      unit: metric.unit,
      thresholdHealthy: metric.thresholds?.healthy ?? "",
      thresholdWarning: metric.thresholds?.warning ?? "",
      thresholdCritical: metric.thresholds?.critical ?? "",
      tagsInput: metric.tags.join(", "),
      defaultPriority: metric.defaultPriority,
    })
    setShowAddDialog(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const thresholds =
        form.thresholdHealthy || form.thresholdWarning || form.thresholdCritical
          ? { healthy: form.thresholdHealthy, warning: form.thresholdWarning, critical: form.thresholdCritical }
          : undefined

      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      if (editingMetric) {
        await aiAdminApi.updateMetric(editingMetric.id, {
          displayName: form.displayName,
          domain: form.domain,
          formula: form.formula,
          formulaSql: form.formulaSql || undefined,
          description: form.description || undefined,
          sourceTable: form.sourceTable || undefined,
          unit: form.unit,
          thresholds,
          tags,
          defaultPriority: form.defaultPriority,
        })
        toast({ title: "Updated", description: `Metric "${form.displayName}" updated successfully` })
      } else {
        await aiAdminApi.createMetric({
          metricKey: form.metricKey,
          displayName: form.displayName,
          domain: form.domain,
          formula: form.formula,
          formulaSql: form.formulaSql || undefined,
          description: form.description || undefined,
          sourceTable: form.sourceTable || undefined,
          unit: form.unit,
          thresholds,
          tags,
          defaultPriority: form.defaultPriority,
        })
        toast({ title: "Created", description: `Metric "${form.displayName}" created successfully` })
      }

      setShowAddDialog(false)
      await loadMetrics()
    } catch (error: unknown) {
      console.error("Failed to save metric", error)
      const message = error instanceof Error ? error.message : "Failed to save metric"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) return

    try {
      setIsDeleting(showDeleteConfirm.id)
      await aiAdminApi.deleteMetric(showDeleteConfirm.id)
      toast({ title: "Deleted", description: `Metric "${showDeleteConfirm.displayName}" deleted` })
      setShowDeleteConfirm(null)
      await loadMetrics()
    } catch (error) {
      console.error("Failed to delete metric", error)
      toast({ title: "Error", description: "Failed to delete metric", variant: "destructive" })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) return

    try {
      setIsImporting(true)
      const result = await aiAdminApi.importMetrics(importFile)
      setImportResult(result)

      if (result.imported > 0) {
        toast({
          title: "Import completed",
          description: `Imported ${result.imported} metrics, skipped ${result.skipped}`,
        })
        await loadMetrics()
      } else if (result.errors.length > 0) {
        toast({ title: "Import failed", description: result.errors[0], variant: "destructive" })
      } else {
        toast({ title: "No new metrics", description: `All ${result.skipped} metrics already exist` })
      }
    } catch (error) {
      console.error("Failed to import metrics", error)
      toast({ title: "Error", description: "Failed to import metrics", variant: "destructive" })
    } finally {
      setIsImporting(false)
    }
  }

  const closeImportDialog = () => {
    setShowImportDialog(false)
    setImportFile(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const priorityColor = (p: number) => {
    if (p >= 9) return "bg-red-100 text-red-700"
    if (p >= 7) return "bg-amber-100 text-amber-700"
    return "bg-slate-100 text-slate-600"
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                <Database className="h-6 w-6" />
                Metrics Catalog
              </h1>
              <p className="text-sm text-slate-500">
                <Badge variant="outline" className="mr-1 text-xs">
                  {metrics.length} metrics
                </Badge>
                Quản lý định nghĩa metrics cho AI Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Import CSV
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Add Metric
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search metrics..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {domains.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDomain(d)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    activeDomain === d
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {d === "all" ? "All" : domainLabels[d] ?? d}
                  <span className="ml-1 opacity-70">({domainCounts[d] ?? 0})</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Formula</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-center">Priority</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics.map((metric) => (
                  <TableRow key={metric.id} className="group hover:bg-slate-50">
                    <TableCell className="pl-6 font-mono text-xs text-slate-700">
                      {metric.metricKey}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {metric.displayName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-xs font-medium border-0",
                          domainColors[metric.domain] ?? "bg-slate-100 text-slate-600"
                        )}
                      >
                        {domainLabels[metric.domain] ?? metric.domain}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                      {metric.formula}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[140px] truncate font-mono">
                      {metric.sourceTable}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{metric.unit}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-xs font-semibold border-0", priorityColor(metric.defaultPriority))}>
                        {metric.defaultPriority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(metric)}>
                          <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDeleteConfirm(metric)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMetrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      No metrics found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMetric ? "Edit Metric" : "Add New Metric"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>
                metric_key <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. ecpm"
                value={form.metricKey}
                onChange={(e) => updateField("metricKey", e.target.value)}
                disabled={!!editingMetric}
              />
            </div>
            <div className="space-y-2">
              <Label>
                display_name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. eCPM"
                value={form.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>domain</Label>
              <Select value={form.domain} onValueChange={(v) => updateField("domain", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(domainLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>unit</Label>
              <Select value={form.unit} onValueChange={(v) => updateField("unit", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="$">$</SelectItem>
                  <SelectItem value="count">count</SelectItem>
                  <SelectItem value="ratio">ratio</SelectItem>
                  <SelectItem value="score">score</SelectItem>
                  <SelectItem value="tier">tier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>
                formula <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. ad_revenue / impressions × 1000"
                value={form.formula}
                onChange={(e) => updateField("formula", e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>formula_sql</Label>
              <Textarea
                placeholder="SQL expression..."
                value={form.formulaSql}
                onChange={(e) => updateField("formulaSql", e.target.value)}
                className="font-mono text-sm min-h-[80px]"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>description</Label>
              <Textarea
                placeholder="Mô tả metric..."
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label>source_table</Label>
              <Input
                placeholder="e.g. gold.ad_performance"
                value={form.sourceTable}
                onChange={(e) => updateField("sourceTable", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>default_priority (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.defaultPriority}
                onChange={(e) => updateField("defaultPriority", parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="col-span-2">
              <Label className="mb-3 block">Thresholds</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Healthy
                  </div>
                  <Input
                    placeholder='e.g. > 5'
                    value={form.thresholdHealthy}
                    onChange={(e) => updateField("thresholdHealthy", e.target.value)}
                    className="border-emerald-200 focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Warning
                  </div>
                  <Input
                    placeholder='e.g. 2-5'
                    value={form.thresholdWarning}
                    onChange={(e) => updateField("thresholdWarning", e.target.value)}
                    className="border-amber-200 focus-visible:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    Critical
                  </div>
                  <Input
                    placeholder='e.g. < 2'
                    value={form.thresholdCritical}
                    onChange={(e) => updateField("thresholdCritical", e.target.value)}
                    className="border-red-200 focus-visible:ring-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </Label>
              <Input
                placeholder="comma-separated, e.g. iaa, ecpm, revenue"
                value={form.tagsInput}
                onChange={(e) => updateField("tagsInput", e.target.value)}
              />
              {form.tagsInput && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.tagsInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs bg-slate-50">
                        {tag}
                      </Badge>
                    ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSave}
              disabled={isSaving || !form.metricKey || !form.displayName || !form.formula}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingMetric ? "Save Changes" : "Add Metric"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Metric</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-4">
            Are you sure you want to delete <strong>{showDeleteConfirm?.displayName}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={closeImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Metrics from CSV</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                importFile ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                ref={fileInputRef}
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] ?? null)
                  setImportResult(null)
                }}
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                {importFile ? (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{importFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Click to upload CSV file
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Required columns: metric_key, display_name, domain, formula
                    </p>
                  </div>
                )}
              </label>
            </div>
            {importResult && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Import Result</p>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {importResult.imported} metrics imported
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-blue-500" />
                    {importResult.skipped} metrics skipped (already exist)
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="flex items-start gap-2 text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                      <div>
                        {importResult.errors.slice(0, 3).map((err, i) => (
                          <div key={i}>{err}</div>
                        ))}
                        {importResult.errors.length > 3 && (
                          <div>...and {importResult.errors.length - 3} more errors</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!importFile || isImporting}
                onClick={handleImport}
              >
                {isImporting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
