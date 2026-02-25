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
import { jobsTestApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { Job } from "./job-management-content"

interface RunJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
  onSuccess?: () => void
}

export function RunJobDialog({ open, onOpenChange, job, onSuccess }: RunJobDialogProps) {
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const handleRun = async () => {
    setRunning(true)
    try {
      // Map jobId to the job name format expected by the API
      // The API expects job names like "structure-sync", "performance-sync", etc.
      // Remove "-job" suffix if present
      const jobName = job.jobId.replace(/-job$/, "")
      
      await jobsTestApi.runJob(jobName)
      
      toast({
        title: "Job started",
        description: `${job.displayName || job.jobId} has been triggered successfully.`,
      })
      
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to run job",
        variant: "destructive",
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Run Job Now?</AlertDialogTitle>
          <AlertDialogDescription>
            {"This will trigger '"}{job.displayName || job.jobId}{"' immediately. The job will run outside of the scheduled time."}
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

