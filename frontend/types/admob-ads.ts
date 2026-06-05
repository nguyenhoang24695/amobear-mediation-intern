export interface AdmobAppMappingDto {
  id: number
  externalAppId: string
  externalAppName?: string | null
  admobAccountId?: number | null
  appRowId?: number | null
  appId?: string | null
  appDisplayName?: string | null
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  normalizedStoreIdentifier?: string | null
  storeIdentifierType?: string | null
  downloadUrl?: string | null
  deepLinkUrl?: string | null
  storeUrlOverride?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertAdmobAppMappingRequestDto {
  externalAppId: string
  externalAppName?: string | null
  admobAccountId?: number | null
  appRowId?: number | null
  platform?: string | null
  packageName?: string | null
  bundleId?: string | null
  appStoreId?: string | null
  downloadUrl?: string | null
  deepLinkUrl?: string | null
  storeUrlOverride?: string | null
  isActive?: boolean | null
}
