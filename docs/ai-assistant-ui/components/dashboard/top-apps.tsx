"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"

const topApps = [
  {
    id: "1",
    rank: 1,
    name: "Puzzle Master Pro",
    icon: "/puzzle-game-app-icon.jpg",
    revenue: "$3,245.80",
    ecpm: "$5.82",
    trend: "up",
  },
  {
    id: "2",
    rank: 2,
    name: "Racing Legends",
    icon: "/racing-game-app-icon.jpg",
    revenue: "$2,847.50",
    ecpm: "$4.95",
    trend: "up",
  },
  {
    id: "3",
    rank: 3,
    name: "Word Quest",
    icon: "/word-game-app-icon.jpg",
    revenue: "$2,156.20",
    ecpm: "$4.28",
    trend: "down",
  },
  {
    id: "4",
    rank: 4,
    name: "Bubble Pop",
    icon: "/bubble-pop-game-app-icon.jpg",
    revenue: "$1,892.40",
    ecpm: "$3.95",
    trend: "up",
  },
  {
    id: "5",
    rank: 5,
    name: "Card Battle Arena",
    icon: "/card-game-app-icon.jpg",
    revenue: "$1,654.30",
    ecpm: "$4.12",
    trend: "down",
  },
]

export function TopApps() {
  return (
    <Card className="bg-white border-slate-200 shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">Top Apps by Revenue</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {topApps.map((app) => (
            <Link
              key={app.rank}
              href={`/apps/${app.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer block"
            >
              <span className="text-sm font-semibold text-slate-400 w-5">{app.rank}</span>
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={app.icon || "/placeholder.svg"} className="rounded-lg" />
                <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-xs">
                  {app.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate hover:text-blue-600 transition-colors">
                  {app.name}
                </p>
                <p className="text-xs text-slate-500">eCPM: {app.ecpm}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{app.revenue}</p>
                <div className="flex items-center justify-end gap-0.5">
                  {app.trend === "up" ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <Link href="/apps">
          <Button variant="link" className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700">
            View All 247 Apps
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
