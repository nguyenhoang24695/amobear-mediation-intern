"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, AlertTriangle, RefreshCw, Zap, CheckCircle } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "waterfall",
    icon: Settings,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    message: "Waterfall updated for 'Puzzle Master Pro'",
    detail: "Priority changed: Unity → AdMob",
    time: "2 min ago",
    link: "/mediation/1",
  },
  {
    id: 2,
    type: "alert",
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    message: "Low fill rate alert resolved",
    detail: "Racing Legends - Fill rate recovered to 92%",
    time: "15 min ago",
    link: "/alert-center/5",
  },
  {
    id: 3,
    type: "sync",
    icon: RefreshCw,
    color: "text-green-500",
    bgColor: "bg-green-50",
    message: "App data synced successfully",
    detail: "12 apps updated from AdMob",
    time: "32 min ago",
    link: "/apps",
  },
  {
    id: 4,
    type: "optimization",
    icon: Zap,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    message: "Auto-optimization applied",
    detail: "eCPM improved by 8% for Word Quest",
    time: "1 hour ago",
    link: "/apps/3",
  },
  {
    id: 5,
    type: "resolved",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50",
    message: "SDK integration verified",
    detail: "All networks operational",
    time: "2 hours ago",
  },
]

export function RecentActivities() {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-3 bottom-3 w-px bg-slate-200" />

          <div className="space-y-4">
            {activities.map((activity) => {
              const Content = (
                <div key={activity.id} className="flex gap-4 relative">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${activity.bgColor} flex items-center justify-center z-10`}>
                    <activity.icon className={`w-5 h-5 ${activity.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm font-medium text-slate-900">{activity.message}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{activity.detail}</p>
                  </div>

                  {/* Time */}
                  <span className="text-xs text-slate-400 whitespace-nowrap pt-1">{activity.time}</span>
                </div>
              )

              return activity.link ? (
                <Link
                  key={activity.id}
                  href={activity.link}
                  className="block hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors"
                >
                  {Content}
                </Link>
              ) : (
                <div key={activity.id}>{Content}</div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
