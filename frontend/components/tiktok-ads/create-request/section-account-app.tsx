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
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="break-words">Advertiser ID: <span className="font-medium text-foreground">{selectedAdAccount?.advertiserId ?? "-"}</span></p>
          <p className="break-words">TikTok Mobile App ID: <span className="font-medium text-foreground">{selectedAppMapping?.tikTokAppId ?? "-"}</span></p>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
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
              <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="break-words font-medium text-foreground">{account.name || account.advertiserId}</span>
                <span className="break-all font-mono text-xs text-muted-foreground">{account.advertiserId}</span>
              </span>
            )}
            renderOption={(account) => (
              <div className="min-w-0 py-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{account.advertiserId}</span>
                  <Badge className={account.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}>{account.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="break-words text-sm font-medium text-foreground">{account.name || account.advertiserId} - {account.currency ?? "N/A"} - {account.timezone ?? "N/A"}</div>
              </div>
            )}
          />
          <div className="flex flex-wrap gap-2">
            <Badge className={selectedAdAccount?.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
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
              <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                <span className="break-words font-medium text-foreground">{mapping.appDisplayName || mapping.appId || mapping.packageName || mapping.normalizedStoreIdentifier || mapping.tikTokAppId}</span>
                <span className="break-all font-mono text-xs text-muted-foreground">{mapping.appId ?? mapping.normalizedStoreIdentifier ?? `binding:${mapping.id}`}</span>
              </span>
            )}
            renderOption={(mapping) => (
              <div className="flex min-w-0 flex-col gap-1 py-0.5 sm:flex-row sm:items-center sm:gap-2">
                <Badge variant="outline" className={`w-fit ${(mapping.appPlatform ?? mapping.platform) === "IOS" ? "border-primary/20 text-primary" : "border-emerald-500/20 text-emerald-700 dark:text-emerald-300"}`}>{mapping.appPlatform ?? mapping.platform ?? "APP"}</Badge>
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium text-foreground">{mapping.appDisplayName || mapping.appId || mapping.packageName || mapping.normalizedStoreIdentifier || mapping.tikTokAppId}</div>
                  <div className="break-all font-mono text-xs text-muted-foreground">{mapping.packageName ?? mapping.normalizedStoreIdentifier ?? mapping.downloadUrl ?? mapping.tikTokAppId}</div>
                  <div className="break-all font-mono text-[11px] text-muted-foreground">Mobile App ID: {mapping.tikTokAppId}</div>
                </div>
              </div>
            )}
          />

          {form.tikTokAdAccountRowId && appMappings.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">This ad account does not have the selected app configured in TikTok.</p>
          ) : form.tikTokAdAccountRowId && form.paidMediaAppBindingId && !selectedAppMapping ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">This ad account does not have the selected app configured in TikTok.</p>
          ) : form.tikTokAdAccountRowId ? (
            <p className="text-xs text-muted-foreground">Showing {appMappings.length} app mapping{appMappings.length === 1 ? "" : "s"} known for this advertiser.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Select an ad account first to load eligible app mappings.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-foreground text-xs text-background">{initials(selectedAppMapping?.appDisplayName || selectedAppMapping?.appId)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium text-foreground">{selectedAppMapping?.appDisplayName || selectedAppMapping?.appId || "No app selected"}</p>
              <p className="break-all text-xs text-muted-foreground">{selectedAppMapping?.downloadUrl || "Download URL missing"}</p>
            </div>
            <Badge className={selectedAppMapping?.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
              {selectedAppMapping?.isActive ? "Mapped" : "Unmapped"}
            </Badge>
          </div>
        </div>
      </div>
    </SectionShell>
  )
}
