"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import type { Job } from "./job-management-content"

interface RunJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
}

export function RunJobDialog({ open, onOpenChange, job }: RunJobDialogProps) {
  const [running, setRunning] = useState(false)

  const handleRun = () => {
    setRunning(true)
    setTimeout(() => {
      setRunning(false)
      onOpenChange(false)
    }, 2000)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Run Job Now?</AlertDialogTitle>
          <AlertDialogDescription>
            {"This will trigger '"}{job.displayName}{"' immediately. The job will run outside of the scheduled time."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={(e) => {
              e.preventDefault()
              handleRun()
            }}
            disabled={running}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              "Run Now"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
