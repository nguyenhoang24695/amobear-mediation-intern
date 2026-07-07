"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronDown, Layers, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddAdSourceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceType: "bidding" | "waterfall"
  onAddSource: (source: {
    type: "bidding" | "waterfall"
    network: string
    name: string
    floor: number
    status: "active" | "inactive"
  }) => void
}

const adNetworks = {
  recentlyUsed: [
    { id: "ironsource", name: "ironSource", icon: "🟠" },
    { id: "vungle", name: "Vungle", icon: "🟣" },
  ],
  allNetworks: [
    { id: "admob", name: "AdMob", icon: "🟢" },
    { id: "applovin", name: "AppLovin", icon: "🔵" },
    { id: "chartboost", name: "Chartboost", icon: "🟡" },
    { id: "facebook", name: "Facebook Audience Network", icon: "🔷" },
    { id: "inmobi", name: "InMobi", icon: "🟤" },
    { id: "ironsource", name: "ironSource", icon: "🟠" },
    { id: "mintegral", name: "Mintegral", icon: "🔴" },
    { id: "pangle", name: "Pangle", icon: "⚫" },
    { id: "unity", name: "Unity Ads", icon: "⚪" },
    { id: "vungle", name: "Vungle", icon: "🟣" },
  ],
}

export function AddAdSourceModal({ open, onOpenChange, sourceType, onAddSource }: AddAdSourceModalProps) {
  const [type, setType] = useState<"bidding" | "waterfall">(sourceType)
  const [selectedNetwork, setSelectedNetwork] = useState<string>("")
  const [networkOpen, setNetworkOpen] = useState(false)
  const [adUnitName, setAdUnitName] = useState("")
  const [ecpmFloor, setEcpmFloor] = useState("")
  const [status, setStatus] = useState(true)
  const [floorError, setFloorError] = useState("")

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setType(sourceType)
      setSelectedNetwork("")
      setAdUnitName("")
      setEcpmFloor("")
      setStatus(true)
      setFloorError("")
    }
  }, [open, sourceType])

  const validateFloor = (value: string) => {
    const num = Number.parseFloat(value)
    if (isNaN(num) || num <= 0) {
      setFloorError("Must be a positive number")
      return false
    }
    setFloorError("")
    return true
  }

  const handleSubmit = () => {
    if (type === "waterfall" && !validateFloor(ecpmFloor)) return
    if (!selectedNetwork) return

    onAddSource({
      type,
      network: selectedNetwork,
      name: type === "waterfall" ? adUnitName : selectedNetwork,
      floor: type === "waterfall" ? Number.parseFloat(ecpmFloor) : 0,
      status: status ? "active" : "inactive",
    })

    onOpenChange(false)
  }

  const selectedNetworkData = adNetworks.allNetworks.find((n) => n.name === selectedNetwork)

  const isValid =
    selectedNetwork && (type === "bidding" || (type === "waterfall" && adUnitName && ecpmFloor && !floorError))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Ad Source</DialogTitle>
          <DialogDescription>Add a new source to your optimized waterfall</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field 1: Source Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Source Type</Label>
            <RadioGroup value={type} onValueChange={(v) => setType(v as "bidding" | "waterfall")} className="space-y-2">
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  type === "waterfall"
                    ? "border-primary/40 bg-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="waterfall" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">Waterfall Source</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Called in order by eCPM floor</p>
                </div>
              </label>
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  type === "bidding"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-border hover:border-primary/30 hover:bg-muted/40",
                )}
              >
                <RadioGroupItem value="bidding" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                    <span className="font-medium text-foreground">Bidding Source</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Competes in real-time auction</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="border-t border-border" />

          {/* Field 2: Ad Network */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ad Network</Label>
            <Popover open={networkOpen} onOpenChange={setNetworkOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="h-10 w-full justify-between bg-card">
                  {selectedNetwork ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <span>{selectedNetworkData?.icon}</span>
                      <span className="truncate">{selectedNetwork}</span>
                    </span>
                  ) : (
                    <span className="truncate text-muted-foreground">Search or select ad network...</span>
                  )}
                  <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] min-w-0 p-0 sm:min-w-[360px]" align="start">
                <Command>
                  <CommandInput placeholder="Search networks..." />
                  <CommandList>
                    <CommandEmpty>No network found.</CommandEmpty>
                    <CommandGroup heading="Recently Used">
                      {adNetworks.recentlyUsed.map((network) => (
                        <CommandItem
                          key={network.id}
                          value={network.name}
                          onSelect={() => {
                            setSelectedNetwork(network.name)
                            setNetworkOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <span>{network.icon}</span>
                          <span className="truncate">{network.name}</span>
                          {selectedNetwork === network.name && <Check className="w-4 h-4 ml-auto shrink-0 text-emerald-600 dark:text-emerald-300" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup heading="All Networks">
                      {adNetworks.allNetworks.map((network) => (
                        <CommandItem
                          key={network.id}
                          value={network.name}
                          onSelect={() => {
                            setSelectedNetwork(network.name)
                            setNetworkOpen(false)
                          }}
                          className="flex items-center gap-2"
                        >
                          <span>{network.icon}</span>
                          <span className="truncate">{network.name}</span>
                          {selectedNetwork === network.name && <Check className="w-4 h-4 ml-auto shrink-0 text-emerald-600 dark:text-emerald-300" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Fields 3 & 4: Only for Waterfall */}
          {type === "waterfall" && (
            <>
              {/* Field 3: eCPM Floor */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">eCPM Floor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={ecpmFloor}
                    onChange={(e) => {
                      setEcpmFloor(e.target.value)
                      if (e.target.value) validateFloor(e.target.value)
                    }}
                    className={cn("pl-7", floorError && "border-destructive focus-visible:ring-destructive/40")}
                  />
                </div>
                {floorError ? (
                  <p className="text-xs text-destructive">{floorError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Minimum eCPM required to show ads from this source</p>
                )}
              </div>

              {/* Field 4: Ad Unit Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ad Unit Name</Label>
                <Input
                  placeholder="e.g., Inter200.00"
                  value={adUnitName}
                  onChange={(e) => setAdUnitName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">This will be the display name in your waterfall</p>
              </div>
            </>
          )}

          {/* Field 5: Initial Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex items-center gap-3">
              <Switch checked={status} onCheckedChange={setStatus} className="data-[state=checked]:bg-emerald-500" />
              <span className="text-sm text-muted-foreground">{status ? "Active" : "Inactive"}</span>
            </div>
            <p className="text-xs text-muted-foreground">You can change this later</p>
          </div>

          {/* Preview Card */}
          {selectedNetwork && (type === "bidding" || (type === "waterfall" && ecpmFloor)) && (
            <div className="space-y-2 rounded-lg bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg">{selectedNetworkData?.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-foreground">
                    {type === "waterfall" ? adUnitName || selectedNetwork : selectedNetwork}
                  </p>
                  {type === "waterfall" && ecpmFloor && (
                    <p className="text-xs text-muted-foreground">${Number.parseFloat(ecpmFloor).toFixed(2)} floor</p>
                  )}
                  {type === "bidding" && <p className="text-xs text-muted-foreground">Bidding source • No floor</p>}
                </div>
                <Badge
                  className={cn(
                    "shrink-0 border-0",
                    status
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {status ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSubmit} disabled={!isValid}>
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
