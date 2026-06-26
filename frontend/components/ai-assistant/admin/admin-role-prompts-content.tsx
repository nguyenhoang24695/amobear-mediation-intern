"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  Settings,
  Plus,
  Edit2,
  Eye,
  TestTube2,
  History,
  Shield,
  Tag,
  X,
  Check,
  Copy,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import {
  aiAdminApi,
  RolePromptDto,
  RolePromptVersionDto,
  SystemConfigDto,
} from "@/lib/api/ai-admin"

type CraftKey = "craftContext" | "craftRole" | "craftAction" | "craftFormat" | "craftTone"

const craftSections: { key: CraftKey; label: string; badge: string }[] = [
  { key: "craftContext", label: "Context", badge: "C" },
  { key: "craftRole", label: "Role", badge: "R" },
  { key: "craftAction", label: "Action", badge: "A" },
  { key: "craftFormat", label: "Format", badge: "F" },
  { key: "craftTone", label: "Tone", badge: "T" },
]

const craftBadgeClass =
  "border-primary/20 bg-primary/10 text-primary text-[11px] font-bold px-1.5 py-0"
const sectionPanelClass =
  "rounded-lg border bg-muted/25 p-4 transition-colors hover:bg-muted/35"
const codeBlockClass =
  "rounded-md border bg-background p-3 font-mono text-xs text-foreground/80 whitespace-pre-wrap"

const emptyRoleForm = {
  roleKey: "",
  displayName: "",
  craftContext: "",
  craftRole: "",
  craftAction: "",
  craftFormat: "",
  craftTone: "",
  includedTopics: "",
  excludedTopics: "",
}

export function AdminRolePromptsContent() {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [roles, setRoles] = useState<RolePromptDto[]>([])
  const [activeTab, setActiveTab] = useState("")
  const [baseRulesConfig, setBaseRulesConfig] = useState<SystemConfigDto | null>(null)
  const [formatDefaultConfig, setFormatDefaultConfig] = useState<SystemConfigDto | null>(null)
  const [toneDefaultConfig, setToneDefaultConfig] = useState<SystemConfigDto | null>(null)

  const [editingCraft, setEditingCraft] = useState<{ roleId: string; key: CraftKey; label: string } | null>(null)
  const [editCraftValue, setEditCraftValue] = useState("")
  const [editChangeNote, setEditChangeNote] = useState("")

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [versions, setVersions] = useState<RolePromptVersionDto[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState("")
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const [showTest, setShowTest] = useState(false)
  const [testQuestion, setTestQuestion] = useState("")
  const [testResponse, setTestResponse] = useState("")
  const [testLoading, setTestLoading] = useState(false)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState(emptyRoleForm)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<RolePromptDto | null>(null)

  const selectedRole = roles.find((r) => r.roleKey === activeTab)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [rolesData, configsData] = await Promise.all([
        aiAdminApi.getRolePrompts(),
        aiAdminApi.getSystemConfigs(),
      ])

      setRoles(rolesData)
      if (rolesData.length > 0 && !activeTab) {
        setActiveTab(rolesData[0].roleKey)
      }

      setBaseRulesConfig(configsData.find((c) => c.configKey === "base_rules") ?? null)
      setFormatDefaultConfig(configsData.find((c) => c.configKey === "craft_format_default") ?? null)
      setToneDefaultConfig(configsData.find((c) => c.configKey === "craft_tone_default") ?? null)
    } catch (error) {
      console.error("Failed to load data", error)
      toast({ title: "Error", description: "Failed to load role prompts", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [toast, activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleToggleActive = async (role: RolePromptDto) => {
    try {
      setIsSaving(true)
      await aiAdminApi.updateRolePrompt(role.id, { isActive: !role.isActive })
      toast({ title: "Updated", description: `Role ${role.displayName} ${role.isActive ? "deactivated" : "activated"}` })
      await loadData()
    } catch (error) {
      console.error("Failed to toggle role", error)
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleOverrideToggle = async (role: RolePromptDto, key: "craftFormat" | "craftTone") => {
    try {
      setIsSaving(true)
      const newValue = role[key] === null ? "" : null
      await aiAdminApi.updateRolePrompt(role.id, { [key]: newValue })
      await loadData()
    } catch (error) {
      console.error("Failed to toggle override", error)
      toast({ title: "Error", description: "Failed to update", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const openCraftEditor = (role: RolePromptDto, key: CraftKey, label: string) => {
    setEditingCraft({ roleId: role.id, key, label })
    setEditCraftValue(role[key] ?? "")
    setEditChangeNote("")
  }

  const saveCraftEdit = async () => {
    if (!editingCraft || !selectedRole) return
    try {
      setIsSaving(true)
      await aiAdminApi.updateRolePrompt(selectedRole.id, {
        [editingCraft.key]: editCraftValue || null,
        changeNote: editChangeNote || `Updated ${editingCraft.label}`,
      })
      toast({ title: "Saved", description: `${editingCraft.label} updated successfully` })
      setEditingCraft(null)
      await loadData()
    } catch (error) {
      console.error("Failed to save", error)
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const loadVersionHistory = async (roleId: string) => {
    setShowVersionHistory(true)
    setIsLoadingVersions(true)
    try {
      const data = await aiAdminApi.getRolePromptVersions(roleId)
      setVersions(data)
    } catch (error) {
      console.error("Failed to load versions", error)
      toast({ title: "Error", description: "Failed to load version history", variant: "destructive" })
    } finally {
      setIsLoadingVersions(false)
    }
  }

  const handleRollback = async (version: number) => {
    if (!selectedRole) return
    try {
      setIsSaving(true)
      await aiAdminApi.rollbackRolePrompt(selectedRole.id, version)
      toast({ title: "Rolled back", description: `Rolled back to version ${version}` })
      setShowVersionHistory(false)
      await loadData()
    } catch (error) {
      console.error("Failed to rollback", error)
      toast({ title: "Error", description: "Failed to rollback", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const loadPreview = async (roleId: string) => {
    setShowPreview(true)
    setIsLoadingPreview(true)
    setPreviewContent("")
    try {
      const result = await aiAdminApi.previewRolePrompt(roleId)
      setPreviewContent(result.assembledPrompt)
    } catch (error) {
      console.error("Failed to load preview", error)
      toast({ title: "Error", description: "Failed to preview prompt", variant: "destructive" })
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleTest = async () => {
    if (!testQuestion.trim() || !selectedRole) return
    setTestLoading(true)
    setTestResponse("")
    try {
      const result = await aiAdminApi.testRolePrompt(selectedRole.id, { question: testQuestion })
      setTestResponse(result.response)
    } catch (error) {
      console.error("Failed to test", error)
      toast({ title: "Error", description: "Failed to test prompt", variant: "destructive" })
    } finally {
      setTestLoading(false)
    }
  }

  const handleCreateRole = async () => {
    try {
      setIsSaving(true)
      await aiAdminApi.createRolePrompt({
        roleKey: createForm.roleKey,
        displayName: createForm.displayName,
        craftContext: createForm.craftContext,
        craftRole: createForm.craftRole,
        craftAction: createForm.craftAction,
        craftFormat: createForm.craftFormat || undefined,
        craftTone: createForm.craftTone || undefined,
        includedTopics: createForm.includedTopics.split(",").map((t) => t.trim()).filter(Boolean),
        excludedTopics: createForm.excludedTopics.split(",").map((t) => t.trim()).filter(Boolean),
      })
      toast({ title: "Created", description: `Role "${createForm.displayName}" created successfully` })
      setShowCreateDialog(false)
      setCreateForm(emptyRoleForm)
      await loadData()
      setActiveTab(createForm.roleKey)
    } catch (error: unknown) {
      console.error("Failed to create role", error)
      const message = error instanceof Error ? error.message : "Failed to create role"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!showDeleteConfirm) return
    try {
      setIsSaving(true)
      await aiAdminApi.deleteRolePrompt(showDeleteConfirm.id)
      toast({ title: "Deleted", description: `Role "${showDeleteConfirm.displayName}" deleted` })
      setShowDeleteConfirm(null)
      await loadData()
      if (roles.length > 1) {
        const remaining = roles.filter((r) => r.id !== showDeleteConfirm.id)
        setActiveTab(remaining[0]?.roleKey ?? "")
      }
    } catch (error) {
      console.error("Failed to delete role", error)
      toast({ title: "Error", description: "Failed to delete role", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const tokenCount = previewContent.split(/\s+/).length * 1.3

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-muted/20 p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/ai-assistant">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Tag className="h-6 w-6 text-primary" />
                AI Role Prompt Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Quản lý CRAFT prompts cho từng role, global rules và defaults
              </p>
            </div>
          </div>
        </div>

        {/* Global Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Base Rules
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">v{baseRulesConfig?.version ?? 1}</Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/ai-assistant/admin/system-config">
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className={cn(codeBlockClass, "line-clamp-4")}>
                {baseRulesConfig?.configValue?.slice(0, 300) ?? "Not configured"}...
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  CRAFT Defaults
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    F:v{formatDefaultConfig?.version ?? 1} T:v{toneDefaultConfig?.version ?? 1}
                  </Badge>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/ai-assistant/admin/system-config">
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Format:</span>{" "}
                {formatDefaultConfig?.configValue?.slice(0, 80) ?? "Not configured"}...
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Tone:</span>{" "}
                {toneDefaultConfig?.configValue?.slice(0, 80) ?? "Not configured"}...
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role Prompt Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex h-auto max-w-full flex-wrap justify-start">
            {roles.map((role) => (
              <TabsTrigger key={role.roleKey} value={role.roleKey} className="gap-1.5">
                {role.roleKey.toUpperCase()}
                {!role.isActive && <span className="text-muted-foreground">(inactive)</span>}
              </TabsTrigger>
            ))}
            <TabsTrigger value="__new" className="gap-1.5 text-muted-foreground" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              New Role
            </TabsTrigger>
          </TabsList>

          {/* New Role Placeholder */}
          <TabsContent value="__new">
            <Card>
              <CardContent className="py-16 text-center">
                <Plus className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium text-foreground">Create New Role Prompt</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Thêm role mới với CRAFT prompt riêng cho team hoặc use case cụ thể
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Role
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Detail Tabs */}
          {roles.map((role) => (
            <TabsContent key={role.roleKey} value={role.roleKey}>
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          {role.displayName}
                        </CardTitle>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          Updated: {new Date(role.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-2">
                        v{role.version}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setShowDeleteConfirm(role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={role.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleToggleActive(role)}
                        disabled={isSaving}
                        className={cn(
                          role.isActive
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "text-muted-foreground"
                        )}
                      >
                        {role.isActive ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 mr-1" />
                            Inactive
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* CRAFT Sections */}
                  {craftSections.map(({ key, label, badge }) => {
                    const isOverridable = key === "craftFormat" || key === "craftTone"
                    const isOverridden = isOverridable && role[key] !== null
                    const value = role[key]

                    return (
                      <div key={key} className={sectionPanelClass}>
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={craftBadgeClass}
                            >
                              {badge}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">{label}</span>
                          </div>
                          {isOverridable ? (
                            <div className="flex items-center gap-2">
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={isOverridden}
                                  onChange={() => handleOverrideToggle(role, key as "craftFormat" | "craftTone")}
                                  disabled={isSaving}
                                  className="rounded border-input accent-primary"
                                />
                                Override default
                              </label>
                              {isOverridden && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => openCraftEditor(role, key, label)}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => openCraftEditor(role, key, label)}
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {isOverridable && !isOverridden ? (
                          <p className="text-xs italic text-muted-foreground">Using global default</p>
                        ) : (
                          <pre className={codeBlockClass}>
                            {value || "(empty)"}
                          </pre>
                        )}
                      </div>
                    )
                  })}

                  {/* Topics */}
                  <div className={sectionPanelClass}>
                    <div className="mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Topics</span>
                    </div>
                    <div className="space-y-2">
                      {role.includedTopics.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-16 text-xs text-muted-foreground">Included:</span>
                          {role.includedTopics.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-300"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {role.excludedTopics.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-16 text-xs text-muted-foreground">Excluded:</span>
                          {role.excludedTopics.map((t) => (
                            <Badge
                              key={t}
                              variant="outline"
                              className="border-destructive/30 bg-destructive/10 text-[11px] text-destructive"
                            >
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {role.includedTopics.length === 0 && role.excludedTopics.length === 0 && (
                        <p className="text-xs italic text-muted-foreground">No topic filters configured</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => loadVersionHistory(role.id)}>
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => loadPreview(role.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview Assembled
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestQuestion("")
                        setTestResponse("")
                        setShowTest(true)
                      }}
                    >
                      <TestTube2 className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Edit CRAFT Section Dialog */}
      <Dialog open={!!editingCraft} onOpenChange={(open) => { if (!open) setEditingCraft(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit [{editingCraft?.label}] - {selectedRole?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={editCraftValue}
              onChange={(e) => setEditCraftValue(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder={`Enter ${editingCraft?.label} content...`}
            />
            <div className="space-y-2">
              <Label>Change Note (optional)</Label>
              <Input
                value={editChangeNote}
                onChange={(e) => setEditChangeNote(e.target.value)}
                placeholder="Describe what changed..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveCraftEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Version History - {selectedRole?.displayName}</DialogTitle>
          </DialogHeader>
          {isLoadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No version history yet</p>
          ) : (
            <div className="max-h-[400px] space-y-3 overflow-y-auto py-2">
              {versions.map((v, idx) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border bg-muted/25 p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">v{v.version}</span>
                      {idx === 0 && <Badge className="bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">Previous</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{v.changeNote || "No note"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.createdByEmail || "System"} - {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollback(v.version)}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
                    Rollback
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Assembled Prompt Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Assembled L1 Prompt - {selectedRole?.displayName}</span>
              {previewContent && (
                <Badge variant="secondary" className="text-xs font-normal">
                  ~{Math.round(tokenCount).toLocaleString()} tokens
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {isLoadingPreview ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="relative max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/25 p-4">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-7 text-xs"
                onClick={() => navigator.clipboard.writeText(previewContent)}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">{previewContent}</pre>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTest} onOpenChange={setShowTest}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Prompt - {selectedRole?.displayName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sample Question</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Top 10 app có doanh thu cao nhất tháng này?"
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleTest() }}
                />
                <Button
                  className="shrink-0"
                  onClick={handleTest}
                  disabled={testLoading || !testQuestion.trim()}
                >
                  {testLoading ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>

            {testResponse && (
              <div className="space-y-2">
                <Label>Response</Label>
                <pre className="max-h-[400px] overflow-y-auto rounded-lg border bg-muted/25 p-4 font-mono text-sm text-foreground whitespace-pre-wrap">
                  {testResponse}
                </pre>
              </div>
            )}

            {testLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTest(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role Prompt</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Role Key <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. marketing"
                value={createForm.roleKey}
                onChange={(e) => setCreateForm((f) => ({ ...f, roleKey: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Marketing Analyst"
                value={createForm.displayName}
                onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Context <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="You are part of..."
                value={createForm.craftContext}
                onChange={(e) => setCreateForm((f) => ({ ...f, craftContext: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="You are a..."
                value={createForm.craftRole}
                onChange={(e) => setCreateForm((f) => ({ ...f, craftRole: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Action <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Generate..."
                value={createForm.craftAction}
                onChange={(e) => setCreateForm((f) => ({ ...f, craftAction: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Format (optional override)</Label>
              <Textarea
                placeholder="Leave empty to use global default"
                value={createForm.craftFormat}
                onChange={(e) => setCreateForm((f) => ({ ...f, craftFormat: e.target.value }))}
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Tone (optional override)</Label>
              <Textarea
                placeholder="Leave empty to use global default"
                value={createForm.craftTone}
                onChange={(e) => setCreateForm((f) => ({ ...f, craftTone: e.target.value }))}
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Included Topics</Label>
              <Input
                placeholder="comma-separated"
                value={createForm.includedTopics}
                onChange={(e) => setCreateForm((f) => ({ ...f, includedTopics: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Excluded Topics</Label>
              <Input
                placeholder="comma-separated"
                value={createForm.excludedTopics}
                onChange={(e) => setCreateForm((f) => ({ ...f, excludedTopics: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={isSaving || !createForm.roleKey || !createForm.displayName || !createForm.craftContext || !createForm.craftRole || !createForm.craftAction}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Role Prompt</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{showDeleteConfirm?.displayName}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
