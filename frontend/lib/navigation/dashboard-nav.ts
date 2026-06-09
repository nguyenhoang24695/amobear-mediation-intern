import {
  MOBILE_NAV_HUB_BY_MENU_LABEL,
  resolveMobileNavHubHref,
} from "@/lib/navigation/mobile-nav-hubs"

export type MobileMoreNavItem = {
  label: string
  href: string
  matchPrefixes: string[]
  /** When set, mobile may route to /nav/{slug} if 2+ sub-items are visible */
  hubSlug?: string
}

export const MOBILE_MORE_NAV_ITEMS: MobileMoreNavItem[] = [
  { label: "Alerts", href: "/alert-center", matchPrefixes: ["/alert-center", "/alerts", "/my-alerts"] },
  { label: "Waterfall", href: "/waterfall", matchPrefixes: ["/waterfall"] },
  { label: "Mediation", href: "/mediation", matchPrefixes: ["/mediation"] },
  {
    label: "Monitoring",
    href: "/monitoring/admob",
    hubSlug: "monitoring",
    matchPrefixes: ["/monitoring", "/nav/monitoring"],
  },
  { label: "Activity", href: "/activity-logs", matchPrefixes: ["/activity-logs"] },
  {
    label: "My Reports",
    href: "/reports/my-reports",
    matchPrefixes: ["/reports/my-reports"],
  },
  {
    label: "Meta Ads",
    href: "/meta-ads/campaigns",
    hubSlug: "meta-ads",
    matchPrefixes: ["/meta-ads", "/nav/meta-ads"],
  },
  {
    label: "TikTok Ads",
    href: "/tiktok-ads/campaigns",
    hubSlug: "tiktok-ads",
    matchPrefixes: ["/tiktok-ads", "/nav/tiktok-ads"],
  },
  {
    label: "AI Assistant",
    href: "/ai-assistant",
    hubSlug: "ai-assistant",
    matchPrefixes: ["/ai-assistant", "/ai-hub", "/agent-admin", "/nav/ai-assistant"],
  },
  { label: "Organizations", href: "/organizations", matchPrefixes: ["/organizations", "/my-organization", "/teams", "/team-members"] },
  { label: "Jobs", href: "/jobs", matchPrefixes: ["/jobs"] },
  { label: "Permissions", href: "/permissions", matchPrefixes: ["/permissions"] },
  { label: "Commission", href: "/commission", matchPrefixes: ["/commission"] },
  { label: "Data Accounts", href: "/data-accounts", matchPrefixes: ["/data-accounts"] },
  { label: "Data Sources", href: "/data-sources", matchPrefixes: ["/data-sources"] },
  {
    label: "WF Config",
    href: "/waterfall-rules",
    hubSlug: "wf-config",
    matchPrefixes: ["/waterfall-rules", "/waterfall-apply", "/nav/wf-config"],
  },
  {
    label: "Insights",
    href: "/insight-templates",
    hubSlug: "insights",
    matchPrefixes: ["/insight-templates", "/insight-generation", "/nav/insights"],
  },
  { label: "Profile", href: "/profile", matchPrefixes: ["/profile"] },
  { label: "Help", href: "/help", matchPrefixes: ["/help"] },
  { label: "Maintenance", href: "/settings/maintenance", matchPrefixes: ["/settings/maintenance"] },
]

export function resolveMobileMoreNavHref(label: string, fallbackHref: string): string {
  const slug = MOBILE_NAV_HUB_BY_MENU_LABEL[label]
  if (!slug) return fallbackHref
  return resolveMobileNavHubHref(slug) ?? fallbackHref
}

export function resolveMobileMoreNavItemHref(item: MobileMoreNavItem): string {
  if (item.hubSlug) {
    return resolveMobileNavHubHref(item.hubSlug) ?? item.href
  }
  return resolveMobileMoreNavHref(item.label, item.href)
}

const PAGE_TITLE_RULES: { match: (pathname: string) => boolean; title: string }[] = [
  { match: (p) => p.startsWith("/nav/reports"), title: "Reports" },
  { match: (p) => p.startsWith("/nav/meta-ads"), title: "Meta Ads" },
  { match: (p) => p.startsWith("/nav/tiktok-ads"), title: "TikTok Ads" },
  { match: (p) => p.startsWith("/nav/ai-assistant"), title: "AI Assistant" },
  { match: (p) => p.startsWith("/nav/wf-config"), title: "Waterfall Config" },
  { match: (p) => p.startsWith("/nav/insights"), title: "Insights" },
  { match: (p) => p.startsWith("/nav/"), title: "Menu" },
  { match: (p) => p === "/", title: "Dashboard" },
  { match: (p) => p.startsWith("/apps/") && p.includes("/playbook"), title: "Playbook" },
  { match: (p) => p.startsWith("/apps/"), title: "App Detail" },
  { match: (p) => p.startsWith("/apps"), title: "Apps" },
  { match: (p) => p.startsWith("/reports/my-reports"), title: "My Reports" },
  { match: (p) => p.startsWith("/reports/overview"), title: "Profit Overview" },
  { match: (p) => p.startsWith("/reports"), title: "Reports" },
  { match: (p) => p.startsWith("/alert-center/"), title: "Alert Detail" },
  { match: (p) => p.startsWith("/alert-center"), title: "Alert Center" },
  { match: (p) => p.startsWith("/waterfall-rules"), title: "Waterfall Config" },
  { match: (p) => p.startsWith("/waterfall-apply"), title: "Waterfall Automation" },
  { match: (p) => p.startsWith("/waterfall"), title: "Waterfall" },
  { match: (p) => p.startsWith("/mediation"), title: "Mediation Groups" },
  { match: (p) => p.startsWith("/monitoring/admob"), title: "AdMob Monitoring" },
  { match: (p) => p.startsWith("/monitoring"), title: "Monitoring" },
  { match: (p) => p.startsWith("/meta-ads/requests/create"), title: "Create Request" },
  { match: (p) => p.startsWith("/meta-ads/requests/"), title: "Meta Request" },
  { match: (p) => p.startsWith("/meta-ads/campaigns/"), title: "Campaign Detail" },
  { match: (p) => p.startsWith("/meta-ads/campaigns"), title: "Meta Campaigns" },
  { match: (p) => p.startsWith("/meta-ads/insights"), title: "Meta Insights" },
  { match: (p) => p.startsWith("/meta-ads/ad-accounts"), title: "Meta Ad Accounts" },
  { match: (p) => p.startsWith("/meta-ads/app-mappings"), title: "Meta App Mappings" },
  { match: (p) => p.startsWith("/meta-ads"), title: "Meta Ads" },
  { match: (p) => p.startsWith("/tiktok-ads/dashboard"), title: "TikTok Dashboard" },
  { match: (p) => p.startsWith("/tiktok-ads/campaigns/"), title: "TikTok Campaign" },
  { match: (p) => p.startsWith("/tiktok-ads/campaigns"), title: "TikTok Campaigns" },
  { match: (p) => p.startsWith("/tiktok-ads/requests/"), title: "TikTok Request" },
  { match: (p) => p.startsWith("/tiktok-ads/ad-accounts"), title: "TikTok Ad Accounts" },
  { match: (p) => p.startsWith("/tiktok-ads/app-mappings"), title: "TikTok App Mappings" },
  { match: (p) => p.startsWith("/tiktok-ads"), title: "TikTok Ads" },
  { match: (p) => p.startsWith("/ai-assistant/admin/"), title: "AI Admin" },
  { match: (p) => p.startsWith("/ai-assistant/library"), title: "AI Library" },
  { match: (p) => p.startsWith("/ai-assistant/knowledge-base"), title: "Knowledge Base" },
  { match: (p) => p.startsWith("/ai-assistant/usage"), title: "AI Usage" },
  { match: (p) => p.startsWith("/ai-assistant/settings"), title: "AI Settings" },
  { match: (p) => p.startsWith("/ai-assistant"), title: "AI Assistant" },
  { match: (p) => p.startsWith("/ai-hub"), title: "AI Hub" },
  { match: (p) => p.startsWith("/agent-admin"), title: "Agent Admin" },
  { match: (p) => p.startsWith("/organizations/"), title: "Organization" },
  { match: (p) => p.startsWith("/organizations"), title: "Organizations" },
  { match: (p) => p.startsWith("/my-organization"), title: "My Organization" },
  { match: (p) => p.startsWith("/team-members/"), title: "Team Member" },
  { match: (p) => p.startsWith("/team-members"), title: "Team Members" },
  { match: (p) => p.startsWith("/teams"), title: "Teams" },
  { match: (p) => p.startsWith("/jobs"), title: "Job Management" },
  { match: (p) => p.startsWith("/permissions"), title: "Permissions" },
  { match: (p) => p.startsWith("/commission"), title: "Commission" },
  { match: (p) => p.startsWith("/data-accounts/"), title: "Data Account" },
  { match: (p) => p.startsWith("/data-accounts"), title: "Data Accounts" },
  { match: (p) => p.startsWith("/data-sources/apple"), title: "Apple App Store" },
  { match: (p) => p.startsWith("/data-sources"), title: "Data Sources" },
  { match: (p) => p.startsWith("/insight-templates"), title: "Insight Templates" },
  { match: (p) => p.startsWith("/insight-generation"), title: "Insight Generation" },
  { match: (p) => p.startsWith("/settings/maintenance"), title: "Maintenance Management" },
  { match: (p) => p.startsWith("/settings/vcard-generator"), title: "vCard Generator" },
  { match: (p) => p.startsWith("/maintenance"), title: "System Maintenance" },
  { match: (p) => p.startsWith("/activity-logs"), title: "Activity Logs" },
  { match: (p) => p.startsWith("/profile"), title: "Profile" },
  { match: (p) => p.startsWith("/help"), title: "Help & Docs" },
]

export function getDashboardPageTitle(pathname: string): string {
  const rule = PAGE_TITLE_RULES.find((item) => item.match(pathname))
  return rule?.title ?? "Nexus"
}

function matchesNavPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true
  if (!pathname.startsWith(`${prefix}/`)) return false

  if (prefix === "/waterfall") {
    return !pathname.startsWith("/waterfall-rules") && !pathname.startsWith("/waterfall-apply")
  }

  return true
}

export function isMoreNavSectionActive(pathname: string, item: MobileMoreNavItem): boolean {
  return item.matchPrefixes.some((prefix) => matchesNavPrefix(pathname, prefix))
}

export function isAnyMoreNavSectionActive(pathname: string): boolean {
  return MOBILE_MORE_NAV_ITEMS.some((item) => isMoreNavSectionActive(pathname, item))
}
