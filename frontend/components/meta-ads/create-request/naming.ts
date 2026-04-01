"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { MetaAppMappingDto, MetaCreativeType, MetaRequestFormState } from "@/types/meta-ads"

function normalizeToken(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
}

function buildCountriesToken(countries: string[]) {
  const normalized = Array.from(new Set(countries.map((country) => country.trim().toUpperCase()).filter(Boolean)))
  if (normalized.length === 0) return ""
  if (normalized.length <= 3) return normalized.join("-")
  return `MULTI${normalized.length}`
}

function buildRegionToken(regionKeys: string[]) {
  const normalized = Array.from(new Set(regionKeys.map((region) => region.trim().toUpperCase()).filter(Boolean)))
  if (normalized.length === 0) return ""
  if (normalized.length <= 2) return normalized.join("-")
  return `REGION${normalized.length}`
}

function buildCityToken(cityTargets: MetaRequestFormState["cityTargets"]) {
  if (cityTargets.length === 0) return ""
  if (cityTargets.length === 1) {
    const city = cityTargets[0]
    return city.countryCode ? `${city.countryCode}-CITY` : "CITY"
  }
  return `CITY${cityTargets.length}`
}

export function buildGeoToken(form: MetaRequestFormState) {
  switch (form.geoMode) {
    case "GLOBAL":
      return "GLOBAL"
    case "REGION":
      return buildRegionToken(form.regionKeys)
    case "CITY":
      return buildCityToken(form.cityTargets)
    default:
      return buildCountriesToken(form.countries)
  }
}

export function buildGenderToken(gender: string) {
  switch (gender) {
    case "MALE":
      return "M"
    case "FEMALE":
      return "F"
    default:
      return "ALL"
  }
}

export function buildPlacementToken(form: MetaRequestFormState) {
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

export function buildAdSetName(form: MetaRequestFormState) {
  const geoToken = buildGeoToken(form)
  if (!geoToken) return ""

  const ageToken = `${form.ageMin}-${form.ageMax}`
  const genderToken = buildGenderToken(form.gender)
  const placementToken = buildPlacementToken(form)

  return [geoToken, ageToken, genderToken, placementToken].join("_")
}

function buildAppToken(selectedAppMapping?: MetaAppMappingDto | null, appRowId?: string) {
  const rawValue =
    selectedAppMapping?.appDisplayName?.trim()
    || selectedAppMapping?.appId?.trim()
    || (appRowId?.trim() ? `App${appRowId.trim()}` : "")

  return rawValue ? normalizeToken(rawValue) : ""
}

function buildPlatformToken(selectedAppMapping?: MetaAppMappingDto | null) {
  const normalized = selectedAppMapping?.platform?.trim().toUpperCase()
  if (normalized === "ANDROID" || normalized === "IOS") return normalized
  return normalized ? normalizeToken(normalized) : "APP"
}

function buildObjectiveToken(objective: string) {
  const normalized = objective.trim().toUpperCase()
  if (!normalized) return ""

  const explicitMap: Record<string, string> = {
    OUTCOME_APP_PROMOTION: "APPPROMO",
  }

  if (explicitMap[normalized]) return explicitMap[normalized]

  return normalizeToken(
    normalized
      .replace(/^OUTCOME_/, "")
      .replace(/^APP_/, "APP")
      .replaceAll("_", "")
  )
}

function buildCreativeTypeToken(creativeType: MetaCreativeType) {
  switch (creativeType) {
    case "SINGLE_VIDEO":
      return "VID"
    case "CAROUSEL_IMAGE":
      return "CAROUSEL"
    case "EXISTING_POST":
      return "POST"
    default:
      return "IMG"
  }
}

function buildDateToken() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${year}${month}${day}`
}

export function buildCampaignName(form: MetaRequestFormState, selectedAppMapping?: MetaAppMappingDto | null) {
  const appToken = buildAppToken(selectedAppMapping, form.appRowId)
  const geoToken = buildGeoToken(form)
  const platformToken = buildPlatformToken(selectedAppMapping)
  const objectiveToken = buildObjectiveToken(form.campaignObjective)
  const dateToken = buildDateToken()

  if (!appToken || !geoToken || !objectiveToken) return ""
  return [appToken, geoToken, platformToken, objectiveToken, dateToken].join("_")
}

export function buildCreativeName(form: MetaRequestFormState, selectedAppMapping?: MetaAppMappingDto | null) {
  const appToken = buildAppToken(selectedAppMapping, form.appRowId)
  const geoToken = buildGeoToken(form)
  const creativeTypeToken = buildCreativeTypeToken(form.creativeType)

  if (!appToken || !geoToken) return ""
  return [appToken, geoToken, creativeTypeToken, "v1"].join("_")
}

export function buildAdName(form: MetaRequestFormState) {
  const adSetToken = normalizeToken(form.adSetName)
  const creativeTypeToken = buildCreativeTypeToken(form.creativeType)

  if (!adSetToken) return ""
  return [adSetToken, creativeTypeToken].join("_")
}

export function useAutoGeneratedNameField(currentValue: string, generatedValue: string, onApply: (value: string) => void) {
  const [isAutoEnabled, setIsAutoEnabled] = useState(true)
  const lastGeneratedNameRef = useRef("")

  useEffect(() => {
    const currentName = currentValue.trim()
    const lastGeneratedName = lastGeneratedNameRef.current.trim()

    if (!currentName) {
      setIsAutoEnabled(true)
      return
    }

    if (currentName === generatedValue || (lastGeneratedName && currentName === lastGeneratedName)) {
      setIsAutoEnabled(true)
      return
    }

    setIsAutoEnabled(false)
  }, [currentValue, generatedValue])

  useEffect(() => {
    if (!isAutoEnabled) return

    const currentName = currentValue.trim()
    const lastGeneratedName = lastGeneratedNameRef.current.trim()
    const looksManual = !!currentName && currentName !== generatedValue && (!lastGeneratedName || currentName !== lastGeneratedName)

    if (looksManual) return

    if (!generatedValue) {
      lastGeneratedNameRef.current = ""
      return
    }

    if (currentName === generatedValue) {
      lastGeneratedNameRef.current = generatedValue
      return
    }

    lastGeneratedNameRef.current = generatedValue
    onApply(generatedValue)
  }, [currentValue, generatedValue, isAutoEnabled, onApply])

  const applyGeneratedName = () => {
    setIsAutoEnabled(true)
    lastGeneratedNameRef.current = generatedValue
    onApply(generatedValue)
  }

  const markManual = () => {
    setIsAutoEnabled(false)
  }

  return useMemo(() => ({
    isAutoEnabled,
    setIsAutoEnabled,
    applyGeneratedName,
    markManual,
  }), [isAutoEnabled])
}
