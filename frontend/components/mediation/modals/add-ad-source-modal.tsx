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

  // Auto-generate ad unit name from floor
  useEffect(() => {
    if (ecpmFloor && !isNaN(Number.parseFloat(ecpmFloor))) {
      setAdUnitName(`Inter${Number.parseFloat(ecpmFloor).toFixed(2)}`)
    }
  }, [ecpmFloor])

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
      <DialogContent className="max-w-lg">
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
                  type === "waterfall" ? "border-purple-500 bg-purple-50" : "border-slate-200 hover:border-slate-300",
                )}
              >
                <RadioGroupItem value="waterfall" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-slate-900">Waterfall Source</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Called in order by eCPM floor</p>
                </div>
              </label>
              <label
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  type === "bidding" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300",
                )}
              >
                <RadioGroupItem value="bidding" className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-600" />
                    <span className="font-medium text-slate-900">Bidding Source</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Competes in real-time auction</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="border-t border-slate-200" />

          {/* Field 2: Ad Network */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ad Network</Label>
            <Popover open={networkOpen} onOpenChange={setNetworkOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between bg-white h-10">
                  {selectedNetwork ? (
                    <span className="flex items-center gap-2">
                      <span>{selectedNetworkData?.icon}</span>
                      <span>{selectedNetwork}</span>
                    </span>
                  ) : (
                    <span className="text-slate-500">Search or select ad network...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
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
                          <span>{network.name}</span>
                          {selectedNetwork === network.name && <Check className="w-4 h-4 ml-auto text-green-500" />}
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
                          <span>{network.name}</span>
                          {selectedNetwork === network.name && <Check className="w-4 h-4 ml-auto text-green-500" />}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={ecpmFloor}
                    onChange={(e) => {
                      setEcpmFloor(e.target.value)
                      if (e.target.value) validateFloor(e.target.value)
                    }}
                    className={cn("pl-7", floorError && "border-red-500 focus-visible:ring-red-500")}
                  />
                </div>
                {floorError ? (
                  <p className="text-xs text-red-500">{floorError}</p>
                ) : (
                  <p className="text-xs text-slate-500">Minimum eCPM required to show ads from this source</p>
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
                <p className="text-xs text-slate-500">This will be the display name in your waterfall</p>
              </div>
            </>
          )}

          {/* Field 5: Initial Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <div className="flex items-center gap-3">
              <Switch checked={status} onCheckedChange={setStatus} className="data-[state=checked]:bg-green-500" />
              <span className="text-sm text-slate-600">{status ? "Active" : "Inactive"}</span>
            </div>
            <p className="text-xs text-slate-500">You can change this later</p>
          </div>

          {/* Preview Card */}
          {selectedNetwork && (type === "bidding" || (type === "waterfall" && ecpmFloor)) && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview</p>
              <div className="flex items-center gap-3">
                <span className="text-lg">{selectedNetworkData?.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">
                    {type === "waterfall" ? adUnitName || `Inter${ecpmFloor}` : selectedNetwork}
                  </p>
                  {type === "waterfall" && ecpmFloor && (
                    <p className="text-xs text-slate-500">${Number.parseFloat(ecpmFloor).toFixed(2)} floor</p>
                  )}
                  {type === "bidding" && <p className="text-xs text-slate-500">Bidding source • No floor</p>}
                </div>
                <Badge
                  className={cn("border-0", status ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600")}
                >
                  {status ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={!isValid}>
            Add Source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
