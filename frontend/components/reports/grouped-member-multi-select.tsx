"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Crown, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { getTeamIdsSelectionState } from "@/lib/reports/commission-team-utils"

export interface CommissionMemberOption {
  userId: string
  email: string
  label: string
  isTeamLead: boolean
  teamId: string
  teamLabel: string
}

export interface MemberGroupSection {
  teamId: string
  teamLabel: string
  members: CommissionMemberOption[]
}

export interface GroupedMemberMultiSelectProps {
  sections: MemberGroupSection[]
  selectedMemberIds: string[]
  onSelectedMemberIdsChange: (memberIds: string[]) => void
  disabled?: boolean
  loading?: boolean
  id?: string
  placeholder?: string
  searchPlaceholder?: string
  emptySearchMessage?: string
  emptyMembersMessage?: string
  triggerLabel?: string
  showUserIcon?: boolean
  triggerClassName?: string
  popoverClassName?: string
  popoverModal?: boolean
}

function sortMembersForDisplay(members: CommissionMemberOption[]): CommissionMemberOption[] {
  return [...members].sort((a, b) => {
    if (a.isTeamLead !== b.isTeamLead) return a.isTeamLead ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

function uniqueMemberCount(sections: MemberGroupSection[]): number {
  return new Set(sections.flatMap((section) => section.members.map((member) => member.userId))).size
}

function defaultTriggerLabel(
  sections: MemberGroupSection[],
  selectedMemberIds: string[],
  placeholder: string,
  loading?: boolean,
): string {
  if (loading) return "Loading members..."
  const total = uniqueMemberCount(sections)
  if (total === 0) return placeholder
  if (selectedMemberIds.length === 0) return placeholder
  if (selectedMemberIds.length === total) {
    return `All (${total})`
  }
  if (selectedMemberIds.length === 1) {
    for (const section of sections) {
      const member = section.members.find((item) => item.userId === selectedMemberIds[0])
      if (member) return member.label
    }
    return "1 member"
  }
  return `${selectedMemberIds.length} members`
}

export function GroupedMemberMultiSelect({
  sections,
  selectedMemberIds,
  onSelectedMemberIdsChange,
  disabled = false,
  loading = false,
  id,
  placeholder = "Select members",
  searchPlaceholder = "Search members...",
  emptySearchMessage = "No members found.",
  emptyMembersMessage = "No members in selected teams",
  triggerLabel,
  showUserIcon = false,
  triggerClassName,
  popoverClassName = "w-[320px] p-0",
  popoverModal,
}: GroupedMemberMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const totalMembers = useMemo(() => uniqueMemberCount(sections), [sections])
  const displaySections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        members: sortMembersForDisplay(section.members),
      })),
    [sections],
  )

  const resolvedTriggerLabel =
    triggerLabel ?? defaultTriggerLabel(sections, selectedMemberIds, placeholder, loading)

  const toggleMember = (memberId: string) => {
    onSelectedMemberIdsChange(
      selectedMemberIds.includes(memberId)
        ? selectedMemberIds.filter((id) => id !== memberId)
        : [...selectedMemberIds, memberId],
    )
  }

  const toggleSection = (memberIds: string[], checked: boolean) => {
    const nextSet = new Set(selectedMemberIds)
    for (const id of memberIds) {
      if (checked) nextSet.add(id)
      else nextSet.delete(id)
    }
    onSelectedMemberIdsChange([...nextSet])
  }

  const selectAll = () => {
    const allIds = sections.flatMap((section) => section.members.map((member) => member.userId))
    onSelectedMemberIdsChange([...new Set(allIds)])
  }

  const clearAll = () => {
    onSelectedMemberIdsChange([])
  }

  const isTriggerDisabled = disabled || loading || totalMembers === 0

  return (
    <Popover open={open} onOpenChange={(next) => !isTriggerDisabled && setOpen(next)} modal={popoverModal}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "h-10 min-w-[11rem] max-w-[280px] justify-between bg-card border-border font-normal",
            triggerClassName,
          )}
          type="button"
          disabled={isTriggerDisabled}
        >
          <span className="flex items-center gap-2 truncate">
            {showUserIcon ? <UserRound className="w-4 h-4 text-muted-foreground shrink-0" /> : null}
            <span
              className={cn(
                "truncate",
                (selectedMemberIds.length === 0 || loading) && "text-muted-foreground",
              )}
            >
              {resolvedTriggerLabel}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={popoverClassName} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptySearchMessage}</CommandEmpty>
            <div className="flex gap-2 px-2 py-1.5 border-b border-border">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                Clear
              </Button>
            </div>
            {totalMembers === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">{emptyMembersMessage}</div>
            ) : null}
            {displaySections.map((section) => {
              const sectionMemberIds = section.members.map((member) => member.userId)
              const sectionSelection = getTeamIdsSelectionState(sectionMemberIds, selectedMemberIds)
              return (
                <CommandGroup key={section.teamId}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer rounded-sm hover:bg-muted/50"
                    onClick={() => toggleSection(sectionMemberIds, sectionSelection !== true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        toggleSection(sectionMemberIds, sectionSelection !== true)
                      }
                    }}
                  >
                    <Checkbox
                      checked={
                        sectionSelection === "indeterminate" ? "indeterminate" : sectionSelection
                      }
                      onCheckedChange={(value) => toggleSection(sectionMemberIds, value === true)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select all members in ${section.teamLabel}`}
                    />
                    <span className="text-foreground">{section.teamLabel}</span>
                  </div>
                  {section.members.map((member) => (
                    <CommandItem
                      key={`${section.teamId}-${member.userId}`}
                      value={`${section.teamLabel} ${member.label}`}
                      onSelect={() => toggleMember(member.userId)}
                      className="cursor-pointer pl-8"
                    >
                      <Checkbox checked={selectedMemberIds.includes(member.userId)} className="mr-2 shrink-0" />
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-sm font-medium truncate">{member.label}</div>
                        {member.isTeamLead ? (
                          <Badge
                            className="shrink-0 bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 text-[10px] px-1.5 py-0 h-5"
                          >
                            <Crown className="w-3 h-3" />
                            Team Lead
                          </Badge>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
