"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AppPermissionLevel,
  APP_PERMISSION_LEVELS,
  APP_PERMISSION_LEVELS_WITH_OWNER,
  getPermissionLevelLabel,
} from "@/lib/enums/app-permission-level";

function appMatchesSearchQuery(app: App, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (app.name || "").toLowerCase();
  const id = (app.id || "").toLowerCase();
  const storeId = (app.appStoreId || "").toLowerCase();
  return name.includes(q) || id.includes(q) || storeId.includes(q);
}

export interface App {
  id: string;
  name: string;
  icon?: string;
  platform?: string;
  /** Play / App Store id — included in search. */
  appStoreId?: string;
  approvalState?: string | null;
}

function getApprovalStateBadgeClass(state: string | null | undefined): string {
  switch ((state ?? "").toUpperCase()) {
    case "APPROVED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "IN_REVIEW":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700";
    case "ACTION_REQUIRED":
      return "border-orange-500/20 bg-orange-500/10 text-orange-700";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

function formatApprovalStateLabel(state: string | null | undefined): string {
  switch ((state ?? "").toUpperCase()) {
    case "APPROVED":
      return "Approved";
    case "IN_REVIEW":
      return "In review";
    case "ACTION_REQUIRED":
      return "Action required";
    default:
      return state?.trim() || "Unknown";
  }
}

interface AppPermissionsSelectorProps {
  /** Danh sách app hiển thị trong dropdown chọn (có thể đã lọc theo type/platform). */
  apps: App[];
  /** Danh sách đầy đủ để resolve tên/icon cho app đã chọn; nếu không truyền thì dùng apps. */
  allAppsForDisplay?: App[];
  giveAllApps: boolean;
  onGiveAllAppsChange: (checked: boolean) => void;
  selectedApps: Array<{ id: string; permission: string }>;
  onToggleApp: (appId: string) => void;
  onUpdateAppPermission: (appId: string, permission: string) => void;
  onRemoveApp?: (appId: string) => void;
  label?: string;
  showOwnerPermission?: boolean;
  mode?: "popover" | "list";
  error?: string | null;
  hideGiveAllApps?: boolean;
}

export function AppPermissionsSelector({
  apps,
  allAppsForDisplay,
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
  const [appsOpen, setAppsOpen] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  /** Dùng để hiển thị tên/icon app đã chọn; không bị ảnh hưởng bởi filter. */
  const appsForSelectedList = allAppsForDisplay ?? apps;

  const appsMatchingSearch = useMemo(
    () => apps.filter((app) => appMatchesSearchQuery(app, appSearchQuery)),
    [apps, appSearchQuery],
  );

  const permissionLevels = showOwnerPermission
    ? APP_PERMISSION_LEVELS_WITH_OWNER
    : APP_PERMISSION_LEVELS;

  // Convert selectedApps array to object for easier lookup (for list mode)
  const selectedAppsMap = selectedApps.reduce(
    (acc, app) => {
      acc[app.id] = app.permission;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <div className="space-y-3 border-t pt-3">
      <Label className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </Label>

      {mode === "popover" ? (
        <div className="space-y-3">
          {!hideGiveAllApps && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Grant access to specific apps</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="checkbox"
                  id="all-apps-popover"
                  checked={giveAllApps}
                  onChange={(e) => onGiveAllAppsChange(e.target.checked)}
                  className="rounded border-input"
                />
                <label
                  htmlFor="all-apps-popover"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Give access to all apps
                </label>
              </div>
            </div>
          )}

          {!giveAllApps && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Popover
                  open={appsOpen}
                  onOpenChange={(open) => {
                    setAppsOpen(open);
                    if (!open) setAppSearchQuery("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal bg-transparent min-w-0 sm:flex-1"
                    >
                      Select apps... ({apps.length}{" "}
                      {apps.length === 1 ? "app" : "apps"})
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0 sm:w-full sm:max-w-none"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by name, app ID, or store ID..."
                        value={appSearchQuery}
                        onValueChange={setAppSearchQuery}
                      />
                      <CommandList>
                        {appsMatchingSearch.length === 0 ? (
                          <CommandEmpty>No app found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {appsMatchingSearch.map((app) => {
                              const isSelected = selectedApps.find(
                                (a) => a.id === app.id,
                              );
                              return (
                                <CommandItem
                                  key={app.id}
                                  value={app.id}
                                  onSelect={() => onToggleApp(app.id)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      isSelected ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {app.icon ? (
                                    <Avatar className="mr-2 h-5 w-5">
                                      <AvatarImage
                                        src={app.icon}
                                        alt={app.name}
                                      />
                                      <AvatarFallback className="text-xs">
                                        {app.name.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <div className="mr-2 h-5 w-5 rounded bg-muted flex items-center justify-center">
                                      <span className="text-xs text-muted-foreground">
                                        {app.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {app.name}
                                      </span>
                                      {app.platform && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] uppercase font-semibold! h-[18px] px-1 py-0 leading-none text-muted-foreground"
                                        >
                                          {app.platform}
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                      {app.id}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => {
                    appsMatchingSearch.forEach((app) => {
                      if (!selectedApps.some((s) => s.id === app.id))
                        onToggleApp(app.id);
                    });
                  }}
                  disabled={
                    appsMatchingSearch.length === 0 ||
                    appsMatchingSearch.every((app) =>
                      selectedApps.some((s) => s.id === app.id),
                    )
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => {
                    selectedApps.forEach((s) => onRemoveApp?.(s.id));
                  }}
                  disabled={selectedApps.length === 0 || !onRemoveApp}
                >
                  Clear all
                </Button>
              </div>

              {/* Selected Apps List (scrollable only for details) - luôn dùng allAppsForDisplay để không mất tên/icon khi đổi filter */}
              {selectedApps.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground text-right">
                    You are selecting {selectedApps.length}{" "}
                    {selectedApps.length === 1 ? "app" : "apps"}!
                  </p>
                  <div className="space-y-2 pr-1 sm:max-h-64 sm:overflow-y-auto">
                    {selectedApps.map((selected) => {
                      const app = appsForSelectedList.find(
                        (a) => a.id === selected.id,
                      );
                      return (
                        <div
                          key={selected.id}
                          className="flex flex-col gap-3 rounded-md bg-muted/50 p-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {app?.icon ? (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={app.icon} alt={app.name} />
                                <AvatarFallback className="text-xs">
                                  {app.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  {app?.name?.charAt(0).toUpperCase() || "?"}
                                </span>
                              </div>
                            )}
                            <div className="flex min-w-0 flex-col">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <span className="min-w-0 break-words text-sm font-medium">
                                  {app?.name}
                                </span>
                                {app?.platform && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase font-semibold! h-[18px] px-1 py-0 leading-none text-muted-foreground"
                                  >
                                    {app.platform}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-semibold! h-[18px] px-1 py-0 leading-none",
                                    getApprovalStateBadgeClass(
                                      app?.approvalState,
                                    ),
                                  )}
                                >
                                  {formatApprovalStateLabel(app?.approvalState)}
                                </Badge>
                              </div>
                              <span className="break-all text-[11px] font-mono text-muted-foreground">
                                {app?.id}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Select
                              value={selected.permission}
                              onValueChange={(v) =>
                                onUpdateAppPermission(selected.id, v)
                              }
                            >
                              <SelectTrigger className="h-8 w-28 sm:w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {permissionLevels.map((level) => (
                                  <SelectItem key={level} value={level}>
                                    {getPermissionLevelLabel(level)}
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
                      );
                    })}
                  </div>
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
                onCheckedChange={(checked: boolean) =>
                  onGiveAllAppsChange(checked)
                }
              />
              <Label
                htmlFor="all-apps-list"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Give access to all apps (no direct app overrides)
              </Label>
            </div>
          )}

          {!giveAllApps && (
            <div className="space-y-2">
              {apps.map((app) => {
                const selected = selectedAppsMap[app.id] !== undefined;
                return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 p-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                      {app.icon ? (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={app.icon} alt={app.name} />
                          <AvatarFallback className="text-xs">
                            {app.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {app.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                        <div className="flex min-w-0 flex-col">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 break-words text-sm font-medium text-foreground">
                              {app.name}
                            </span>
                          {app.platform && (
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase font-semibold! h-[18px] px-1 py-0 leading-none text-muted-foreground"
                            >
                              {app.platform}
                            </Badge>
                          )}
                        </div>
                          <span className="break-all text-[11px] font-mono text-muted-foreground">
                            {app.id}
                          </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleApp(app.id)}
                      />
                      {selected && (
                        <Select
                          value={selectedAppsMap[app.id]}
                          onValueChange={(v) =>
                            onUpdateAppPermission(app.id, v)
                          }
                        >
                          <SelectTrigger className="w-24 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {permissionLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {getPermissionLevelLabel(level)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
