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
      <div className="space-y-1">
        <h1 className="text-balance text-2xl font-bold text-foreground lg:text-3xl">Waterfall Config</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage reusable rule configs, rule groups, and recommendation rules for waterfall optimization.
        </p>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-0">
          {canViewConfigs && (
            <button
              type="button"
              onClick={() => setActiveTab("configs")}
              className={`flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:min-w-0 ${
                activeTab === "configs"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              Configs
              <Badge
                variant="secondary"
                className={`px-1.5 py-0 text-xs ${
                  activeTab === "configs" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
              className={`flex min-w-max items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:min-w-0 ${
                activeTab === "rules"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListChecks className="h-4 w-4" />
              Rules
            </button>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {activeTab === "configs" ? (
          <WaterfallConfigsPanel
            canManageConfigs={canManageConfigs}
            canManageApplyPolicies={canManageApplyPolicies}
          />
        ) : (
          <WaterfallRulesPanel canManageRules={canManageRules} />
        )}
      </div>
    </div>
  )
}
