"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { getPersonas } from "@/lib/api/agent-specialized"

type Persona = { id: string; displayName: string; description?: string }

export default function AgentAdminPersonasPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Persona[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const data = (await getPersonas()) as Persona[]
        setRows(data)
      } catch (e: unknown) {
        toast({ title: "Failed to load personas", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" })
      }
    })()
  }, [toast])

  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Personas</h1>
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="rounded border bg-white p-3">
              <div className="font-medium">{p.displayName}</div>
              <div className="text-muted-foreground text-sm">{p.id}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
