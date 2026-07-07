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
  revenue: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  engagement: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  retention: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  iap: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ua: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  game: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  ad_perf: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  product: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  growth: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  health: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
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
    if (p >= 9) return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
    if (p >= 7) return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
    return "bg-muted text-muted-foreground"
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 overflow-hidden px-4 pb-28 pt-6 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Button variant="ghost" size="icon" className="shrink-0" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="flex items-start gap-2 text-2xl font-semibold text-foreground sm:items-center">
                <Database className="mt-0.5 h-6 w-6 shrink-0 sm:mt-0" />
                Metrics Catalog
              </h1>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                <Badge variant="outline" className="mr-1 text-xs">
                  {metrics.length} metrics
                </Badge>
                Quản lý định nghĩa metrics cho AI Assistant
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <Button variant="outline" className="min-w-0 flex-1 sm:flex-none" onClick={() => setShowImportDialog(true)}>
              <Upload className="mr-1 h-4 w-4 shrink-0" />
              Import CSV
            </Button>
            <Button className="min-w-0 flex-1 sm:flex-none" onClick={openAddDialog}>
              <Plus className="mr-1 h-4 w-4 shrink-0" />
              Add Metric
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {d === "all" ? "All" : domainLabels[d] ?? d}
                  <span className="ml-1 opacity-70">({domainCounts[d] ?? 0})</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
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
                    <TableRow key={metric.id} className="group hover:bg-muted/50">
                      <TableCell className="pl-6 font-mono text-xs text-foreground">
                        {metric.metricKey}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {metric.displayName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs font-medium border-0",
                            domainColors[metric.domain] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {domainLabels[metric.domain] ?? metric.domain}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                        {metric.formula}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate font-mono text-xs text-muted-foreground">
                        {metric.sourceTable}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{metric.unit}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs font-semibold border-0", priorityColor(metric.defaultPriority))}>
                          {metric.defaultPriority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(metric)}>
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
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
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        No metrics found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMetric ? "Edit Metric" : "Add New Metric"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label>
                formula <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. ad_revenue / impressions x 1000"
                value={form.formula}
                onChange={(e) => updateField("formula", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>formula_sql</Label>
              <Textarea
                placeholder="SQL expression..."
                value={form.formulaSql}
                onChange={(e) => updateField("formulaSql", e.target.value)}
                className="min-h-[80px] font-mono text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
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

            <div className="sm:col-span-2">
              <Label className="mb-3 block">Thresholds</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

            <div className="space-y-2 sm:col-span-2">
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
                      <Badge key={tag} variant="outline" className="bg-muted text-xs">
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
          <p className="py-4 text-sm text-muted-foreground">
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
                importFile
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-muted-foreground/40"
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
                <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                {importFile ? (
                  <div>
                    <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Click to upload CSV file
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Required columns: metric_key, display_name, domain, formula
                    </p>
                  </div>
                )}
              </label>
            </div>
            {importResult && (
              <div className="mt-4 rounded-lg bg-muted p-3">
                <p className="mb-2 text-sm font-medium text-foreground">Import Result</p>
                <div className="space-y-1 text-xs text-muted-foreground">
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
