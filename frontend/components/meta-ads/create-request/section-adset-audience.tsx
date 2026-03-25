"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Users, X } from "lucide-react"
import { useState } from "react"
import type { RequestFormState } from "./create-request-content"

const popularCountries = ["US", "GB", "CA", "AU", "DE", "FR", "JP", "KR", "IN", "BR", "VN", "SG", "TH", "ID", "MY"]
const publisherPlatformOptions = ["facebook", "instagram", "audience_network", "messenger"]
const fbPositionOptions = ["feed", "right_hand_column", "instant_article", "marketplace", "video_feeds", "story", "search", "instream_video"]
const igPositionOptions = ["stream", "story", "explore", "reels"]

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
}

export function AdSetAudienceSection({ form, onChange }: Props) {
  const [countryInput, setCountryInput] = useState("")

  const toggleCountry = (c: string) => {
    const up = c.toUpperCase()
    onChange({
      countries: form.countries.includes(up)
        ? form.countries.filter(x => x !== up)
        : [...form.countries, up]
    })
  }

  const addCountry = (raw: string) => {
    const up = raw.trim().toUpperCase()
    if (up.length === 2 && !form.countries.includes(up)) {
      onChange({ countries: [...form.countries, up] })
    }
    setCountryInput("")
  }

  const togglePlatform = (p: string) => {
    onChange({
      publisherPlatforms: form.publisherPlatforms.includes(p)
        ? form.publisherPlatforms.filter(x => x !== p)
        : [...form.publisherPlatforms, p]
    })
  }

  const toggleFbPos = (p: string) => {
    onChange({
      facebookPositions: form.facebookPositions.includes(p)
        ? form.facebookPositions.filter(x => x !== p)
        : [...form.facebookPositions, p]
    })
  }

  const toggleIgPos = (p: string) => {
    onChange({
      instagramPositions: form.instagramPositions.includes(p)
        ? form.instagramPositions.filter(x => x !== p)
        : [...form.instagramPositions, p]
    })
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          Ad Set — Audience &amp; Placement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ad Set Name */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Ad Set Name <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. US_18-35_All_APP_OPEN" className="h-9 text-sm" value={form.adSetName} onChange={e => onChange({ adSetName: e.target.value })} />
        </div>

        {/* Countries */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Countries <span className="text-red-500">*</span></Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {popularCountries.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCountry(c)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  form.countries.includes(c)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {form.countries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.countries.map(c => (
                <Badge key={c} className="bg-blue-100 text-blue-800 gap-1 pr-1 text-xs">
                  {c}
                  <button onClick={() => toggleCountry(c)}><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add country code (e.g. VN)"
              className="h-8 text-sm max-w-xs"
              value={countryInput}
              onChange={e => setCountryInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCountry(countryInput) } }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Age Range */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Age Range</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={13} max={65} className="h-9 text-sm w-20" value={form.ageMin} onChange={e => onChange({ ageMin: Number(e.target.value) })} />
              <span className="text-slate-400 text-sm">–</span>
              <Input type="number" min={13} max={65} className="h-9 text-sm w-20" value={form.ageMax} onChange={e => onChange({ ageMax: Number(e.target.value) })} />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Gender</Label>
            <div className="flex rounded-md overflow-hidden border border-slate-300 w-fit">
              {(["ALL", "MALE", "FEMALE"] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onChange({ gender: g })}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.gender === g ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  } ${g !== "ALL" ? "border-l border-slate-300" : ""}`}
                >
                  {g === "ALL" ? "All" : g.charAt(0) + g.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Placement Mode */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Placement Mode</Label>
          <div className="flex rounded-md overflow-hidden border border-slate-300 w-fit">
            {(["AUTOMATIC", "MANUAL"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onChange({ placementMode: m })}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                  form.placementMode === m ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                } ${m === "MANUAL" ? "border-l border-slate-300" : ""}`}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {form.placementMode === "MANUAL" && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <p className="text-[11px] text-slate-500">Manual placement values must map cleanly to backend payload fields.</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Publisher Platforms</p>
                <div className="flex flex-wrap gap-3">
                  {publisherPlatformOptions.map(p => (
                    <label key={p} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Checkbox checked={form.publisherPlatforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Facebook Positions</p>
                <div className="flex flex-wrap gap-3">
                  {fbPositionOptions.map(p => (
                    <label key={p} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Checkbox checked={form.facebookPositions.includes(p)} onCheckedChange={() => toggleFbPos(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Instagram Positions</p>
                <div className="flex flex-wrap gap-3">
                  {igPositionOptions.map(p => (
                    <label key={p} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Checkbox checked={form.instagramPositions.includes(p)} onCheckedChange={() => toggleIgPos(p)} />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Audience - disabled/coming soon */}
        <div className="space-y-1.5 opacity-50">
          <Label className="text-xs font-medium text-slate-700">Custom Audience <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-normal ml-1">Coming soon</span></Label>
          <Input disabled placeholder="Custom audience selection" className="h-9 text-sm" />
        </div>
      </CardContent>
    </Card>
  )
}
