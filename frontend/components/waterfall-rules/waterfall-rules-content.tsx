"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { NoPermissionView } from "@/components/shared/no-permission-view"
import { hasScreenFunction } from "@/lib/auth"
import { ListChecks, Settings } from "lucide-react"
import { WaterfallConfigsPanel } from "./waterfall-configs-panel"
import { WaterfallRulesPanel } from "./waterfall-rules-panel"

const SCREEN_WATERFALL_RULES = "s-waterfall-rules"
const FN_VIEW_CONFIGS = "view-configs"
const FN_MANAGE_CONFIGS = "manage-configs"
const FN_VIEW_RULES = "view-rules"
const FN_MANAGE_RULES = "manage-rules"
const SCREEN_WATERFALL_APPLY = "s-waterfall-apply"
const FN_MANAGE_APPLY = "manage"

export function WaterfallRulesContent() {
  const canViewConfigs = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_VIEW_CONFIGS)
  const canManageConfigs = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_MANAGE_CONFIGS)
  const canViewRules = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_VIEW_RULES)
  const canManageRules = hasScreenFunction(SCREEN_WATERFALL_RULES, FN_MANAGE_RULES)
  const canManageApplyPolicies = hasScreenFunction(SCREEN_WATERFALL_APPLY, FN_MANAGE_APPLY)
  const [activeTab, setActiveTab] = useState<"configs" | "rules">(canViewConfigs ? "configs" : "rules")

  if (!canViewConfigs && !canViewRules) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 lg:text-3xl text-balance">Waterfall Rules</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage reusable rule configs, rule groups, and recommendation rules for waterfall optimization.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {canViewConfigs && (
            <button
              type="button"
              onClick={() => setActiveTab("configs")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "configs"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Settings className="h-4 w-4" />
              Configs
              <Badge
                variant="secondary"
                className={`px-1.5 py-0 text-xs ${
                  activeTab === "configs" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                Config Master
              </Badge>
            </button>
          )}
          {canViewRules && (
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "rules"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <ListChecks className="h-4 w-4" />
              Rules
            </button>
          )}
        </div>
      </div>

      {activeTab === "configs" ? (
        <WaterfallConfigsPanel
          canManageConfigs={canManageConfigs}
          canManageApplyPolicies={canManageApplyPolicies}
        />
      ) : (
        <WaterfallRulesPanel canManageRules={canManageRules} />
      )}
    </div>
  )
}
