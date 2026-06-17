import type { ElementType } from "react"
import {
  Apple,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Contact,
  CreditCard,
  Database,
  FileText,
  Gauge,
  GitMerge,
  KeyRound,
  Layers,
  Library,
  ListChecks,
  Megaphone,
  Music2,
  PieChart,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Zap,
  BadgePercent,
  Wrench,
} from "lucide-react"
import { getCurrentUser, hasScreenFunction } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/enums/user-role"

export type MobileNavHubItem = {
  label: string
  href: string
  icon: ElementType
  description?: string
  isShow?: boolean | (() => boolean)
  isNew?: boolean
}

export type MobileNavHub = {
  slug: string
  title: string
  description?: string
  items: MobileNavHubItem[]
}

function hasMetaIntegrationListAccess(): boolean {
  return hasScreenFunction("s-meta-accounts", "view") || (
    hasScreenFunction("s-meta-accounts", "create") &&
    hasScreenFunction("s-meta-accounts", "edit")
  )
}

function isHubItemVisible(item: MobileNavHubItem): boolean {
  if (item.isShow === undefined) return true
  return typeof item.isShow === "function" ? item.isShow() : item.isShow
}

export function getVisibleMobileNavHubItems(hub: MobileNavHub): MobileNavHubItem[] {
  return hub.items.filter(isHubItemVisible)
}

export function getMobileNavHub(slug: string): MobileNavHub | null {
  return MOBILE_NAV_HUBS[slug] ?? null
}

/** If hub has 2+ visible items → hub route; 1 item → direct href; 0 → null */
export function resolveMobileNavHubHref(slug: string): string | null {
  const hub = getMobileNavHub(slug)
  if (!hub) return null
  const visible = getVisibleMobileNavHubItems(hub)
  if (visible.length >= 2) return `/nav/${slug}`
  if (visible.length === 1) return visible[0].href
  return null
}

export const MOBILE_NAV_HUB_BY_MENU_LABEL: Record<string, string> = {
  Reports: "reports",
  "Meta Ads": "meta-ads",
  "TikTok Ads": "tiktok-ads",
  "AI Assistant": "ai-assistant",
  "WF Config": "wf-config",
}

export const MOBILE_NAV_HUBS: Record<string, MobileNavHub> = {
  reports: {
    slug: "reports",
    title: "Reports",
    description: "Choose a report view",
    items: [
      {
        label: "Overview Report",
        href: "/reports/overview",
        icon: BarChart3,
        description: "Profit overview by team and app",
        isShow: () => hasScreenFunction("s-reports", "view"),
      },
      {
        label: "Reports",
        href: "/reports",
        icon: FileText,
        description: "Custom and saved reports",
        isShow: () => hasScreenFunction("s-reports", "view"),
      },
      {
        label: "My Reports",
        href: "/reports/my-reports",
        icon: PieChart,
        description: "Adjust-style flat report builder",
        isShow: () => hasScreenFunction("s-my-reports", "view"),
      },
      {
        label: "Waterfall Report",
        href: "/reports/waterfall",
        icon: BarChart3,
        description: "SoW and network performance by app",
        isShow: () => hasScreenFunction("s-reports", "view"),
      },
    ],
  },
  "meta-ads": {
    slug: "meta-ads",
    title: "Meta Ads",
    description: "Campaigns, accounts, and requests",
    items: [
      {
        label: "Insights",
        href: "/meta-ads/insights",
        icon: BarChart3,
        isShow: () => hasScreenFunction("s-meta-campaigns", "view"),
      },
      {
        label: "Requests",
        href: "/meta-ads/requests",
        icon: FileText,
        isShow: () =>
          ["view", "create", "approve", "execute", "retry"].some((fn) =>
            hasScreenFunction("s-meta-requests", fn),
          ),
      },
      {
        label: "Campaigns",
        href: "/meta-ads/campaigns",
        icon: Megaphone,
        isShow: () => ["view", "edit"].some((fn) => hasScreenFunction("s-meta-campaigns", fn)),
      },
      {
        label: "Ad Accounts",
        href: "/meta-ads/ad-accounts",
        icon: CreditCard,
        isShow: () =>
          ["view", "create", "edit", "disable-enable"].some((fn) =>
            hasScreenFunction("s-meta-accounts", fn),
          ),
      },
      {
        label: "App Mappings",
        href: "/meta-ads/app-mappings",
        icon: GitMerge,
        isShow: () =>
          ["view", "create", "edit", "disable-enable"].some((fn) =>
            hasScreenFunction("s-meta-accounts", fn),
          ),
      },
    ],
  },
  "tiktok-ads": {
    slug: "tiktok-ads",
    title: "TikTok Ads",
    description: "TikTok campaigns and accounts",
    items: [
      {
        label: "Dashboard",
        href: "/tiktok-ads/dashboard",
        icon: BarChart3,
        isNew: true,
        isShow: () => hasScreenFunction("s-tiktok-campaigns", "view"),
      },
      {
        label: "Ad Accounts",
        href: "/tiktok-ads/ad-accounts",
        icon: CreditCard,
        isShow: () =>
          ["view", "create", "edit", "disable-enable"].some((fn) =>
            hasScreenFunction("s-tiktok-accounts", fn),
          ),
      },
      {
        label: "App Mappings",
        href: "/tiktok-ads/app-mappings",
        icon: GitMerge,
        isShow: () =>
          ["view", "create", "edit", "disable-enable"].some((fn) =>
            hasScreenFunction("s-tiktok-accounts", fn),
          ),
      },
      {
        label: "Requests",
        href: "/tiktok-ads/requests",
        icon: FileText,
        isShow: () =>
          ["view", "create", "approve", "execute", "retry"].some((fn) =>
            hasScreenFunction("s-tiktok-requests", fn),
          ),
      },
      {
        label: "Campaigns",
        href: "/tiktok-ads/campaigns",
        icon: Megaphone,
        isShow: () => hasScreenFunction("s-tiktok-campaigns", "view"),
      },
    ],
  },
  "ai-assistant": {
    slug: "ai-assistant",
    title: "AI Assistant",
    description: "Chat, library, and admin tools",
    items: [
      {
        label: "Chat",
        href: "/ai-assistant",
        icon: Bot,
        isShow: () => hasScreenFunction("s-ai-assistant", "chat"),
      },
      {
        label: "Library",
        href: "/ai-assistant/library",
        icon: Library,
        isShow: () => hasScreenFunction("s-ai-assistant", "library"),
      },
      {
        label: "Knowledge Base",
        href: "/ai-assistant/knowledge-base",
        icon: BookOpen,
        isShow: () => hasScreenFunction("s-ai-assistant", "knowledge-base"),
      },
      {
        label: "AI Usage",
        href: "/ai-assistant/usage",
        icon: PieChart,
        isShow: () => hasScreenFunction("s-ai-assistant", "usage"),
      },
      {
        label: "Quota",
        href: "/ai-assistant/admin/quota",
        icon: Gauge,
        isShow: () => hasScreenFunction("s-ai-assistant", "quota"),
      },
      {
        label: "Role Prompts",
        href: "/ai-assistant/admin/role-prompts",
        icon: Shield,
        isShow: () => hasScreenFunction("s-ai-assistant", "role-prompts"),
      },
      {
        label: "Metrics Catalog",
        href: "/ai-assistant/admin/metrics-catalog",
        icon: ListChecks,
        isShow: () => hasScreenFunction("s-ai-assistant", "metrics-catalog"),
      },
      {
        label: "System Config",
        href: "/ai-assistant/admin/system-config",
        icon: Zap,
        isShow: () => hasScreenFunction("s-ai-assistant", "system-config"),
      },
      {
        label: "Settings",
        href: "/ai-assistant/settings",
        icon: Settings,
        isShow: () => hasScreenFunction("s-ai-assistant", "settings"),
      },
    ],
  },
  "wf-config": {
    slug: "wf-config",
    title: "Waterfall Config",
    description: "Rules and automation",
    items: [
      {
        label: "Waterfall Config",
        href: "/waterfall-rules",
        icon: ListChecks,
        isShow: () =>
          hasScreenFunction("s-waterfall-rules", "view-configs") ||
          hasScreenFunction("s-waterfall-rules", "view-rules"),
      },
      {
        label: "Waterfall Automation",
        href: "/waterfall-apply",
        icon: Layers,
        isNew: true,
        isShow: () => hasScreenFunction("s-waterfall-apply", "view"),
      },
    ],
  },
  insights: {
    slug: "insights",
    title: "Insights",
    description: "AI insight templates and generation",
    items: [
      {
        label: "AI Insight Templates",
        href: "/insight-templates",
        icon: Sparkles,
        isShow: () => hasScreenFunction("s-insight-settings", "manage-templates"),
      },
      {
        label: "Insight Generation",
        href: "/insight-generation",
        icon: Zap,
        isShow: () => hasScreenFunction("s-insight-settings", "view-generation"),
      },
    ],
  },
  settings: {
    slug: "settings",
    title: "Settings",
    description: "Organization and platform settings",
    items: [
      {
        label: "Organizations",
        href: "/organizations",
        icon: Building2,
        isShow: () => hasScreenFunction("s-orgs", "view"),
      },
      {
        label: "Job Management",
        href: "/jobs",
        icon: Briefcase,
        isShow: () => hasScreenFunction("s-jobs", "view"),
      },
      {
        label: "Waterfall Config",
        href: "/waterfall-rules",
        icon: ListChecks,
        isShow: () =>
          hasScreenFunction("s-waterfall-rules", "view-configs") ||
          hasScreenFunction("s-waterfall-rules", "view-rules"),
      },
      {
        label: "Waterfall Automation",
        href: "/waterfall-apply",
        icon: Layers,
        isNew: true,
        isShow: () => hasScreenFunction("s-waterfall-apply", "view"),
      },
      {
        label: "Permissions",
        href: "/permissions",
        icon: Shield,
        isShow: () => hasScreenFunction("s-permissions", "view"),
      },
      {
        label: "Commission",
        href: "/commission",
        icon: BadgePercent,
        isShow: () =>
          hasScreenFunction("s-commission", "view") || hasScreenFunction("s-commission", "manage"),
      },
      {
        label: "Data Accounts",
        href: "/data-accounts",
        icon: KeyRound,
        isShow: () =>
          hasScreenFunction("s-data-accounts", "view") ||
          hasMetaIntegrationListAccess() ||
          hasScreenFunction("s-tiktok-accounts", "view"),
      },
      {
        label: "Data Sources",
        href: "/data-sources",
        icon: Database,
        isShow: () => hasScreenFunction("s-data-sources", "view"),
      },
      {
        label: "Apple App Store",
        href: "/data-sources/apple",
        icon: Apple,
        isShow: () => hasScreenFunction("s-data-accounts", "view"),
      },
      {
        label: "vCard Generator",
        href: "/settings/vcard-generator",
        icon: Contact,
        isNew: true,
        isShow: true,
      },
      {
        label: "Maintenance Management",
        href: "/settings/maintenance",
        icon: Wrench,
        isShow: () => isSuperAdmin(getCurrentUser()?.role),
      },
      {
        label: "AI Insight Templates",
        href: "/insight-templates",
        icon: Sparkles,
        isShow: () => hasScreenFunction("s-insight-settings", "manage-templates"),
      },
      {
        label: "Insight Generation",
        href: "/insight-generation",
        icon: Zap,
        isShow: () => hasScreenFunction("s-insight-settings", "view-generation"),
      },
    ],
  },
  monitoring: {
    slug: "monitoring",
    title: "Monitoring",
    description: "Platform monitoring tools",
    items: [
      {
        label: "AdMob",
        href: "/monitoring/admob",
        icon: Smartphone,
        isShow: () => hasScreenFunction("s-monitoring-admob", "view"),
      },
    ],
  },
  "admob-ads": {
    slug: "admob-ads",
    title: "AdMob Ads",
    items: [
      {
        label: "App Mappings",
        href: "/admob-ads/app-mappings",
        icon: GitMerge,
        isShow: () => ["view", "create", "edit", "disable-enable"].some((fn) => hasScreenFunction("s-admob-app-mappings", fn)),
      },
    ],
  },
}

/** Prefixes used to highlight hub parent nav when a child route is active */
export function getMobileNavHubMatchPrefixes(slug: string): string[] {
  const hub = getMobileNavHub(slug)
  if (!hub) return [`/nav/${slug}`]
  const prefixes = new Set<string>([`/nav/${slug}`])
  for (const item of getVisibleMobileNavHubItems(hub)) {
    prefixes.add(item.href.split("?")[0])
  }
  return [...prefixes]
}

export function isMobileNavHubSectionActive(pathname: string, slug: string): boolean {
  return getMobileNavHubMatchPrefixes(slug).some((prefix) => {
    if (pathname === prefix) return true
    if (!pathname.startsWith(`${prefix}/`)) return false
    if (prefix === "/waterfall") {
      return !pathname.startsWith("/waterfall-rules") && !pathname.startsWith("/waterfall-apply")
    }
    return true
  })
}
