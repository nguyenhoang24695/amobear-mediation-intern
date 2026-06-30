"use client"

import { useState, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, AlertCircle, Building2, AlertTriangle, ShieldAlert, ShieldOff, ShieldCheck, Loader2, Check, ChevronsUpDown } from "lucide-react"
import type { RequestFormState } from "./create-request-content"
import { resolveMetaAppMappingPlatform } from "./platform"
import type { MetaAdAccountDto, MetaAppMappingDto, MetaIntegrationDto, MetaObjectivePresetDto } from "@/types/meta-ads"

type TokenState = "none" | "ready" | "not_tested" | "expired" | "missing_permissions" | "invalid" | "disabled"

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
  tokenState: TokenState
  integrations: MetaIntegrationDto[]
  adAccounts: MetaAdAccountDto[]
  appMappings: MetaAppMappingDto[]
  selectedAppMapping?: MetaAppMappingDto | null
  appMappingsLoading?: boolean
  appMappingsMessage?: string | null
  objectives: MetaObjectivePresetDto[]
  integrationName?: string | null
  canChangeExecutionIntegration?: boolean
  canChangeAdAccount?: boolean
}

interface SearchableSelectProps<T> {
  value: string
  options: T[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  disabled?: boolean
  className?: string
  onValueChange: (value: string) => void
  getValue: (option: T) => string
  getSearchText: (option: T) => string
  renderOption: (option: T) => ReactNode
  renderValue: (option: T) => ReactNode
}

function SearchableSelect<T>({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  className,
  onValueChange,
  getValue,
  getSearchText,
  renderOption,
  renderValue,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => getValue(option) === value)

  return (
    <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("min-h-9 h-auto w-full items-start justify-between bg-background px-3 py-2 text-left font-normal", className)}
        >
          <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-tight">
            {selectedOption ? renderValue(selectedOption) : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] min-w-0 p-0 sm:min-w-[320px]" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const optionValue = getValue(option)
                const isSelected = optionValue === value
                return (
                  <CommandItem
                    key={optionValue}
                    value={getSearchText(option)}
                    onSelect={() => {
                      onValueChange(optionValue)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                    <span className="min-w-0 flex-1">{renderOption(option)}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function StatusRow({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
    )
  }

  return ok ? (
    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      <span>{label}</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-xs text-destructive">
      <XCircle className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  )
}

function TokenStatusBadge({ state }: { state: TokenState }) {
  if (state === "none") return null
  const configs = {
    ready: { icon: ShieldCheck, label: "Token Ready", cls: "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400" },
    not_tested: { icon: AlertTriangle, label: "Not Tested", cls: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300" },
    expired: { icon: ShieldAlert, label: "Token Expired", cls: "border-destructive/25 bg-destructive/10 text-destructive" },
    missing_permissions: { icon: ShieldAlert, label: "Missing Permissions", cls: "border-destructive/25 bg-destructive/10 text-destructive" },
    invalid: { icon: ShieldAlert, label: "Invalid Connection", cls: "border-destructive/25 bg-destructive/10 text-destructive" },
    disabled: { icon: ShieldOff, label: "Integration Disabled", cls: "border-border bg-muted text-muted-foreground" },
  }
  const { icon: Icon, label, cls } = configs[state]
  return (
    <div className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  )
}

export function AccountAppSection({
  form,
  onChange,
  tokenState,
  integrations,
  adAccounts,
  appMappings,
  selectedAppMapping,
  appMappingsLoading = false,
  appMappingsMessage,
  objectives,
  integrationName,
  canChangeExecutionIntegration = true,
  canChangeAdAccount = true,
}: Props) {
  const mappingUrl = selectedAppMapping?.objectStoreUrl || selectedAppMapping?.storeUrlOverride || ""
  const selectedAppPlatform = resolveMetaAppMappingPlatform(selectedAppMapping)
  const hasMappingIssue = !selectedAppMapping?.metaApplicationId || !mappingUrl
  const isTokenBlocking = tokenState === "expired" || tokenState === "missing_permissions" || tokenState === "invalid" || tokenState === "disabled"
  const appSelectDisabled = !form.adAccountId || appMappingsLoading
  const selectedIntegration = integrations.find((integration) => integration.id.toString() === form.executionIntegrationId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 break-words text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Account &amp; App Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Meta Integration <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                value={form.executionIntegrationId}
                options={integrations}
                placeholder="Select integration..."
                searchPlaceholder="Search by integration name, auth mode..."
                emptyMessage="No integrations found."
                disabled={!canChangeExecutionIntegration}
                onValueChange={(value) => onChange({ executionIntegrationId: value })}
                getValue={(integration) => integration.id.toString()}
                getSearchText={(integration) => `${integration.displayName} ${integration.authMode} ${integration.metaBusinessName ?? ""}`}
                renderValue={(integration) => (
                  <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className="break-words font-medium text-foreground">{integration.displayName}</span>
                    <Badge variant="outline" className="w-fit shrink-0 border-border px-1.5 py-0 text-[10px] text-muted-foreground">
                      {integration.authMode === "system_user_token" ? "System User" : "User Token"}
                    </Badge>
                  </span>
                )}
                renderOption={(integration) => (
                  <div className="flex min-w-0 flex-col gap-1 py-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <Badge className={integration.authMode === "system_user_token" ? "w-fit bg-primary/10 px-1.5 py-0 text-[10px] text-primary" : "w-fit bg-violet-500/10 px-1.5 py-0 text-[10px] text-violet-700 dark:text-violet-300"}>
                      {integration.authMode === "system_user_token" ? "System User" : "User Token"}
                    </Badge>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{integration.displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">{integration.metaBusinessName ?? integration.metaBusinessId ?? integration.tokenStatus}</div>
                    </div>
                  </div>
                )}
              />
              {!canChangeExecutionIntegration ? (
                <p className="break-words text-[11px] text-muted-foreground">Execution integration is locked after the request leaves draft.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Meta Ad Account <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                value={form.adAccountId}
                options={adAccounts}
                placeholder={form.executionIntegrationId ? "Select ad account..." : "Select integration first..."}
                searchPlaceholder="Search by ad account ID, name, currency, timezone..."
                emptyMessage="No ad accounts found for this integration."
                disabled={!form.executionIntegrationId || !canChangeAdAccount}
                onValueChange={(value) => onChange({ adAccountId: value, appRowId: "" })}
                getValue={(account) => account.id.toString()}
                getSearchText={(account) => `${account.metaAdAccountId} ${account.name} ${account.currency ?? ""} ${account.timeZoneName ?? ""}`}
                renderValue={(account) => (
                  <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className="break-words font-medium text-foreground">{account.name}</span>
                    <span className="break-all font-mono text-xs text-muted-foreground">{account.metaAdAccountId}</span>
                  </span>
                )}
                renderOption={(account) => (
                  <div className="flex items-center gap-3 py-0.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{account.metaAdAccountId}</span>
                        <Badge className={account.isActive ? "bg-green-500/10 px-1.5 py-0 text-[10px] text-green-700 dark:text-green-400" : "bg-destructive/10 px-1.5 py-0 text-[10px] text-destructive"}>
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="truncate text-sm font-medium text-foreground">
                        {account.name} - {account.currency ?? "-"} - {account.timeZoneName ?? "-"}
                      </div>
                    </div>
                  </div>
                )}
              />
              {!canChangeAdAccount ? (
                <p className="break-words text-[11px] text-muted-foreground">Ad account is locked while this draft reuses an existing Meta creative.</p>
              ) : null}
            </div>

            {form.adAccountId ? (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Integration Status{selectedIntegration?.displayName ? ` - ${selectedIntegration.displayName}` : integrationName ? ` - ${integrationName}` : ""}
                  </span>
                  <TokenStatusBadge state={tokenState} />
                </div>
                {isTokenBlocking ? (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                    <p className="text-xs text-destructive">
                      {tokenState === "expired" && "The selected integration token is missing or expired. Update the access token and test the integration again before submitting."}
                      {tokenState === "missing_permissions" && "The selected integration is missing required permissions (ads_management, ads_read)."}
                      {tokenState === "invalid" && "The selected integration failed its last connection test. Review the access token, app credentials, and business permissions."}
                      {tokenState === "disabled" && "The selected integration or ad account is disabled. Re-enable it from Meta Ads setup screens."}{" "}
                      <strong>Submit for Approval is blocked until resolved.</strong>
                    </p>
                  </div>
                ) : tokenState === "not_tested" ? (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      This integration has not been tested recently. Request execution may still work, but operators should validate the Meta connection from the integration screen.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              App <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              value={form.paidMediaAppBindingId}
              options={appMappings}
              placeholder={form.adAccountId ? (appMappingsLoading ? "Loading apps for this ad account..." : "Select app...") : "Select ad account first..."}
              searchPlaceholder="Search by app name, app ID, platform..."
              emptyMessage="No apps found."
              disabled={appSelectDisabled}
              onValueChange={(value) => {
                const mapping = appMappings.find((item) => item.id.toString() === value)
                onChange({ paidMediaAppBindingId: value, appRowId: mapping?.appRowId?.toString() ?? "" })
              }}
              getValue={(mapping) => mapping.id.toString()}
              getSearchText={(mapping) => `${mapping.appDisplayName ?? ""} ${mapping.appId ?? ""} ${mapping.platform ?? ""} ${mapping.metaApplicationId ?? ""}`}
              renderValue={(mapping) => (
                <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                  <span className="break-words font-medium text-foreground">{mapping.appDisplayName ?? mapping.appId ?? mapping.packageName ?? mapping.normalizedStoreIdentifier ?? `Store ${mapping.id}`}</span>
                  <span className="break-all font-mono text-xs text-muted-foreground">{mapping.appId ?? mapping.normalizedStoreIdentifier ?? `store:${mapping.id}`}</span>
                </span>
              )}
              renderOption={(mapping) => (
                <div className="flex items-center gap-2 py-0.5">
                  <Badge
                    variant="outline"
                    className={`px-1.5 py-0 text-[10px] ${resolveMetaAppMappingPlatform(mapping) === "IOS" ? "border-primary/30 text-primary" : "border-green-500/30 text-green-700 dark:text-green-400"}`}
                  >
                    {resolveMetaAppMappingPlatform(mapping) ?? "APP"}
                  </Badge>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{mapping.appDisplayName ?? mapping.appId ?? `Store ${mapping.id}`}</span>
                      {(!mapping.metaApplicationId || !(mapping.objectStoreUrl || mapping.storeUrlOverride)) ? (
                        <Badge className="bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-300">Missing Mapping</Badge>
                      ) : null}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{mapping.appId ?? mapping.normalizedStoreIdentifier ?? `binding:${mapping.id}`}</div>
                  </div>
                </div>
              )}
            />

            {!form.adAccountId ? (
              <p className="text-[11px] text-muted-foreground">Select a Meta ad account first. The app list is filtered by the account&apos;s advertisable applications.</p>
            ) : appMappingsLoading ? (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading apps available for this ad account...
              </div>
            ) : appMappingsMessage ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                <p className="break-words text-[11px] text-destructive">{appMappingsMessage}</p>
              </div>
            ) : appMappings.length === 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="break-words text-[11px] text-amber-800 dark:text-amber-200">No active app mappings are currently advertisable for the selected Meta ad account.</p>
              </div>
            ) : (
              <p className="break-words text-[11px] text-muted-foreground">Showing {appMappings.length} mapped app{appMappings.length === 1 ? "" : "s"} that this Meta ad account can advertise.</p>
            )}
          </div>
        </div>

        {selectedAppMapping ? (
          <div className={`min-w-0 space-y-2 rounded-lg border p-3 ${hasMappingIssue ? "border-amber-500/25 bg-amber-500/10" : "border-border bg-muted/40"}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Promoted Object</p>
              {hasMappingIssue ? (
                <Badge className="gap-1 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Missing Meta App Mapping
                </Badge>
              ) : (
                <Badge className="gap-1 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Valid
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
              <span className="text-muted-foreground">Application ID</span>
              <span className={`font-mono ${selectedAppMapping.metaApplicationId ? "text-foreground" : "text-amber-700 italic dark:text-amber-300"}`}>
                {selectedAppMapping.metaApplicationId || "Not configured"}
              </span>
              <span className="text-muted-foreground">Platform</span>
              <span className="text-foreground">{selectedAppPlatform ?? "-"}</span>
              <span className="text-muted-foreground">Store URL</span>
              <span className={`truncate ${mappingUrl ? "text-foreground" : "text-amber-700 italic dark:text-amber-300"}`}>
                {mappingUrl || "Not configured"}
              </span>
            </div>
            {hasMappingIssue ? (
              <p className="text-[11px] text-amber-800 dark:text-amber-200">
                App campaigns require a valid <code className="rounded bg-amber-500/10 px-1">promoted_object</code> with application_id + store URL.
                Configure the mapping in <strong>Meta Ads &gt; App Mappings</strong>.
              </p>
            ) : null}
            {selectedAppPlatform ? (
              <p className="text-[11px] text-muted-foreground">
                {selectedAppPlatform === "ANDROID" ? "Android" : "iOS"} targeting will be derived automatically for app promotion ad sets.
              </p>
            ) : null}
          </div>
        ) : null}

        {selectedAppMapping ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="deferredDeepLinkUrl" className="text-xs font-medium text-foreground">
                Deferred deep link
              </Label>
              <Badge variant="outline" className="border-border px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                Optional
              </Badge>
            </div>
            <Input
              id="deferredDeepLinkUrl"
              type="text"
              value={form.deferredDeepLinkUrl ?? ""}
              onChange={(e) => onChange({ deferredDeepLinkUrl: e.target.value })}
              placeholder="Enter the deferred deep link URL"
            />
            <p className="text-[11px] leading-normal text-muted-foreground">
              Use Android App Link, custom URL scheme, or Facebook App Link. Requires app deep linking setup.
            </p>
          </div>
        ) : null}

        {selectedAppMapping ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="customStoreListingId" className="text-xs font-medium text-foreground">
                Custom store listing
              </Label>
              <Badge variant="outline" className="border-border px-1.5 py-0 text-[10px] font-normal text-muted-foreground">
                Optional
              </Badge>
            </div>
            <Input
              id="customStoreListingId"
              type="text"
              value={form.customStoreListingId ?? ""}
              onChange={(e) => onChange({ customStoreListingId: e.target.value })}
              placeholder={selectedAppPlatform === "ANDROID" ? "Enter custom store listing ID" : "Custom store listing is only supported for Google Play apps."}
              disabled={selectedAppPlatform !== "ANDROID"}
            />
            {selectedAppPlatform === "ANDROID" ? (
              <p className="text-[11px] leading-normal text-muted-foreground">
                For Google Play custom store listings. The ID is appended to the Play Store URL as <code className="rounded bg-muted px-0.5 font-mono text-foreground">listing=...</code>.
              </p>
            ) : selectedAppPlatform === "IOS" ? (
              <p className="text-[11px] leading-normal text-amber-700 dark:text-amber-300">
                Custom store listing is only supported for Google Play apps (Android).
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
            <p className="break-words text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">App Mapping</p>
            <StatusRow
              ok={form.paidMediaAppBindingId ? (selectedAppMapping?.metaApplicationId ? true : false) : null}
              label={!form.paidMediaAppBindingId ? "Select an app" : selectedAppMapping?.metaApplicationId ? "Meta App ID set" : "Meta App ID missing"}
            />
            <StatusRow
              ok={form.paidMediaAppBindingId ? (!!mappingUrl) : null}
              label={!form.paidMediaAppBindingId ? "Store URL" : mappingUrl ? "Store URL set" : "Store URL missing"}
            />
          </div>
          <div className="min-w-0 space-y-1.5 rounded-md border border-border bg-muted/40 p-3">
            <p className="break-words text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Integration</p>
            <StatusRow
              ok={form.adAccountId ? (tokenState === "ready" ? true : tokenState === "not_tested" ? null : false) : null}
              label={!form.adAccountId ? "Select an account" : tokenState === "ready" ? "Integration enabled" : tokenState === "not_tested" ? "Integration not tested" : "Integration issue"}
            />
            <StatusRow
              ok={form.adAccountId ? (tokenState === "ready" ? true : tokenState === "not_tested" ? null : false) : null}
              label={!form.adAccountId ? "Token status" : tokenState === "ready" ? "Token ready" : tokenState === "not_tested" ? "Token not tested" : tokenState === "expired" ? "Token expired" : tokenState === "missing_permissions" ? "Missing permissions" : tokenState === "invalid" ? "Connection invalid" : "Integration disabled"}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Business Objective</Label>
          <div className="flex flex-wrap gap-2">
            {objectives.map((objective) => (
              <button
                key={objective.key}
                type="button"
                onClick={() => onChange({
                  objective: form.objective === objective.key ? "" : objective.key,
                  campaignObjective: form.campaignObjective === objective.key ? "" : objective.key,
                })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium leading-tight transition-colors ${
                  form.campaignObjective === objective.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
                title={objective.description}
              >
                {objective.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
