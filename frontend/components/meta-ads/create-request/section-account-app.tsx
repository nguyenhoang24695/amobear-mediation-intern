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
          className={cn("h-9 w-full justify-between bg-white px-3 text-left font-normal", className)}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {selectedOption ? renderValue(selectedOption) : <span className="text-slate-500">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[320px] p-0" align="start">
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
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
    )
  }

  return ok ? (
    <div className="flex items-center gap-2 text-xs text-green-700">
      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
      <span>{label}</span>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-xs text-red-600">
      <XCircle className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  )
}

function TokenStatusBadge({ state }: { state: TokenState }) {
  if (state === "none") return null
  const configs = {
    ready: { icon: ShieldCheck, label: "Token Ready", cls: "bg-green-50 border-green-200 text-green-800" },
    not_tested: { icon: AlertTriangle, label: "Not Tested", cls: "bg-amber-50 border-amber-200 text-amber-800" },
    expired: { icon: ShieldAlert, label: "Token Expired", cls: "bg-red-50 border-red-200 text-red-800" },
    missing_permissions: { icon: ShieldAlert, label: "Missing Permissions", cls: "bg-red-50 border-red-200 text-red-800" },
    invalid: { icon: ShieldAlert, label: "Invalid Connection", cls: "bg-red-50 border-red-200 text-red-800" },
    disabled: { icon: ShieldOff, label: "Integration Disabled", cls: "bg-slate-100 border-slate-200 text-slate-600" },
  }
  const { icon: Icon, label, cls } = configs[state]
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-medium ${cls}`}>
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
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-500" />
          Account &amp; App Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Meta Integration <span className="text-red-500">*</span>
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
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-slate-900">{integration.displayName}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-slate-200 text-slate-600">
                      {integration.authMode === "system_user_token" ? "System User" : "User Token"}
                    </Badge>
                  </span>
                )}
                renderOption={(integration) => (
                  <div className="flex items-center gap-3 py-0.5">
                    <Badge className={integration.authMode === "system_user_token" ? "bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0" : "bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0"}>
                      {integration.authMode === "system_user_token" ? "System User" : "User Token"}
                    </Badge>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{integration.displayName}</div>
                      <div className="truncate text-xs text-slate-400">{integration.metaBusinessName ?? integration.metaBusinessId ?? integration.tokenStatus}</div>
                    </div>
                  </div>
                )}
              />
              {!canChangeExecutionIntegration ? (
                <p className="text-[11px] text-slate-500">Execution integration is locked after the request leaves draft.</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">
                Meta Ad Account <span className="text-red-500">*</span>
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
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-slate-900">{account.name}</span>
                    <span className="truncate font-mono text-xs text-slate-500">{account.metaAdAccountId}</span>
                  </span>
                )}
                renderOption={(account) => (
                  <div className="flex items-center gap-3 py-0.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">{account.metaAdAccountId}</span>
                        <Badge className={account.isActive ? "bg-green-100 text-green-700 text-[10px] px-1.5 py-0" : "bg-red-100 text-red-600 text-[10px] px-1.5 py-0"}>
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="truncate text-sm font-medium text-slate-900">
                        {account.name} - {account.currency ?? "-"} - {account.timeZoneName ?? "-"}
                      </div>
                    </div>
                  </div>
                )}
              />
              {!canChangeAdAccount ? (
                <p className="text-[11px] text-slate-500">Ad account is locked while this draft reuses an existing Meta creative.</p>
              ) : null}
            </div>

            {form.adAccountId ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">
                    Integration Status{selectedIntegration?.displayName ? ` - ${selectedIntegration.displayName}` : integrationName ? ` - ${integrationName}` : ""}
                  </span>
                  <TokenStatusBadge state={tokenState} />
                </div>
                {isTokenBlocking ? (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">
                      {tokenState === "expired" && "The selected integration token is missing or expired. Update the access token and test the integration again before submitting."}
                      {tokenState === "missing_permissions" && "The selected integration is missing required permissions (ads_management, ads_read)."}
                      {tokenState === "invalid" && "The selected integration failed its last connection test. Review the access token, app credentials, and business permissions."}
                      {tokenState === "disabled" && "The selected integration or ad account is disabled. Re-enable it from Meta Ads setup screens."}{" "}
                      <strong>Submit for Approval is blocked until resolved.</strong>
                    </p>
                  </div>
                ) : tokenState === "not_tested" ? (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      This integration has not been tested recently. Request execution may still work, but operators should validate the Meta connection from the integration screen.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              App <span className="text-red-500">*</span>
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
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{mapping.appDisplayName ?? mapping.appId ?? mapping.packageName ?? mapping.normalizedStoreIdentifier ?? `Store ${mapping.id}`}</span>
                  <span className="truncate font-mono text-xs text-slate-500">{mapping.appId ?? mapping.normalizedStoreIdentifier ?? `store:${mapping.id}`}</span>
                </span>
              )}
              renderOption={(mapping) => (
                <div className="flex items-center gap-2 py-0.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${resolveMetaAppMappingPlatform(mapping) === "IOS" ? "border-blue-200 text-blue-700" : "border-green-200 text-green-700"}`}
                  >
                    {resolveMetaAppMappingPlatform(mapping) ?? "APP"}
                  </Badge>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{mapping.appDisplayName ?? mapping.appId ?? `Store ${mapping.id}`}</span>
                      {(!mapping.metaApplicationId || !(mapping.objectStoreUrl || mapping.storeUrlOverride)) ? (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Missing Mapping</Badge>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-slate-400 font-mono">{mapping.appId ?? mapping.normalizedStoreIdentifier ?? `binding:${mapping.id}`}</div>
                  </div>
                </div>
              )}
            />

            {!form.adAccountId ? (
              <p className="text-[11px] text-slate-500">Select a Meta ad account first. The app list is filtered by the account&apos;s advertisable applications.</p>
            ) : appMappingsLoading ? (
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading apps available for this ad account...
              </div>
            ) : appMappingsMessage ? (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-red-700">{appMappingsMessage}</p>
              </div>
            ) : appMappings.length === 0 ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-800">No active app mappings are currently advertisable for the selected Meta ad account.</p>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Showing {appMappings.length} mapped app{appMappings.length === 1 ? "" : "s"} that this Meta ad account can advertise.</p>
            )}
          </div>
        </div>

        {selectedAppMapping ? (
          <div className={`rounded-lg border p-3 space-y-2 ${hasMappingIssue ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Promoted Object</p>
              {hasMappingIssue ? (
                <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Missing Meta App Mapping
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Valid
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-500">Application ID</span>
              <span className={`font-mono ${selectedAppMapping.metaApplicationId ? "text-slate-900" : "text-amber-700 italic"}`}>
                {selectedAppMapping.metaApplicationId || "Not configured"}
              </span>
              <span className="text-slate-500">Platform</span>
              <span className="text-slate-900">{selectedAppPlatform ?? "-"}</span>
              <span className="text-slate-500">Store URL</span>
              <span className={`truncate ${mappingUrl ? "text-slate-900" : "text-amber-700 italic"}`}>
                {mappingUrl || "Not configured"}
              </span>
            </div>
            {hasMappingIssue ? (
              <p className="text-[11px] text-amber-800">
                App campaigns require a valid <code className="bg-amber-100 px-1 rounded">promoted_object</code> with application_id + store URL.
                Configure the mapping in <strong>Meta Ads &gt; App Mappings</strong>.
              </p>
            ) : null}
            {selectedAppPlatform ? (
              <p className="text-[11px] text-slate-600">
                {selectedAppPlatform === "ANDROID" ? "Android" : "iOS"} targeting will be derived automatically for app promotion ad sets.
              </p>
            ) : null}
          </div>
        ) : null}

        {selectedAppMapping ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="deferredDeepLinkUrl" className="text-xs font-medium text-slate-700">
                Deferred deep link
              </Label>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-500 font-normal">
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
            <p className="text-[11px] text-slate-500 leading-normal">
              Use Android App Link, custom URL scheme, or Facebook App Link. Requires app deep linking setup.
            </p>
          </div>
        ) : null}

        {selectedAppMapping ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="customStoreListingId" className="text-xs font-medium text-slate-700">
                Custom store listing
              </Label>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200 text-slate-500 font-normal">
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
              <p className="text-[11px] text-slate-500 leading-normal">
                For Google Play custom store listings. The ID is appended to the Play Store URL as <code className="text-slate-800 bg-slate-100 px-0.5 rounded font-mono">listing=...</code>.
              </p>
            ) : selectedAppPlatform === "IOS" ? (
              <p className="text-[11px] text-amber-600 leading-normal">
                Custom store listing is only supported for Google Play apps (Android).
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">App Mapping</p>
            <StatusRow
              ok={form.paidMediaAppBindingId ? (selectedAppMapping?.metaApplicationId ? true : false) : null}
              label={!form.paidMediaAppBindingId ? "Select an app" : selectedAppMapping?.metaApplicationId ? "Meta App ID set" : "Meta App ID missing"}
            />
            <StatusRow
              ok={form.paidMediaAppBindingId ? (!!mappingUrl) : null}
              label={!form.paidMediaAppBindingId ? "Store URL" : mappingUrl ? "Store URL set" : "Store URL missing"}
            />
          </div>
          <div className="bg-slate-50 rounded-md border border-slate-200 p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Integration</p>
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
          <Label className="text-xs font-medium text-slate-700">Business Objective</Label>
          <div className="flex flex-wrap gap-2">
            {objectives.map((objective) => (
              <button
                key={objective.key}
                type="button"
                onClick={() => onChange({
                  objective: form.objective === objective.key ? "" : objective.key,
                  campaignObjective: form.campaignObjective === objective.key ? "" : objective.key,
                })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  form.campaignObjective === objective.key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
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
