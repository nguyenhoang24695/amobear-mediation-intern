"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Database, Server, HardDrive, ArrowRight, Layers } from "lucide-react"

const sources = [
  { name: "AdMob", color: "bg-green-500" },
  { name: "Firebase", color: "bg-amber-500" },
  { name: "AppLovin", color: "bg-blue-500" },
  { name: "AppMetrica", color: "bg-red-500" },
  { name: "XMP", color: "bg-blue-600" },
  { name: "Adjust", color: "bg-teal-500" },
  { name: "AppsFlyer", color: "bg-sky-600" },
  { name: "Qonversion", color: "bg-purple-500" },
  { name: "Meta Ads", color: "bg-indigo-600" },
]

const layers = [
  { name: "Bronze", description: "Raw Data", color: "bg-amber-600", textColor: "text-amber-600" },
  { name: "Silver", description: "Cleaned & Normalized", color: "bg-slate-400", textColor: "text-slate-500" },
  { name: "Gold", description: "Business-Ready", color: "bg-yellow-500", textColor: "text-yellow-600" },
]

export function ArchitectureDiagram() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">Data Pipeline Architecture</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="w-full justify-start text-slate-500 hover:text-slate-700 sm:w-auto sm:justify-center">
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4">
          <div className="overflow-x-auto rounded-lg bg-slate-50">
          <div className="flex min-w-[760px] items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-slate-500 mb-2">Data Sources</p>
              <div className="flex flex-col gap-1.5">
                {sources.map((source) => (
                  <div
                    key={source.name}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${source.color} text-white text-xs font-medium`}
                  >
                    <Database className="w-3 h-3" />
                    {source.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-400">API Pull</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-slate-500 mb-2">Ingestion</p>
              <div className="p-4 bg-white rounded-lg border-2 border-dashed border-slate-300 text-center">
                <Server className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">Hangfire</p>
                <p className="text-xs text-slate-500">Job Scheduler</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-400">Transform</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-slate-500 mb-2">Data Lake</p>
              <div className="flex flex-col gap-2">
                {layers.map((layer) => (
                  <div key={layer.name} className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-slate-200">
                    <div className={`w-3 h-3 rounded-full ${layer.color}`} />
                    <div>
                      <p className={`text-sm font-medium ${layer.textColor}`}>{layer.name}</p>
                      <p className="text-xs text-slate-500">{layer.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-400">Backup</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-medium text-slate-500 mb-2">Storage</p>
              <div className="p-4 bg-white rounded-lg border-2 border-dashed border-slate-300 text-center">
                <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">MinIO</p>
                <p className="text-xs text-slate-500">Object Storage</p>
              </div>
            </div>
          </div>
          </div>

          <div className="mt-4 p-4 bg-slate-100 rounded-lg">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 sm:gap-6">
              <div className="flex items-center gap-2 shrink-0">
                <Layers className="w-4 h-4" />
                <span className="font-medium">Data Flow:</span>
              </div>
              <span>Sources pull data via APIs every 15-60 min</span>
              <span>|</span>
              <span>Hangfire schedules and orchestrates jobs</span>
              <span>|</span>
              <span>Bronze-Silver-Gold medallion architecture</span>
              <span>|</span>
              <span>MinIO for raw file backup and archival</span>
              <span>|</span>
              <span>Qonversion IAP: webhook / GCS / crawler → Bronze → Gold (app_iap_daily, daily_overview)</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
