"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { buildTeamGroupSectionsFromOrg, type OrgTeamGroupDefinition, type TeamGroupSection } from "@/lib/organizations/team-group"
import {
  getTeamIdsSelectionState,
  groupCommissionTeamsBySection,
  type CommissionTeamOption,
} from "@/lib/reports/commission-team-utils"

export interface GroupedTeamMultiSelectProps {
  teams: CommissionTeamOption[]
  teamGroups?: OrgTeamGroupDefinition[]
  teamGroupSections?: TeamGroupSection[]
  selectedTeamIds: string[]
  onSelectedTeamIdsChange: (teamIds: string[]) => void
  disabled?: boolean
  id?: string
  /** Shown on trigger when nothing selected (overview: means “all teams” in report). */
  placeholder?: string
  searchPlaceholder?: string
  emptySearchMessage?: string
  emptyTeamsMessage?: string
  /** Override trigger text; when omitted, derived from selection + teams. */
  triggerLabel?: string
  showUsersIcon?: boolean
  triggerClassName?: string
  popoverClassName?: string
}

function defaultTriggerLabel(
  teams: CommissionTeamOption[],
  selectedTeamIds: string[],
  placeholder: string,
): string {
  if (selectedTeamIds.length === 0) return placeholder
  if (selectedTeamIds.length === teams.length) {
    return teams.length === 0 ? placeholder : `All (${teams.length})`
  }
  if (selectedTeamIds.length === 1) {
    const team = teams.find((item) => item.teamId === selectedTeamIds[0])
    return team?.label ?? "1 team"
  }
  return `${selectedTeamIds.length} teams`
}

export function GroupedTeamMultiSelect({
  teams,
  teamGroups = [],
  teamGroupSections: teamGroupSectionsProp,
  selectedTeamIds,
  onSelectedTeamIdsChange,
  disabled = false,
  id,
  placeholder = "Select teams",
  searchPlaceholder = "Search teams...",
  emptySearchMessage = "No teams found.",
  emptyTeamsMessage = "No teams available",
  triggerLabel,
  showUsersIcon = false,
  triggerClassName,
  popoverClassName = "w-[320px] p-0",
}: GroupedTeamMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const teamGroupSections = useMemo(
    () => teamGroupSectionsProp ?? buildTeamGroupSectionsFromOrg(teamGroups, teams),
    [teamGroupSectionsProp, teamGroups, teams],
  )
  const teamsBySection = useMemo(
    () => groupCommissionTeamsBySection(teams, teamGroupSections),
    [teams, teamGroupSections],
  )

  const resolvedTriggerLabel =
    triggerLabel ?? defaultTriggerLabel(teams, selectedTeamIds, placeholder)

  const toggleTeam = (teamId: string) => {
    onSelectedTeamIdsChange(
      selectedTeamIds.includes(teamId)
        ? selectedTeamIds.filter((id) => id !== teamId)
        : [...selectedTeamIds, teamId],
    )
  }

  const toggleSection = (teamIds: string[], checked: boolean) => {
    const nextSet = new Set(selectedTeamIds)
    for (const id of teamIds) {
      if (checked) nextSet.add(id)
      else nextSet.delete(id)
    }
    onSelectedTeamIdsChange([...nextSet])
  }

  const selectAll = () => {
    onSelectedTeamIdsChange(teams.map((team) => team.teamId))
  }

  const clearAll = () => {
    onSelectedTeamIdsChange([])
  }

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "h-10 min-w-[11rem] max-w-[280px] justify-between bg-white border-slate-200 font-normal",
            triggerClassName,
          )}
          type="button"
          disabled={disabled || teams.length === 0}
        >
          <span className="flex items-center gap-2 truncate">
            {showUsersIcon ? <Users className="w-4 h-4 text-slate-400 shrink-0" /> : null}
            <span className={cn("truncate", selectedTeamIds.length === 0 && "text-slate-500")}>
              {resolvedTriggerLabel}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={popoverClassName} align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptySearchMessage}</CommandEmpty>
            <div className="flex gap-2 px-2 py-1.5 border-b border-slate-100">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                Clear
              </Button>
            </div>
            {teams.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500">{emptyTeamsMessage}</div>
            ) : null}
            {teamsBySection.map(({ section, teams: sectionTeams }) => {
              const sectionTeamIds = sectionTeams.map((team) => team.teamId)
              const sectionSelection = getTeamIdsSelectionState(sectionTeamIds, selectedTeamIds)
              return (
                <CommandGroup key={section.label}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer rounded-sm hover:bg-slate-50"
                    onClick={() => toggleSection(sectionTeamIds, sectionSelection !== true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        toggleSection(sectionTeamIds, sectionSelection !== true)
                      }
                    }}
                  >
                    <Checkbox
                      checked={
                        sectionSelection === "indeterminate" ? "indeterminate" : sectionSelection
                      }
                      onCheckedChange={(value) => toggleSection(sectionTeamIds, value === true)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select all teams in ${section.label}`}
                    />
                    <span className="text-slate-700">{section.label}</span>
                  </div>
                  {sectionTeams.map((team) => (
                    <CommandItem
                      key={team.teamId}
                      value={`${section.label} ${team.label}`}
                      onSelect={() => toggleTeam(team.teamId)}
                      className="cursor-pointer pl-8"
                    >
                      <Checkbox
                        checked={selectedTeamIds.includes(team.teamId)}
                        className="mr-2"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{team.label}</div>
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
