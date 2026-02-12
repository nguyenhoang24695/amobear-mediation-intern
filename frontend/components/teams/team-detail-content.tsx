"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users } from "lucide-react"
import Link from "next/link"

interface TeamDetailContentProps {
    orgId: string
    teamId: string
}

export function TeamDetailContent({ orgId, teamId }: TeamDetailContentProps) {
    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-6">
                <Link href={`/organizations/${orgId}`}>
                    <Button variant="ghost" className="mb-4 gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Organization
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
                        <p className="text-sm text-slate-500">Team ID: {teamId}</p>
                    </div>
                </div>
            </div>

            {/* Placeholder Content */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500">
                        Team members management will be implemented here.
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                        Organization ID: {orgId}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
