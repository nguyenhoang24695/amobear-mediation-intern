"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface App {
  id: string
  name: string
  icon?: string
  platform?: string
}

interface AppPermissionsSelectorProps {
  apps: App[]
  giveAllApps: boolean
  onGiveAllAppsChange: (checked: boolean) => void
  selectedApps: Array<{ id: string; permission: string }>
  onToggleApp: (appId: string) => void
  onUpdateAppPermission: (appId: string, permission: string) => void
  onRemoveApp?: (appId: string) => void
  label?: string
  showOwnerPermission?: boolean
  mode?: "popover" | "list"
  error?: string | null
  hideGiveAllApps?: boolean
}

export function AppPermissionsSelector({
  apps,
  giveAllApps,
  onGiveAllAppsChange,
  selectedApps,
  onToggleApp,
  onUpdateAppPermission,
  onRemoveApp,
  label = "App Permissions",
  showOwnerPermission = false,
  mode = "list",
  error,
  hideGiveAllApps = false,
}: AppPermissionsSelectorProps) {
  const [appsOpen, setAppsOpen] = useState(false)

  const permissionLevels = showOwnerPermission
    ? ["view", "edit", "manage", "owner"]
    : ["view", "edit", "manage"]

  // Convert selectedApps array to object for easier lookup (for list mode)
  const selectedAppsMap = selectedApps.reduce(
    (acc, app) => {
      acc[app.id] = app.permission
      return acc
    },
    {} as Record<string, string>
  )

  return (
    <div className="space-y-3 border-t pt-3">
      <Label className="text-slate-500 text-xs uppercase tracking-wide">{label}</Label>

      {mode === "popover" ? (
        <div className="space-y-3">
          {!hideGiveAllApps && (
            <div className="flex items-center justify-between">
              <Label>Grant access to specific apps</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all-apps-popover"
                  checked={giveAllApps}
                  onChange={(e) => onGiveAllAppsChange(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="all-apps-popover" className="text-sm text-slate-600 cursor-pointer">
                  Give access to all apps
                </label>
              </div>
            </div>
          )}

          {!giveAllApps && (
            <>
              <Popover open={appsOpen} onOpenChange={setAppsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal bg-transparent"
                  >
                    Select apps... ({apps.length} {apps.length === 1 ? "app" : "apps"})
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search apps..." />
                    <CommandList>
                      <CommandEmpty>No app found.</CommandEmpty>
                      <CommandGroup>
                        {apps.map((app) => {
                          const isSelected = selectedApps.find((a) => a.id === app.id)
                          return (
                            <CommandItem key={app.id} onSelect={() => onToggleApp(app.id)}>
                              <Check
                                className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                              />
                              {app.icon ? (
                                <Avatar className="mr-2 h-5 w-5">
                                  <AvatarImage src={app.icon} alt={app.name} />
                                  <AvatarFallback className="text-xs">
                                    {app.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="mr-2 h-5 w-5 rounded bg-slate-200 flex items-center justify-center">
                                  <span className="text-xs text-slate-500">
                                    {app.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span>{app.name}</span>
                                {app.platform && (
                                  <span className="text-xs text-slate-500">({app.platform})</span>
                                )}
                              </div>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Apps List */}
              {selectedApps.length > 0 && (
                <div className="space-y-2">
                  {selectedApps.map((selected) => {
                    const app = apps.find((a) => a.id === selected.id)
                    return (
                      <div
                        key={selected.id}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {app?.icon ? (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={app.icon} alt={app.name} />
                              <AvatarFallback className="text-xs">
                                {app.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center">
                              <span className="text-xs text-slate-500">
                                {app?.name?.charAt(0).toUpperCase() || "?"}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{app?.name}</span>
                            {app?.platform && (
                              <span className="text-xs text-slate-500">({app.platform})</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selected.permission}
                            onValueChange={(v) => onUpdateAppPermission(selected.id, v)}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {permissionLevels.map((level) => (
                                <SelectItem key={level} value={level}>
                                  {level.charAt(0).toUpperCase() + level.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {onRemoveApp && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onRemoveApp(selected.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // List mode
        <div className="space-y-3">
          {!hideGiveAllApps && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-apps-list"
                checked={giveAllApps}
                onCheckedChange={(checked: boolean) => onGiveAllAppsChange(checked)}
              />
              <Label htmlFor="all-apps-list" className="text-sm text-slate-600 cursor-pointer">
                Give access to all apps (no direct app overrides)
              </Label>
            </div>
          )}

          {!giveAllApps && (
            <div className="space-y-2">
              {apps.map((app) => {
                const selected = selectedAppsMap[app.id] !== undefined
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-2 rounded-md border bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      {app.icon ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={app.icon} alt={app.name} />
                          <AvatarFallback className="text-xs">
                            {app.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center">
                          <span className="text-xs text-slate-500">
                            {app.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">{app.name}</span>
                        {app.platform && (
                          <span className="text-xs text-slate-500">({app.platform})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selected} onCheckedChange={() => onToggleApp(app.id)} />
                      {selected && (
                        <Select
                          value={selectedAppsMap[app.id]}
                          onValueChange={(v) => onUpdateAppPermission(app.id, v)}
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {permissionLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

