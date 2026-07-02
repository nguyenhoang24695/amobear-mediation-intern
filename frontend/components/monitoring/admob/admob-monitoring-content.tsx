"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { AdmobMonitoringCompareTab } from "@/components/monitoring/admob/admob-monitoring-compare-tab"
import { AdmobMonitoringTrafficChartTab } from "@/components/monitoring/admob/admob-monitoring-traffic-chart-tab"

export function AdmobMonitoringContent() {
  const [activeTab, setActiveTab] = useState<"compare" | "traffic-chart">("compare")
  const [refreshToken, setRefreshToken] = useState(0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">AdMob Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Compare bronze sync mismatches and inspect AdMob mediation report API call traffic.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setRefreshToken((value) => value + 1)}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh tab
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "compare" | "traffic-chart")}>
        <TabsList className="grid h-auto w-full grid-cols-2 bg-muted p-1 sm:inline-flex sm:w-fit">
          <TabsTrigger value="compare" className="px-3 data-[state=active]:bg-background sm:px-4">
            Compare
          </TabsTrigger>
          <TabsTrigger value="traffic-chart" className="px-3 data-[state=active]:bg-background sm:px-4">
            Traffic Chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="mt-6">
          {activeTab === "compare" ? <AdmobMonitoringCompareTab key={`compare-${refreshToken}`} /> : null}
        </TabsContent>

        <TabsContent value="traffic-chart" className="mt-6">
          {activeTab === "traffic-chart" ? (
            <AdmobMonitoringTrafficChartTab key={`traffic-${refreshToken}`} />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
