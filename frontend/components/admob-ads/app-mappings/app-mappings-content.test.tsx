import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  AdmobAppMappingsContent,
  applyAdmobAccountAppToBindingForm,
  buildAdmobAppMappingGroups,
  filterAdmobAppMappingGroups,
  validateBindingStoreIdentity,
} from "./app-mappings-content"
import { useApi } from "@/hooks/use-api"

vi.mock("@/hooks/use-api", () => ({
  useApi: vi.fn(),
  invalidateCache: vi.fn(),
}))

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

vi.mock("@/lib/auth", () => ({
  hasScreenFunction: () => true,
}))

vi.mock("@/lib/api/admob-ads", () => ({
  admobAppMappingsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
}))

vi.mock("@/lib/api/services", () => ({
  structureApi: {
    getApps: vi.fn(),
  },
  dataAccountsApi: {
    getAll: vi.fn(),
  },
}))

describe("AdmobAppMappingsContent", () => {
  const mockMappings = () => [
    {
      id: 1,
      appRowId: 101,
      admobAccountId: 201,
      externalAppId: "ca-app-pub-1234~1111",
      externalAppName: "Android App Active",
      appId: "app-android-123",
      appDisplayName: "Android App Active",
      platform: "ANDROID",
      packageName: "com.example.active",
      bundleId: null,
      appStoreId: "com.example.active",
      normalizedStoreIdentifier: "com.example.active",
      storeIdentifierType: "package_name",
      downloadUrl: "https://play.google.com/store/apps/details?id=com.example.active",
      isActive: true,
      createdAt: "2026-06-02T09:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    },
    {
      id: 2,
      appRowId: 103,
      admobAccountId: 202,
      externalAppId: "ca-app-pub-5678~2222",
      externalAppName: "Android App Active 2",
      appId: "app-android-456",
      appDisplayName: "Android App Active",
      platform: "ANDROID",
      packageName: "com.example.active",
      bundleId: null,
      appStoreId: "com.example.active",
      normalizedStoreIdentifier: "com.example.active",
      storeIdentifierType: "package_name",
      downloadUrl: "https://play.google.com/store/apps/details?id=com.example.active",
      isActive: false,
      createdAt: "2026-06-02T10:30:00Z",
      updatedAt: "2026-06-02T11:00:00Z",
    },
    {
      id: 3,
      appRowId: 102,
      admobAccountId: 201,
      externalAppId: "ca-app-pub-ios~3333",
      externalAppName: "iOS App Inactive",
      appId: "app-ios-456",
      appDisplayName: "iOS App Inactive",
      platform: "IOS",
      packageName: null,
      bundleId: "com.example.inactive",
      appStoreId: "987654321",
      normalizedStoreIdentifier: "com.example.inactive",
      storeIdentifierType: "bundle_id",
      downloadUrl: "https://apps.apple.com/app/id987654321",
      isActive: false,
      createdAt: "2026-06-02T10:00:00Z",
      updatedAt: "2026-06-02T12:00:00Z",
    },
    {
      id: 4,
      appRowId: null,
      admobAccountId: 201,
      externalAppId: "ca-app-pub-unmapped~4444",
      externalAppName: "Unmapped App",
      appId: null,
      appDisplayName: null,
      platform: "ANDROID",
      packageName: null,
      bundleId: null,
      appStoreId: null,
      normalizedStoreIdentifier: null,
      storeIdentifierType: null,
      downloadUrl: null,
      isActive: true,
      createdAt: "2026-06-02T11:00:00Z",
      updatedAt: "2026-06-02T13:00:00Z",
    },
  ]

  const mockApps = () => ({
    apps: [
      {
        id: 101,
        appId: "app-android-123",
        displayName: "Android App Active",
        platform: "ANDROID",
        appStoreId: "com.example.active",
        name: "accounts/x/apps/app1",
      },
      {
        id: 102,
        appId: "app-ios-456",
        displayName: "iOS App Inactive",
        platform: "IOS",
        appStoreId: "987654321",
        name: "accounts/x/apps/app2",
      },
      {
        id: 103,
        appId: "app-android-456",
        displayName: "Android App Active",
        platform: "ANDROID",
        appStoreId: "com.example.active",
        name: "accounts/x/apps/app3",
      },
    ],
  })

  const mockAccounts = () => [
    {
      id: 201,
      network: "admob",
      name: "AdMob Test Account",
      accountId: "pub-1234567890",
    },
    {
      id: 202,
      network: "admob",
      name: "Second AdMob Account",
      accountId: "pub-2222222222",
    },
  ]

  const accountMap = () => new Map(mockAccounts().map((account) => [account.id, account]))

  const baseBindingForm = () => ({
    tempId: "new:test",
    appRowId: "",
    admobAccountId: "201",
    externalAppId: "",
    externalAppName: "",
    platform: "ANDROID",
    packageName: "",
    bundleId: "",
    appStoreId: "",
    downloadUrl: "",
    deepLinkUrl: "",
    storeUrlOverride: "",
    isActive: true,
  })

  it("groups mappings with different app rows but the same store identity into one app row", () => {
    const groups = buildAdmobAppMappingGroups(mockMappings() as any, mockApps().apps as any, accountMap() as any)

    const androidGroup = groups.find((group) => group.appRowId === 101)
    expect(groups).toHaveLength(3)
    expect(androidGroup?.bindings).toHaveLength(2)
    expect(androidGroup?.appRowIds).toEqual([101, 103])
    expect(androidGroup?.status).toBe("mixed")
    expect(androidGroup?.storeIdentifier).toBe("com.example.active")
    expect(androidGroup?.key).toBe("store:ANDROID:com.example.active")
  })

  it("uses mapped for a single active binding and mixed for groups with multiple bindings", () => {
    const singleGroups = buildAdmobAppMappingGroups([mockMappings()[0]] as any, mockApps().apps as any, accountMap() as any)
    expect(singleGroups[0].status).toBe("mapped")

    const groups = buildAdmobAppMappingGroups(mockMappings() as any, mockApps().apps as any, accountMap() as any)
    const mixedGroups = filterAdmobAppMappingGroups(groups, accountMap() as any, {
      search: "",
      platform: "all",
      status: "mixed",
    })

    expect(mixedGroups).toHaveLength(1)
    expect(mixedGroups[0].bindings).toHaveLength(2)
    expect(mixedGroups[0].storeIdentifier).toBe("com.example.active")
  })

  it("keeps unmapped bindings as independent rows and filters by child account/app id", () => {
    const groups = buildAdmobAppMappingGroups(mockMappings() as any, mockApps().apps as any, accountMap() as any)
    const unmapped = groups.find((group) => group.key === "unmapped:4")
    expect(unmapped?.status).toBe("unmapped")

    const byAccount = filterAdmobAppMappingGroups(groups, accountMap() as any, {
      search: "Second AdMob",
      platform: "all",
      status: "all",
    })
    expect(byAccount).toHaveLength(1)
    expect(byAccount[0].appRowId).toBe(101)

    const byAdmobAppId = filterAdmobAppMappingGroups(groups, accountMap() as any, {
      search: "ios~3333",
      platform: "all",
      status: "all",
    })
    expect(byAdmobAppId).toHaveLength(1)
    expect(byAdmobAppId[0].appRowId).toBe(102)
  })

  it("applies selected AdMob account app into a binding payload shape", () => {
    const android = applyAdmobAccountAppToBindingForm(baseBindingForm(), {
      id: 501,
      appId: "ca-app-pub-android~501",
      name: "accounts/pub/apps/501",
      displayName: "Android Pick",
      platform: "ANDROID",
      appStoreId: "com.example.same",
      createdAt: "",
      updatedAt: "",
    })
    expect(android.appRowId).toBe("501")
    expect(android.externalAppId).toBe("ca-app-pub-android~501")
    expect(android.externalAppName).toBe("Android Pick")
    expect(android.packageName).toBe("com.example.same")
    expect(android.appStoreId).toBe("")

    const ios = applyAdmobAccountAppToBindingForm(baseBindingForm(), {
      id: 502,
      appId: "ca-app-pub-ios~502",
      name: "accounts/pub/apps/502",
      displayName: "iOS Pick",
      platform: "IOS",
      appStoreId: "123456789",
      createdAt: "",
      updatedAt: "",
    })
    expect(ios.platform).toBe("IOS")
    expect(ios.appStoreId).toBe("123456789")
    expect(ios.packageName).toBe("")
  })

  it("validates that bindings in one group share the same store identity", () => {
    const first = applyAdmobAccountAppToBindingForm(baseBindingForm(), {
      id: 501,
      appId: "ca-app-pub-a~501",
      name: "App A",
      displayName: "App A",
      platform: "ANDROID",
      appStoreId: "com.example.same",
      createdAt: "",
      updatedAt: "",
    })
    const second = applyAdmobAccountAppToBindingForm({ ...baseBindingForm(), tempId: "new:second", admobAccountId: "202" }, {
      id: 502,
      appId: "ca-app-pub-b~502",
      name: "App B",
      displayName: "App B",
      platform: "ANDROID",
      appStoreId: "COM.EXAMPLE.SAME",
      createdAt: "",
      updatedAt: "",
    })
    expect(validateBindingStoreIdentity([first, second]).valid).toBe(true)

    const mismatch = applyAdmobAccountAppToBindingForm({ ...baseBindingForm(), tempId: "new:third", admobAccountId: "202" }, {
      id: 503,
      appId: "ca-app-pub-c~503",
      name: "App C",
      displayName: "App C",
      platform: "ANDROID",
      appStoreId: "com.example.other",
      createdAt: "",
      updatedAt: "",
    })
    const validation = validateBindingStoreIdentity([first, mismatch])
    expect(validation.valid).toBe(false)
    expect(validation.message).toBe("All AdMob bindings in one mapping must belong to the same store identity.")
  })

  it("renders grouped table with both AdMob bindings in one app row", () => {
    vi.mocked(useApi).mockImplementation(((fn: any, options?: any) => {
      if (options?.cacheKey === "admob-app-mappings:list") {
        return { data: mockMappings(), loading: false, error: null, refetch: vi.fn() } as any
      }
      if (options?.cacheKey === "structure-apps:list") {
        return { data: mockApps(), loading: false, error: null } as any
      }
      if (options?.cacheKey === "data-accounts:list") {
        return { data: mockAccounts(), loading: false, error: null } as any
      }
      return { data: null, loading: false, error: null } as any
    }) as any)

    const html = renderToStaticMarkup(<AdmobAppMappingsContent />)

    expect(html).toContain("AdMob App Mappings")
    expect(html).toContain("3 apps")
    expect(html.match(/Android App Active/g)?.length).toBe(1)
    expect(html).toContain("2 linked app IDs")
    expect(html).toContain("ca-app-pub-1234~1111")
    expect(html).toContain("ca-app-pub-5678~2222")
    expect(html).toContain("Second AdMob Account")
    expect(html).toContain("Mixed")
    expect(html).not.toContain("No linked app")
  })

  it("renders empty state when there are no mappings", () => {
    vi.mocked(useApi).mockImplementation(((fn: any, options?: any) => {
      if (options?.cacheKey === "admob-app-mappings:list") {
        return { data: [], loading: false, error: null, refetch: vi.fn() } as any
      }
      if (options?.cacheKey === "structure-apps:list") {
        return { data: mockApps(), loading: false, error: null } as any
      }
      if (options?.cacheKey === "data-accounts:list") {
        return { data: mockAccounts(), loading: false, error: null } as any
      }
      return { data: null, loading: false, error: null } as any
    }) as any)

    const html = renderToStaticMarkup(<AdmobAppMappingsContent />)
    expect(html).toContain("No app mappings found.")
  })

  it("renders loading state", () => {
    vi.mocked(useApi).mockImplementation(((fn: any, options?: any) => {
      if (options?.cacheKey === "admob-app-mappings:list") {
        return { data: null, loading: true, error: null, refetch: vi.fn() } as any
      }
      return { data: null, loading: false, error: null } as any
    }) as any)

    const html = renderToStaticMarkup(<AdmobAppMappingsContent />)
    expect(html).toContain("Loading app mappings...")
  })
})
