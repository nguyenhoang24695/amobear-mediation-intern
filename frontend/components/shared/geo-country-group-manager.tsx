"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { geoCountryGroupsApi } from "@/lib/api/geo"
import { cn } from "@/lib/utils"
import type { GeoCountryGroupDto } from "@/types/meta-ads"

const fallbackCountryCodes = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AR", "AT", "AU", "AW", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ",
  "CA", "CD", "CF", "CG", "CH", "CI", "CL", "CM", "CN", "CO", "CR", "CV", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "ES", "ET",
  "FI", "FJ", "FM", "FR",
  "GA", "GB", "GD", "GE", "GH", "GM", "GN", "GQ", "GR", "GT", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IN", "IQ", "IS", "IT",
  "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MR", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NE", "NG", "NI", "NL", "NO", "NP", "NR", "NZ",
  "OM",
  "PA", "PE", "PG", "PH", "PK", "PL", "PT", "PW", "PY",
  "QA",
  "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SE", "SG", "SI", "SK", "SL", "SM", "SN", "SO", "SR", "ST", "SV", "SZ",
  "TD", "TG", "TH", "TL", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "US", "UY", "UZ",
  "VC", "VE", "VN", "VU",
  "WS",
  "XK",
  "YE",
  "ZA", "ZM", "ZW",
] as const

const regionDisplayNames = typeof Intl !== "undefined" && typeof Intl.DisplayNames !== "undefined"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null

const countryOptions = [...fallbackCountryCodes]
  .map((code) => {
    const name = regionDisplayNames?.of(code) ?? code
    const label = name && name !== code ? `${name} (${code})` : code
    return { code, label, searchValue: `${name} ${code}` }
  })
  .sort((a, b) => a.label.localeCompare(b.label))

const countryLabelMap = Object.fromEntries(countryOptions.map((country) => [country.code, country.label])) as Record<string, string>

function getCountryLabel(countryCode: string) {
  return countryLabelMap[countryCode.toUpperCase()] ?? countryCode.toUpperCase()
}

interface Props {
  groups: GeoCountryGroupDto[]
  loading?: boolean
  message?: string | null
  selectedGroupIds: number[]
  onSelectedGroupIdsChange: (groupIds: number[]) => void
  onGroupsChanged: () => void
  title?: string
  description?: string
  emptyMessage?: string
  actionLabel?: string
  actionDisabled?: boolean
  selectionDisabled?: boolean
  selectionDisabledMessage?: string
  onAction?: () => void
}

export function GeoCountryGroupManager({
  groups,
  loading = false,
  message,
  selectedGroupIds,
  onSelectedGroupIdsChange,
  onGroupsChanged,
  title = "Country Groups",
  description,
  emptyMessage = "No country groups yet. Create one below to reuse it.",
  actionLabel,
  actionDisabled = false,
  selectionDisabled = false,
  selectionDisabledMessage,
  onAction,
}: Props) {
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [groupCountryCodes, setGroupCountryCodes] = useState<string[]>([])
  const [groupCountryPopoverOpen, setGroupCountryPopoverOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupMessage, setGroupMessage] = useState<string | null>(null)

  const toggleSelectedGroup = (groupId: number) => {
    if (selectionDisabled) return
    onSelectedGroupIdsChange(
      selectedGroupIds.includes(groupId)
        ? selectedGroupIds.filter((value) => value !== groupId)
        : [...selectedGroupIds, groupId],
    )
  }

  const toggleGroupCountry = (countryCode: string) => {
    const country = countryCode.toUpperCase()
    setGroupCountryCodes((current) => current.includes(country) ? current.filter((value) => value !== country) : [...current, country])
  }

  const resetGroupForm = () => {
    setEditingGroupId(null)
    setGroupName("")
    setGroupDescription("")
    setGroupCountryCodes([])
    setGroupMessage(null)
    setGroupCountryPopoverOpen(false)
  }

  const openCreateGroupDialog = () => {
    resetGroupForm()
    setGroupDialogOpen(true)
  }

  const closeGroupDialog = () => {
    if (groupSaving) return
    setGroupDialogOpen(false)
    resetGroupForm()
  }

  const startEditGroup = (group: GeoCountryGroupDto) => {
    setEditingGroupId(group.id)
    setGroupName(group.name)
    setGroupDescription(group.description ?? "")
    setGroupCountryCodes(group.countryCodes ?? [])
    setGroupMessage(null)
    setGroupCountryPopoverOpen(false)
    setGroupDialogOpen(true)
  }

  const saveCountryGroup = async () => {
    setGroupSaving(true)
    setGroupMessage(null)
    try {
      const payload = {
        name: groupName,
        description: groupDescription || null,
        countryCodes: groupCountryCodes,
      }
      if (editingGroupId) await geoCountryGroupsApi.update(editingGroupId, payload)
      else await geoCountryGroupsApi.create(payload)
      setGroupDialogOpen(false)
      resetGroupForm()
      onGroupsChanged()
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Unable to save country group.")
    } finally {
      setGroupSaving(false)
    }
  }

  const deleteCountryGroup = async (groupId: number) => {
    setGroupSaving(true)
    setGroupMessage(null)
    try {
      await geoCountryGroupsApi.delete(groupId)
      onSelectedGroupIdsChange(selectedGroupIds.filter((value) => value !== groupId))
      if (editingGroupId === groupId) resetGroupForm()
      onGroupsChanged()
    } catch (error) {
      setGroupMessage(error instanceof Error ? error.message : "Unable to delete country group.")
    } finally {
      setGroupSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs font-medium text-slate-700">{title} <span className="text-red-500">*</span></Label>
            {description ? <p className="text-xs text-slate-500">{description}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {actionLabel ? (
              <Button type="button" size="sm" variant="outline" disabled={selectionDisabled || actionDisabled || selectedGroupIds.length === 0} onClick={onAction}>
                {actionLabel}
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={openCreateGroupDialog}>Create group</Button>
          </div>
        </div>
        {selectionDisabled && selectionDisabledMessage ? <p className="text-xs text-amber-700">{selectionDisabledMessage}</p> : null}
        {loading ? <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading country groups...</p> : null}
        {message ? <p className="text-xs text-red-600">{message}</p> : null}
        {!loading && !message ? (
          <div className="grid gap-2 md:grid-cols-2">
            {groups.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2">{emptyMessage}</p>
            ) : groups.map((group) => {
              const selected = selectedGroupIds.includes(group.id)
              const preview = group.countryCodes.slice(0, 6).join(", ")
              return (
                <div key={group.id} className={`rounded-md border p-3 ${selected ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                  <label className={cn("flex items-start gap-2", selectionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
                    <Checkbox checked={selected} disabled={selectionDisabled} onCheckedChange={() => toggleSelectedGroup(group.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-800">{group.name}</span>
                      <span className="block text-[11px] text-slate-500">{group.countryCount} countries{preview ? `: ${preview}${group.countryCount > 6 ? "..." : ""}` : ""}</span>
                      {group.description ? <span className="mt-1 block text-[11px] text-slate-500">{group.description}</span> : null}
                    </span>
                  </label>
                  <div className="mt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => startEditGroup(group)}>Edit</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-red-600" disabled={groupSaving} onClick={() => void deleteCountryGroup(group.id)}>Delete</Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
        {selectedGroupIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedGroupIds.map((groupId) => {
              const group = groups.find((item) => item.id === groupId)
              return (
                <Badge key={groupId} className="bg-blue-100 text-blue-800 gap-1 pr-1 text-xs">
                  {group?.name ?? `Group #${groupId}`}
                  <button type="button" disabled={selectionDisabled} onClick={() => toggleSelectedGroup(groupId)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        ) : null}
      </div>

      <Dialog open={groupDialogOpen} onOpenChange={(open) => { if (open) setGroupDialogOpen(true); else closeGroupDialog() }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroupId ? "Edit country group" : "Create country group"}</DialogTitle>
            <DialogDescription>Create reusable country groups for Meta and TikTok campaign requests.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500">Group name</Label>
                <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="e.g. Tier 1 English" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500">Description</Label>
                <Input value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Optional" className="h-9 text-sm" />
              </div>
            </div>
            <Popover open={groupCountryPopoverOpen} onOpenChange={setGroupCountryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" aria-expanded={groupCountryPopoverOpen} className="h-9 w-full justify-between bg-white px-3 text-left font-normal">
                  <span className="min-w-0 flex-1 truncate text-left text-sm text-slate-700">
                    {groupCountryCodes.length === 0 ? "Select countries for this group" : `${groupCountryCodes.length} countries selected`}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[360px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search countries by name or code..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup heading="Countries">
                      {countryOptions.map((country) => {
                        const isSelected = groupCountryCodes.includes(country.code)
                        return (
                          <CommandItem key={country.code} value={country.searchValue} onSelect={() => toggleGroupCountry(country.code)}>
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                            <span className="min-w-0 flex-1 truncate">{country.label}</span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {groupCountryCodes.length > 0 ? (
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-auto rounded-md border bg-slate-50 p-2">
                {groupCountryCodes.map((country) => (
                  <Badge key={country} className="bg-white text-slate-700 gap-1 pr-1 text-xs">
                    {getCountryLabel(country)}
                    <button type="button" onClick={() => toggleGroupCountry(country)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            {groupMessage ? <p className="text-xs text-red-600">{groupMessage}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={groupSaving} onClick={closeGroupDialog}>Cancel</Button>
            <Button type="button" disabled={groupSaving || !groupName.trim() || groupCountryCodes.length === 0} onClick={() => void saveCountryGroup()}>
              {groupSaving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              {editingGroupId ? "Save group" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
