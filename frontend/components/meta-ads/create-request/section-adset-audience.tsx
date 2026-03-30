"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Users, X, Wand2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { RequestFormState } from "./create-request-content"

const popularCountries = ["US", "GB", "CA", "AU", "DE", "FR", "JP", "KR", "IN", "BR", "VN", "SG", "TH", "ID", "MY"]
const publisherPlatformOptions = ["facebook", "instagram", "audience_network", "messenger"]
const fbPositionOptions = ["feed", "right_hand_column", "instant_article", "marketplace", "video_feeds", "story", "search", "instream_video"]
const igPositionOptions = ["stream", "story", "explore", "reels"]

interface Props {
  form: RequestFormState
  onChange: (patch: Partial<RequestFormState>) => void
}

function buildCountriesToken(countries: string[]) {
  const normalized = Array.from(new Set(countries.map((country) => country.trim().toUpperCase()).filter(Boolean)))
  if (normalized.length === 0) return ""
  if (normalized.length <= 3) return normalized.join("-")
  return `MULTI${normalized.length}`
}

function buildGenderToken(gender: string) {
  switch (gender) {
    case "MALE":
      return "M"
    case "FEMALE":
      return "F"
    default:
      return "ALL"
  }
}

function buildPlacementToken(form: RequestFormState) {
  if (form.placementMode === "AUTOMATIC") return "AUTO"

  const platformMap: Record<string, string> = {
    facebook: "FB",
    instagram: "IG",
    audience_network: "AN",
    messenger: "MSG",
  }

  const selectedPlatforms = form.publisherPlatforms
    .map((platform) => platformMap[platform] ?? platform.toUpperCase())
    .filter(Boolean)

  if (selectedPlatforms.length === 0) return "MANUAL"
  if (selectedPlatforms.length <= 3) return `MAN-${selectedPlatforms.join("-")}`
  return `MAN-MULTI${selectedPlatforms.length}`
}

function buildAdSetName(form: RequestFormState) {
  const countriesToken = buildCountriesToken(form.countries)
  if (!countriesToken) return ""

  const ageToken = `${form.ageMin}-${form.ageMax}`
  const genderToken = buildGenderToken(form.gender)
  const placementToken = buildPlacementToken(form)

  return [countriesToken, ageToken, genderToken, placementToken].join("_")
}

export function AdSetAudienceSection({ form, onChange }: Props) {
  const [countryInput, setCountryInput] = useState("")
  const [isAutoNameEnabled, setIsAutoNameEnabled] = useState(true)
  const lastGeneratedNameRef = useRef("")

  const generatedAdSetName = useMemo(() => buildAdSetName(form), [
    form.ageMax,
    form.ageMin,
    form.countries,
    form.gender,
    form.placementMode,
    form.publisherPlatforms,
  ])

  useEffect(() => {
    const currentName = form.adSetName.trim()
    const lastGeneratedName = lastGeneratedNameRef.current.trim()

    if (!currentName) {
      setIsAutoNameEnabled(true)
      return
    }

    if (currentName === generatedAdSetName || (lastGeneratedName && currentName === lastGeneratedName)) {
      setIsAutoNameEnabled(true)
      return
    }

    setIsAutoNameEnabled(false)
  }, [form.adSetName, generatedAdSetName])

  useEffect(() => {
    if (!isAutoNameEnabled) return

    const currentName = form.adSetName.trim()
    const lastGeneratedName = lastGeneratedNameRef.current.trim()
    const looksManual = !!currentName && currentName !== generatedAdSetName && (!lastGeneratedName || currentName !== lastGeneratedName)

    if (looksManual) return

    if (!generatedAdSetName) {
      lastGeneratedNameRef.current = ""
      if (!currentName) return
      return
    }

    if (currentName === generatedAdSetName) {
      lastGeneratedNameRef.current = generatedAdSetName
      return
    }

    lastGeneratedNameRef.current = generatedAdSetName
    onChange({ adSetName: generatedAdSetName })
  }, [form.adSetName, generatedAdSetName, isAutoNameEnabled, onChange])

  const applyGeneratedName = () => {
    setIsAutoNameEnabled(true)
    lastGeneratedNameRef.current = generatedAdSetName
    onChange({ adSetName: generatedAdSetName })
  }

  const handleNameInputChange = (value: string) => {
    setIsAutoNameEnabled(false)
    onChange({ adSetName: value })
  }

  const toggleCountry = (countryCode: string) => {
    const country = countryCode.toUpperCase()
    onChange({
      countries: form.countries.includes(country)
        ? form.countries.filter((value) => value !== country)
        : [...form.countries, country],
    })
  }

  const addCountry = (raw: string) => {
    const country = raw.trim().toUpperCase()
    if (country.length === 2 && !form.countries.includes(country)) {
      onChange({ countries: [...form.countries, country] })
    }
    setCountryInput("")
  }

  const togglePlatform = (platform: string) => {
    onChange({
      publisherPlatforms: form.publisherPlatforms.includes(platform)
        ? form.publisherPlatforms.filter((value) => value !== platform)
        : [...form.publisherPlatforms, platform],
    })
  }

  const toggleFbPos = (position: string) => {
    onChange({
      facebookPositions: form.facebookPositions.includes(position)
        ? form.facebookPositions.filter((value) => value !== position)
        : [...form.facebookPositions, position],
    })
  }

  const toggleIgPos = (position: string) => {
    onChange({
      instagramPositions: form.instagramPositions.includes(position)
        ? form.instagramPositions.filter((value) => value !== position)
        : [...form.instagramPositions, position],
    })
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          Ad Set - Audience &amp; Placement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs font-medium text-slate-700">Ad Set Name <span className="text-red-500">*</span></Label>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <Wand2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Auto-generate</span>
              <Switch checked={isAutoNameEnabled} onCheckedChange={(checked) => {
                setIsAutoNameEnabled(checked)
                if (checked) applyGeneratedName()
              }} />
            </div>
          </div>
          <Input
            placeholder="e.g. US_18-24_ALL_AUTO"
            className="h-9 text-sm"
            value={form.adSetName}
            onChange={(event) => handleNameInputChange(event.target.value)}
          />
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 space-y-1.5">
            <p className="text-[11px] text-slate-500">Pattern: <code className="rounded bg-white px-1 py-0.5">COUNTRY_AGE_GENDER_PLACEMENT</code></p>
            <p className={`text-xs font-mono ${generatedAdSetName ? "text-slate-700" : "text-slate-400 italic"}`}>
              {generatedAdSetName || "Select at least one country to generate an ad set name."}
            </p>
            {!isAutoNameEnabled && generatedAdSetName ? (
              <button
                type="button"
                onClick={applyGeneratedName}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
              >
                Use generated name
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-700">Countries <span className="text-red-500">*</span></Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {popularCountries.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => toggleCountry(country)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  form.countries.includes(country)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-300"
                }`}
              >
                {country}
              </button>
            ))}
          </div>
          {form.countries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {form.countries.map((country) => (
                <Badge key={country} className="bg-blue-100 text-blue-800 gap-1 pr-1 text-xs">
                  {country}
                  <button type="button" onClick={() => toggleCountry(country)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add country code (e.g. VN)"
              className="h-8 text-sm max-w-xs"
              value={countryInput}
              onChange={(event) => setCountryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addCountry(countryInput)
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Age Range</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min={13} max={65} className="h-9 text-sm w-20" value={form.ageMin} onChange={(event) => onChange({ ageMin: Number(event.target.value) })} />
              <span className="text-slate-400 text-sm">-</span>
              <Input type="number" min={13} max={65} className="h-9 text-sm w-20" value={form.ageMax} onChange={(event) => onChange({ ageMax: Number(event.target.value) })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Gender</Label>
            <div className="flex rounded-md overflow-hidden border border-slate-300 w-fit">
              {(["ALL", "MALE", "FEMALE"] as const).map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => onChange({ gender })}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.gender === gender ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  } ${gender !== "ALL" ? "border-l border-slate-300" : ""}`}
                >
                  {gender === "ALL" ? "All" : gender.charAt(0) + gender.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-slate-700">Placement Mode</Label>
          <div className="flex rounded-md overflow-hidden border border-slate-300 w-fit">
            {(["AUTOMATIC", "MANUAL"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ placementMode: mode })}
                className={`px-4 py-1.5 text-xs font-medium transition-colors ${
                  form.placementMode === mode ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                } ${mode === "MANUAL" ? "border-l border-slate-300" : ""}`}
              >
                {mode.charAt(0) + mode.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {form.placementMode === "MANUAL" ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <p className="text-[11px] text-slate-500">Manual placement values must map cleanly to backend payload fields.</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Publisher Platforms</p>
                <div className="flex flex-wrap gap-3">
                  {publisherPlatformOptions.map((platform) => (
                    <label key={platform} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Checkbox checked={form.publisherPlatforms.includes(platform)} onCheckedChange={() => togglePlatform(platform)} />
                      {platform}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Facebook Positions</p>
                <div className="flex flex-wrap gap-3">
                  {fbPositionOptions.map((position) => (
                    <label key={position} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Checkbox checked={form.facebookPositions.includes(position)} onCheckedChange={() => toggleFbPos(position)} />
                      {position}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Instagram Positions</p>
                <div className="flex flex-wrap gap-3">
                  {igPositionOptions.map((position) => (
                    <label key={position} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <Checkbox checked={form.instagramPositions.includes(position)} onCheckedChange={() => toggleIgPos(position)} />
                      {position}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-1.5 opacity-50">
          <Label className="text-xs font-medium text-slate-700">Custom Audience <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-normal ml-1">Coming soon</span></Label>
          <Input disabled placeholder="Custom audience selection" className="h-9 text-sm" />
        </div>
      </CardContent>
    </Card>
  )
}
