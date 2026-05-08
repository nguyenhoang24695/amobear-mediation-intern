"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { structureApi } from "@/lib/api/services"
import {
  autoDiscoverPlaybook,
  getCategoryProfiles,
  getPlaybook,
  getPlaybookVersionYaml,
  rollbackPlaybook,
  savePlaybook,
  validatePlaybookForApp,
  type AiCategoryProfile,
} from "@/lib/api/agent-specialized"

type Props = {
  appId: string
  appRowId: number
}

function firstDiffLine(a: string, b: string): number | null {
  const la = a.split("\n")
  const lb = b.split("\n")
  const max = Math.max(la.length, lb.length)
  for (let i = 0; i < max; i++) {
    if ((la[i] ?? "") !== (lb[i] ?? "")) return i + 1
  }
  return null
}

export function AppPlaybookEditorPanel({ appId, appRowId }: Props) {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [appTitle, setAppTitle] = useState<string>("")
  const [categories, setCategories] = useState<AiCategoryProfile[]>([])

  const [yaml, setYaml] = useState("")
  const [categoryId, setCategoryId] = useState("creative_utility")
  const [status, setStatus] = useState("draft")
  const [headVersion, setHeadVersion] = useState<number | null>(null)
  const [lastUpdatedByEmail, setLastUpdatedByEmail] = useState<string | null>(null)

  const [validation, setValidation] = useState<string[] | null>(null)

  const [versions, setVersions] = useState<{ id: string; version: number; createdAt: string; createdByEmail?: string }[]>([])
  const [compareVersion, setCompareVersion] = useState<number | null>(null)
  const [compareYaml, setCompareYaml] = useState("")
  const [compareLoading, setCompareLoading] = useState(false)
  const [rollbackPick, setRollbackPick] = useState<number | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [app, res, cats] = await Promise.all([
        structureApi.getAppByAppId(appId),
        getPlaybook(appRowId),
        getCategoryProfiles(),
      ])

      setAppTitle(app.displayName || app.name || `#${appRowId}`)
      setCategories(cats)

      const pb = res.playbook
      if (pb) {
        setYaml(pb.playbookYaml)
        setCategoryId(pb.categoryId)
        setStatus(pb.status)
        setHeadVersion(pb.version)
        setLastUpdatedByEmail(pb.lastUpdatedByEmail ?? null)
        setVersions(pb.versions ?? [])
      } else {
        setYaml("")
        setHeadVersion(null)
        setLastUpdatedByEmail(null)
        setVersions([])
      }
    } catch (e: unknown) {
      toast({
        title: "Load playbook failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [appId, appRowId, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!Number.isFinite(appRowId ?? NaN) || compareVersion == null) {
      setCompareYaml("")
      return
    }
    let cancelled = false
    setCompareLoading(true)
    void getPlaybookVersionYaml(appRowId, compareVersion)
      .then((r) => {
        if (!cancelled) setCompareYaml(r.playbookYaml)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          toast({
            title: "Không tải được snapshot",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setCompareLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [appRowId, compareVersion, toast])

  const diffLine = useMemo(() => {
    if (!compareYaml) return null
    return firstDiffLine(yaml, compareYaml)
  }, [yaml, compareYaml])

  const onValidate = useCallback(async () => {
    try {
      const res = await validatePlaybookForApp(appRowId, yaml)
      setValidation(res.valid ? [] : res.errors)
      toast({
        title: res.valid ? "Playbook hợp lệ" : "Playbook không hợp lệ",
        description: res.valid ? "Bạn có thể Save & publish." : `${res.errors.length} lỗi.`,
        variant: res.valid ? "default" : "destructive",
      })
    } catch (e: unknown) {
      toast({
        title: "Validate failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }, [appRowId, toast, yaml])

  const onSave = useCallback(async () => {
    try {
      const res = await validatePlaybookForApp(appRowId, yaml)
      if (!res.valid) {
        setValidation(res.errors)
        toast({
          title: "Không thể lưu",
          description: `Playbook có ${res.errors.length} lỗi. Hãy sửa trước khi publish.`,
          variant: "destructive",
        })
        return
      }
      await savePlaybook(appRowId, { categoryId, playbookYaml: yaml, status })
      toast({ title: "Đã lưu playbook", description: "Đã tạo version mới." })
      await load()
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }, [appRowId, categoryId, load, status, toast, yaml])

  const onAutoDiscover = useCallback(async () => {
    try {
      const res = await autoDiscoverPlaybook(appRowId)
      setYaml(res.draftYaml)
      setCategoryId(res.categoryId)
      setStatus("auto_generated")
      toast({
        title: "Auto-discover OK",
        description: `category=${res.categoryId} · conf=${res.confidence.toFixed(2)}`,
      })
    } catch (e: unknown) {
      toast({
        title: "Auto-discover failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    }
  }, [appRowId, toast])

  const onRollback = useCallback(async () => {
    if (rollbackPick == null) return
    setRollbackLoading(true)
    try {
      const res = await rollbackPlaybook(appRowId, rollbackPick)
      toast({ title: "Rollback OK", description: `rolled back from v${res.rolledBackFrom} → new v${res.newVersion}` })
      setRollbackPick(null)
      await load()
    } catch (e: unknown) {
      toast({
        title: "Rollback failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setRollbackLoading(false)
    }
  }, [appRowId, load, rollbackPick, toast])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">AI Playbook — {appTitle}</CardTitle>
          <CardDescription>
            {headVersion != null ? (
              <>
                Version {headVersion}
                {lastUpdatedByEmail ? ` · ${lastUpdatedByEmail}` : ""}
              </>
            ) : (
              <>Chưa có playbook. Bạn có thể Auto-discover để tạo draft.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="category" />
                </SelectTrigger>
                <SelectContent>
                  {sortedCategories.map((c) => (
                    <SelectItem key={c.categoryId} value={c.categoryId}>
                      {c.displayName || c.categoryId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="deprecated">deprecated</SelectItem>
                  <SelectItem value="auto_generated">auto_generated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onAutoDiscover} disabled={loading || compareLoading}>
              Auto-discover
            </Button>
            <Button type="button" variant="secondary" onClick={onValidate} disabled={loading}>
              Validate
            </Button>
            <Button type="button" onClick={onSave} disabled={loading}>
              Save & publish
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Playbook YAML</Label>
            <Textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              rows={18}
              className="font-mono text-xs"
              placeholder="playbook_version: 2 ..."
            />
          </div>

          {validation && validation.length > 0 ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="font-medium">Validation errors</div>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {validation.slice(0, 12).map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Version history</CardTitle>
          <CardDescription>So sánh editor với snapshot đã lưu; rollback sẽ tạo bản mới (draft) từ YAML cũ.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>So sánh với version</Label>
              <Select
                value={compareVersion != null ? String(compareVersion) : "__none__"}
                onValueChange={(v) => setCompareVersion(v === "__none__" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— không so sánh —</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={String(v.version)}>
                      v{v.version}
                      {v.version === headVersion ? " (current head)" : ""}
                      {" · "}
                      {new Date(v.createdAt).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {compareVersion != null ? (
                <p className="text-muted-foreground text-xs">
                  {compareLoading
                    ? "Đang tải snapshot…"
                    : diffLine == null
                      ? "Nội dung trùng với editor (theo so sánh từng dòng)."
                      : `Khác editor từ dòng ${diffLine}.`}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Rollback</Label>
              <Select
                value={rollbackPick != null ? String(rollbackPick) : "__pick__"}
                onValueChange={(v) => setRollbackPick(v === "__pick__" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn version để rollback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__">— chọn version —</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={String(v.version)}>
                      v{v.version} · {new Date(v.createdAt).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="destructive" onClick={onRollback} disabled={rollbackPick == null || rollbackLoading}>
                {rollbackLoading ? "Rolling back…" : "Rollback & create new draft"}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {loading ? "Loading…" : versions.length === 0 ? "Chưa có versions." : `Tổng ${versions.length} versions.`}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

