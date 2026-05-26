"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import type { TikTokAdAccountDto, TikTokAppMappingDto, TikTokReferenceResponseDto } from "@/types/tiktok-ads"
import { SearchableSelect } from "./searchable-select"
import { SectionShell } from "./section-shell"
import type { TikTokRequestFormState } from "./types"

interface Props {
  form: TikTokRequestFormState
  reference: TikTokReferenceResponseDto
  appMappings: TikTokAppMappingDto[]
  selectedAdAccount?: TikTokAdAccountDto
  selectedAppMapping?: TikTokAppMappingDto
  onChange: (patch: Partial<TikTokRequestFormState>) => void
}

function initials(value?: string | null) {
  return (value ?? "TK")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TK"
}

export function AccountAppSection({ form, reference, appMappings, selectedAdAccount, selectedAppMapping, onChange }: Props) {
  const ready = Boolean(selectedAdAccount?.isActive && selectedAppMapping?.isActive)

  return (
    <SectionShell
      eyebrow="Account & App Readiness"
      title="Account & App"
      description="Select the advertiser first, then choose an app known for that advertiser."
      ready={ready}
      aside={
        <div className="space-y-2 text-xs text-slate-600">
          <p>Advertiser ID: <span className="font-medium text-slate-900">{selectedAdAccount?.advertiserId ?? "-"}</span></p>
          <p>TikTok Mobile App ID: <span className="font-medium text-slate-900">{selectedAppMapping?.tikTokAppId ?? "-"}</span></p>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>TikTok ad account</Label>
          <SearchableSelect
            value={form.tikTokAdAccountRowId ? String(form.tikTokAdAccountRowId) : ""}
            options={reference.adAccounts}
            placeholder="Select ad account..."
            searchPlaceholder="Search by name, advertiser ID, currency, timezone..."
            emptyMessage="No TikTok ad accounts found."
            onValueChange={(value) => onChange({
              tikTokAdAccountRowId: Number(value),
              appRowId: null,
              paidMediaAppBindingId: null,
              adGroup: { ...form.adGroup, appId: undefined, appDownloadUrl: undefined, operatingSystems: [] },
              ad: { ...form.ad, landingPageUrl: "", displayName: "", appName: "", identityId: undefined, identityAuthorizedBcId: undefined },
              ads: form.ads.map((ad) => ({ ...ad, landingPageUrl: "", displayName: "", appName: "", identityId: undefined, identityAuthorizedBcId: undefined })),
            })}
            getValue={(account) => String(account.id)}
            getSearchText={(account) => `${account.name} ${account.advertiserId} ${account.currency ?? ""} ${account.timezone ?? ""} ${account.country ?? ""}`}
            renderValue={(account) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-slate-900">{account.name || account.advertiserId}</span>
                <span className="truncate font-mono text-xs text-slate-500">{account.advertiserId}</span>
              </span>
            )}
            renderOption={(account) => (
              <div className="min-w-0 py-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{account.advertiserId}</span>
                  <Badge className={account.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>{account.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="truncate text-sm font-medium text-slate-900">{account.name || account.advertiserId} - {account.currency ?? "N/A"} - {account.timezone ?? "N/A"}</div>
              </div>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Badge className={selectedAdAccount?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
              {selectedAdAccount?.isActive ? "Active" : "Needs account"}
            </Badge>
            {selectedAdAccount?.timezone ? <Badge variant="outline">{selectedAdAccount.timezone}</Badge> : null}
            {selectedAdAccount?.country ? <Badge variant="outline">{selectedAdAccount.country}</Badge> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>App mapping</Label>
          <SearchableSelect
            value={selectedAppMapping && form.paidMediaAppBindingId ? String(form.paidMediaAppBindingId) : ""}
            options={appMappings}
            placeholder={form.tikTokAdAccountRowId ? "Select app..." : "Select ad account first..."}
            searchPlaceholder="Search by app name, store ID, platform, TikTok mobile app ID..."
            emptyMessage="No app mappings found for this account."
            disabled={!form.tikTokAdAccountRowId}
            onValueChange={(value) => {
              const mappingId = Number(value)
              const mapping = appMappings.find((item) => item.id === mappingId)
              onChange({
                appRowId: mapping?.appRowId ?? null,
                paidMediaAppBindingId: mapping?.id ?? null,
                adGroup: {
                  ...form.adGroup,
                  appId: mapping?.tikTokAppId ?? form.adGroup.appId,
                  appDownloadUrl: mapping?.downloadUrl ?? form.adGroup.appDownloadUrl,
                  operatingSystems: (mapping?.appPlatform ?? mapping?.platform) ? [(mapping.appPlatform ?? mapping.platform)!.toUpperCase()] : form.adGroup.operatingSystems,
                },
                ad: {
                  ...form.ad,
                  landingPageUrl: mapping?.downloadUrl ?? form.ad.landingPageUrl,
                  displayName: mapping?.appDisplayName ?? form.ad.displayName,
                  appName: mapping?.appDisplayName ?? form.ad.appName,
                },
                ads: form.ads.map((ad) => ({
                  ...ad,
                  landingPageUrl: mapping?.downloadUrl ?? ad.landingPageUrl,
                  displayName: mapping?.appDisplayName ?? ad.displayName,
                  appName: mapping?.appDisplayName ?? ad.appName,
                })),
              })
            }}
            getValue={(mapping) => String(mapping.id)}
            getSearchText={(mapping) => `${mapping.appDisplayName ?? ""} ${mapping.appId ?? ""} ${mapping.packageName ?? ""} ${mapping.downloadUrl ?? ""} ${mapping.appPlatform ?? mapping.platform ?? ""} ${mapping.tikTokAppId} ${mapping.normalizedStoreIdentifier ?? ""}`}
            renderValue={(mapping) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium text-slate-900">{mapping.appDisplayName || mapping.appId || mapping.packageName || mapping.normalizedStoreIdentifier || mapping.tikTokAppId}</span>
                <span className="truncate font-mono text-xs text-slate-500">{mapping.appId ?? mapping.normalizedStoreIdentifier ?? `binding:${mapping.id}`}</span>
              </span>
            )}
            renderOption={(mapping) => (
              <div className="flex min-w-0 items-center gap-2 py-0.5">
                <Badge variant="outline" className={(mapping.appPlatform ?? mapping.platform) === "IOS" ? "border-blue-200 text-blue-700" : "border-emerald-200 text-emerald-700"}>{mapping.appPlatform ?? mapping.platform ?? "APP"}</Badge>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{mapping.appDisplayName || mapping.appId || mapping.packageName || mapping.normalizedStoreIdentifier || mapping.tikTokAppId}</div>
                  <div className="truncate font-mono text-xs text-slate-400">{mapping.packageName ?? mapping.normalizedStoreIdentifier ?? mapping.downloadUrl ?? mapping.tikTokAppId}</div>
                  <div className="truncate font-mono text-[11px] text-slate-400">Mobile App ID: {mapping.tikTokAppId}</div>
                </div>
              </div>
            )}
          />

          {form.tikTokAdAccountRowId && appMappings.length === 0 ? (
            <p className="text-xs text-amber-700">This ad account does not have the selected app configured in TikTok.</p>
          ) : form.tikTokAdAccountRowId && form.paidMediaAppBindingId && !selectedAppMapping ? (
            <p className="text-xs text-amber-700">This ad account does not have the selected app configured in TikTok.</p>
          ) : form.tikTokAdAccountRowId ? (
            <p className="text-xs text-slate-500">Showing {appMappings.length} app mapping{appMappings.length === 1 ? "" : "s"} known for this advertiser.</p>
          ) : (
            <p className="text-xs text-slate-500">Select an ad account first to load eligible app mappings.</p>
          )}

          <div className="flex items-center gap-3 rounded-md border bg-slate-50 p-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-slate-900 text-xs text-white">{initials(selectedAppMapping?.appDisplayName || selectedAppMapping?.appId)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{selectedAppMapping?.appDisplayName || selectedAppMapping?.appId || "No app selected"}</p>
              <p className="truncate text-xs text-slate-500">{selectedAppMapping?.downloadUrl || "Download URL missing"}</p>
            </div>
            <Badge className={selectedAppMapping?.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>
              {selectedAppMapping?.isActive ? "Mapped" : "Unmapped"}
            </Badge>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
