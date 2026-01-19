"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Download,
  Search,
  X,
  Plus,
  Pencil,
  Layers,
  AlertTriangle,
  DollarSign,
  ChevronDown,
  Check,
  FlaskConical,
} from "lucide-react"
import { MediationGroupsTable } from "./mediation-groups-table"
import { cn } from "@/lib/utils"

const appOptions = [
  { value: "all", label: "All Apps" },
  { value: "puzzle-master", label: "Puzzle Master Pro" },
  { value: "word-connect", label: "Word Connect" },
  { value: "racing-thunder", label: "Racing Thunder" },
  { value: "fitness-tracker", label: "Fitness Tracker Plus" },
  { value: "photo-editor", label: "Photo Editor Pro" },
  { value: "bubble-pop", label: "Bubble Pop Mania" },
]

const formatOptions = ["All Formats", "Banner", "Interstitial", "Rewarded", "Native", "App Open"]
const statusOptions = ["All Status", "Active", "Paused", "Error"]

const abTestOptions = [
  { value: "all", label: "All", count: null },
  { value: "running", label: "Running", count: 3 },
  { value: "completed", label: "Completed", count: 2 },
  { value: "none", label: "No Test", count: null },
]

interface ActiveFilter {
  type: string
  value: string
}

export function MediationGroupsPageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApp, setSelectedApp] = useState("all")
  const [format, setFormat] = useState("All Formats")
  const [status, setStatus] = useState("All Status")
  const [abTestFilter, setAbTestFilter] = useState("all")
  const [onlyShowIssues, setOnlyShowIssues] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [appPopoverOpen, setAppPopoverOpen] = useState(false)

  const handleFilterChange = (type: string, value: string) => {
    const isDefaultValue = value === "all" || value.startsWith("All")

    if (isDefaultValue) {
      setActiveFilters(activeFilters.filter((f) => f.type !== type))
    } else {
      let displayValue = value
      if (type === "App") {
        displayValue = appOptions.find((a) => a.value === value)?.label || value
      } else if (type === "A/B Test") {
        displayValue = abTestOptions.find((a) => a.value === value)?.label || value
      }

      const existing = activeFilters.find((f) => f.type === type)
      if (existing) {
        setActiveFilters(activeFilters.map((f) => (f.type === type ? { ...f, value: displayValue } : f)))
      } else {
        setActiveFilters([...activeFilters, { type, value: displayValue }])
      }
    }

    switch (type) {
      case "App":
        setSelectedApp(value)
        break
      case "Format":
        setFormat(value)
        break
      case "Status":
        setStatus(value)
        break
      case "A/B Test":
        setAbTestFilter(value)
        break
    }
  }

  const handleIssuesToggle = (checked: boolean) => {
    setOnlyShowIssues(checked)
    if (checked) {
      const existing = activeFilters.find((f) => f.type === "Issues")
      if (!existing) {
        setActiveFilters([...activeFilters, { type: "Issues", value: "Only issues" }])
      }
    } else {
      setActiveFilters(activeFilters.filter((f) => f.type !== "Issues"))
    }
  }

  const removeFilter = (type: string) => {
    setActiveFilters(activeFilters.filter((f) => f.type !== type))
    switch (type) {
      case "App":
        setSelectedApp("all")
        break
      case "Format":
        setFormat("All Formats")
        break
      case "Status":
        setStatus("All Status")
        break
      case "A/B Test":
        setAbTestFilter("all")
        break
      case "Issues":
        setOnlyShowIssues(false)
        break
    }
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setSelectedApp("all")
    setFormat("All Formats")
    setStatus("All Status")
    setAbTestFilter("all")
    setOnlyShowIssues(false)
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Mediation Groups</h1>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
              384
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">Configure and optimize your ad waterfall settings</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* App Dropdown with Search */}
            <Popover open={appPopoverOpen} onOpenChange={setAppPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={appPopoverOpen}
                  className="w-44 h-10 justify-between bg-white"
                >
                  <span className="truncate">
                    {selectedApp === "all" ? "All Apps" : appOptions.find((a) => a.value === selectedApp)?.label}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search apps..." />
                  <CommandList>
                    <CommandEmpty>No app found.</CommandEmpty>
                    <CommandGroup>
                      {appOptions.map((app) => (
                        <CommandItem
                          key={app.value}
                          value={app.value}
                          onSelect={(value) => {
                            handleFilterChange("App", value)
                            setAppPopoverOpen(false)
                          }}
                        >
                          <Check
                            className={cn("mr-2 h-4 w-4", selectedApp === app.value ? "opacity-100" : "opacity-0")}
                          />
                          {app.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={format} onValueChange={(v) => handleFilterChange("Format", v)}>
              <SelectTrigger className="w-36 h-10 bg-white">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => handleFilterChange("Status", v)}>
              <SelectTrigger className="w-32 h-10 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={abTestFilter} onValueChange={(v) => handleFilterChange("A/B Test", v)}>
              <SelectTrigger className="w-32 h-10 bg-white">
                <div className="flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-slate-500" />
                  <SelectValue placeholder="A/B Test" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {abTestOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{opt.label}</span>
                      {opt.count !== null && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-slate-100">
                          {opt.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Only show issues checkbox */}
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md bg-white h-10">
              <Checkbox
                id="issues"
                checked={onlyShowIssues}
                onCheckedChange={(checked) => handleIssuesToggle(checked as boolean)}
              />
              <label htmlFor="issues" className="text-sm text-slate-600 cursor-pointer whitespace-nowrap">
                Only show issues
              </label>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 gap-2 bg-transparent">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="h-10 gap-2 bg-transparent">
            <Pencil className="w-4 h-4" />
            Bulk Edit
          </Button>
          <Button className="h-10 gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.type}
              variant="secondary"
              className="bg-blue-50 text-blue-700 border border-blue-200 gap-1 pr-1"
            >
              {filter.type}: {filter.value}
              <button onClick={() => removeFilter(filter.type)} className="ml-1 hover:bg-blue-100 rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          <button onClick={clearAllFilters} className="text-sm text-blue-600 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Summary Cards - Added A/B Tests Running card */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Layers className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Groups</p>
              <p className="text-xl font-semibold text-slate-900">384</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Layers className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-xl font-semibold text-slate-900">356</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">A/B Tests Running</p>
              <p className="text-xl font-semibold text-slate-900">3</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Need Attention</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xl font-semibold text-slate-900">12</p>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Avg eCPM</p>
              <p className="text-xl font-semibold text-slate-900">$5.82</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedGroups.length > 0 && (
        <div className="bg-slate-900 text-white rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedGroups.length} groups selected</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
              Pause All
            </Button>
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
              Resume All
            </Button>
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
              Bulk Edit eCPM
            </Button>
            <Button variant="secondary" size="sm" className="h-8 bg-slate-700 hover:bg-slate-600 text-white border-0">
              Export
            </Button>
            <button onClick={() => setSelectedGroups([])} className="text-sm text-slate-300 hover:text-white ml-2">
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Mediation Groups Table - Added abTestFilter prop */}
      <MediationGroupsTable
        searchQuery={searchQuery}
        appFilter={selectedApp}
        formatFilter={format}
        statusFilter={status}
        onlyShowIssues={onlyShowIssues}
        abTestFilter={abTestFilter}
        selectedGroups={selectedGroups}
        onSelectionChange={setSelectedGroups}
      />
    </div>
  )
}
