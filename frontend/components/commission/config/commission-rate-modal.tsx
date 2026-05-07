"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/auth"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { commissionApi, organizationsApi, teamMembersApi, type OrgUserItem } from "@/lib/api/services"
import type { CreateCommissionRateRequest } from "@/types/api"
import type { PermittedAppListItem } from "@/types/api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const EMPTY: CreateCommissionRateRequest = {
  username: "",
  appId: "",
  commissionRate: null,
  effectiveDate: "",
  expiryDate: null,
}

function getInitials(nameOrEmail: string): string {
  const s = (nameOrEmail || "").trim()
  if (!s) return "U"
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return s[0].toUpperCase()
}

export function CommissionRateModal({ open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<CreateCommissionRateRequest>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [users, setUsers] = useState<OrgUserItem[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const latestUsersReqIdRef = useRef(0)

  const [selectedUserId, setSelectedUserId] = useState<string>("")

  const [appPopoverOpen, setAppPopoverOpen] = useState(false)
  const [appSearch, setAppSearch] = useState("")
  const [apps, setApps] = useState<PermittedAppListItem[]>([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [appsError, setAppsError] = useState<string | null>(null)
  const latestAppsReqIdRef = useRef(0)
  const [selectedAppItem, setSelectedAppItem] = useState<PermittedAppListItem | null>(null)

  const orgId = getCurrentUser()?.organization?.id

  const selectedUser = users.find((u) => u.email === form.username) ?? null
  const selectedApp = selectedAppItem && selectedAppItem.appId === form.appId ? selectedAppItem : null

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
      setUserPopoverOpen(false)
      setUserSearch("")
      setUsers([])
      setUsersLoading(false)
      setUsersError(null)
      setSelectedUserId("")
      setAppPopoverOpen(false)
      setAppSearch("")
      setApps([])
      setAppsLoading(false)
      setAppsError(null)
      setSelectedAppItem(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!userPopoverOpen) return
    if (!orgId) return

    const q = userSearch.trim()
    const handle = window.setTimeout(async () => {
      const reqId = ++latestUsersReqIdRef.current
      setUsersLoading(true)
      setUsersError(null)

      try {
        const res = await organizationsApi.getUsers(orgId, {
          page: 1,
          pageSize: 50,
          search: q || undefined,
        })
        if (reqId !== latestUsersReqIdRef.current) return
        setUsers(res.items ?? [])
      } catch (err: unknown) {
        if (reqId !== latestUsersReqIdRef.current) return
        setUsers([])
        setUsersError((err as { message?: string })?.message ?? "Failed to load users")
      } finally {
        if (reqId === latestUsersReqIdRef.current) setUsersLoading(false)
      }
    }, 2000)

    return () => window.clearTimeout(handle)
  }, [open, userPopoverOpen, orgId, userSearch])

  useEffect(() => {
    if (!open) return
    if (!appPopoverOpen) return
    if (!selectedUserId) return

    const q = appSearch.trim()
    const handle = window.setTimeout(async () => {
      const reqId = ++latestAppsReqIdRef.current
      setAppsLoading(true)
      setAppsError(null)

      try {
        const res = await teamMembersApi.getPermittedApps(selectedUserId, {
          search: q || undefined,
          limit: 50,
        })
        if (reqId !== latestAppsReqIdRef.current) return
        setApps(res.data ?? [])
      } catch (err: unknown) {
        if (reqId !== latestAppsReqIdRef.current) return
        setApps([])
        setAppsError((err as { message?: string })?.message ?? "Failed to load apps")
      } finally {
        if (reqId === latestAppsReqIdRef.current) setAppsLoading(false)
      }
    }, 2000)

    return () => window.clearTimeout(handle)
  }, [open, appPopoverOpen, selectedUserId, appSearch])

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.username.trim() || !selectedUserId) e.username = "User is required"
    if (!form.appId.trim()) e.appId = "App ID is required"
    if (!form.effectiveDate) e.effectiveDate = "Effective date is required"
    if (
      form.commissionRate !== null &&
      form.commissionRate !== undefined &&
      (form.commissionRate < 0 || form.commissionRate > 100)
    ) e.commissionRate = "Rate must be between 0 and 100"
    if (form.expiryDate && form.effectiveDate && form.expiryDate < form.effectiveDate)
      e.expiryDate = "Expiry date must be on or after effective date"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await commissionApi.createRate(form)
      toast({ title: "Commission rate created" })
      onSaved()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Unable to create"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function set<K extends keyof CreateCommissionRateRequest>(
    key: K,
    value: CreateCommissionRateRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add commission rate</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>User *</Label>
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={userPopoverOpen}
                  disabled={usersLoading || !orgId}
                  className={cn("h-10 w-full justify-between bg-white px-3 text-left font-normal", {
                    "border-red-500 focus-visible:ring-red-200": !!errors.username,
                  })}
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {selectedUser ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {selectedUser.avatarUrl && <AvatarImage src={selectedUser.avatarUrl} />}
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {getInitials(selectedUser.fullName || selectedUser.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="truncate font-medium text-slate-900">
                            {selectedUser.fullName || selectedUser.email}
                          </span>
                          <span className="block truncate font-mono text-xs text-slate-500">
                            {selectedUser.email}
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        {!orgId ? "No organization" : "Select a user..."}
                      </span>
                    )}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onValueChange={setUserSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {usersLoading
                        ? "Searching..."
                        : usersError
                          ? usersError
                          : userSearch.trim().length === 0
                            ? "Type to search users."
                            : "No users found."}
                    </CommandEmpty>
                    <CommandGroup>
                      {users.map((u: OrgUserItem) => {
                        const isSelected = u.email === form.username
                        return (
                          <CommandItem
                            key={u.id}
                            value={`${u.fullName ?? ""} ${u.email ?? ""} ${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()}
                            onSelect={() => {
                              set("username", u.email)
                              setSelectedUserId(u.id)
                              set("appId", "")
                              setAppSearch("")
                              setApps([])
                              setAppsError(null)
                              setAppPopoverOpen(false)
                              setSelectedAppItem(null)
                              setUserPopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                            />
                            <Avatar className="h-7 w-7 shrink-0">
                              {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {getInitials(u.fullName || u.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-slate-900">
                                {u.fullName || u.email}
                              </div>
                              <div className="truncate font-mono text-xs text-slate-500">{u.email}</div>
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
          </div>

          {selectedUserId && (
            <div className="grid gap-1.5">
              <Label>App *</Label>
              <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={appPopoverOpen}
                    disabled={!selectedUserId || appsLoading}
                    className={cn("h-10 w-full justify-between bg-white px-3 text-left font-normal", {
                      "border-red-500 focus-visible:ring-red-200": !!errors.appId,
                    })}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {selectedApp ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar className="h-7 w-7 shrink-0 rounded-lg">
                            {selectedApp.iconUri && (
                              <AvatarImage
                                src={selectedApp.iconUri}
                                alt={selectedApp.displayName || selectedApp.name || selectedApp.appId}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium">
                              {getInitials(selectedApp.displayName || selectedApp.name || selectedApp.appId)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1 truncate">
                            <span className="truncate font-medium text-slate-900">
                              {selectedApp.displayName || selectedApp.name || selectedApp.appId}
                            </span>
                            <span className="block truncate font-mono text-xs text-slate-500">
                              {selectedApp.appId}
                              {selectedApp.appStoreId ? ` • ${selectedApp.appStoreId}` : ""}
                            </span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Select an app...</span>
                      )}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search by name, App Store ID, or App ID..."
                      value={appSearch}
                      onValueChange={setAppSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {appsLoading
                          ? "Searching..."
                          : appsError
                            ? appsError
                            : appSearch.trim().length === 0
                              ? "Type to search apps."
                              : "No apps found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {apps.map((a) => {
                          const isSelected = a.appId === form.appId
                          const title = a.displayName || a.name || a.appId
                          return (
                            <CommandItem
                              key={a.appId}
                              value={`${title} ${a.appStoreId ?? ""} ${a.appId}`.trim()}
                              onSelect={() => {
                                set("appId", a.appId)
                                setSelectedAppItem(a)
                                setAppPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                              />
                              <Avatar className="h-7 w-7 shrink-0 rounded-lg">
                                {a.iconUri && (
                                  <AvatarImage
                                    src={a.iconUri}
                                    alt={title}
                                    className="object-cover"
                                  />
                                )}
                                <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-[10px] font-medium">
                                  {getInitials(title)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-900">{title}</div>
                                <div className="truncate font-mono text-xs text-slate-500">
                                  {a.appId}
                                  {a.appStoreId ? ` • ${a.appStoreId}` : ""}
                                </div>
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.appId && <p className="text-xs text-red-500">{errors.appId}</p>}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>
              Commission rate (%) — leave empty = NULL (no commission)
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="Example: 15.5"
              value={form.commissionRate ?? ""}
              onChange={(e) =>
                set("commissionRate", e.target.value === "" ? null : parseFloat(e.target.value))
              }
            />
            {errors.commissionRate && (
              <p className="text-xs text-red-500">{errors.commissionRate}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Effective date *</Label>
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => set("effectiveDate", e.target.value)}
              />
              {errors.effectiveDate && (
                <p className="text-xs text-red-500">{errors.effectiveDate}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Expiry date (leave empty = no expiry)</Label>
              <Input
                type="date"
                value={form.expiryDate ?? ""}
                onChange={(e) => set("expiryDate", e.target.value || null)}
              />
              {errors.expiryDate && (
                <p className="text-xs text-red-500">{errors.expiryDate}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
