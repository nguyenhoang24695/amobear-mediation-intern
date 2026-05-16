"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { jobsTestApi } from "@/lib/api/services"
import { useToast } from "@/hooks/use-toast"
import type { Job } from "./job-management-content"
import {
  buildInitialParamValues,
  buildJobsTestQueryParams,
  defaultJobsTestPathFromJobId,
  manualRunFormIsValid,
  parseManualRunJson,
  type ParamValuesState,
} from "@/lib/jobs/manual-run"

interface RunJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job
  onSuccess?: () => void
}

export function RunJobDialog({ open, onOpenChange, job, onSuccess }: RunJobDialogProps) {
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const manualConfig = useMemo(() => parseManualRunJson(job.manualRunJson), [job.manualRunJson])
  const jobsTestPath = useMemo(() => defaultJobsTestPathFromJobId(job.jobId), [job.jobId])
  const paramFields = manualConfig?.queryParams ?? []

  const [values, setValues] = useState<ParamValuesState>({})

  useEffect(() => {
    if (!open) return
    setValues(buildInitialParamValues(parseManualRunJson(job.manualRunJson)?.queryParams))
  }, [open, job.jobId, job.manualRunJson])

  const formOk = manualRunFormIsValid(paramFields, values)

  const handleRun = async () => {
    if (!manualRunFormIsValid(paramFields, values)) {
      toast({
        title: "Thiếu tham số",
        description: "Vui lòng điền đủ các trường bắt buộc.",
        variant: "destructive",
      })
      return
    }

    const queryParams = buildJobsTestQueryParams(paramFields, values)
    if (queryParams === null) {
      toast({
        title: "Lỗi tham số",
        description: "Không tạo được query cho jobs-test.",
        variant: "destructive",
      })
      return
    }

    setRunning(true)
    try {
      if (manualConfig?.useAsyncRun) {
        const { runId, eventsUrl } = await jobsTestApi.startAsyncRun(jobsTestPath, queryParams)
        toast({
          title: "Đã xếp hàng chạy",
          description: `runId=${runId}. Stream log: ${eventsUrl}`,
        })
      } else {
        await jobsTestApi.runJob(jobsTestPath, queryParams)
        toast({
          title: "Job started",
          description: `${job.displayName || job.jobId} has been triggered successfully.`,
        })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to run job"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Run Job Now?</AlertDialogTitle>
          <AlertDialogDescription>
            {"This will trigger '"}
            {job.displayName || job.jobId}
            {
              "' immediately. The job will run outside of the scheduled time. Endpoint: POST /api/v1/jobs-test/"
            }
            {jobsTestPath}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {paramFields.length > 0 ? (
          <div className="space-y-4 py-2 text-left">
            {paramFields.map((f) => (
              <div key={f.key} className="space-y-2">
                {f.inputType === "boolean" ? (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id={`run-param-${f.key}`}
                      checked={values[f.key] === true || values[f.key] === "true"}
                      onCheckedChange={(c) =>
                        setValues((prev) => ({
                          ...prev,
                          [f.key]: c === true,
                        }))
                      }
                      disabled={running}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor={`run-param-${f.key}`} className="font-mono font-medium cursor-pointer">
                        {f.key}
                        {f.isRequired ? <span className="text-destructive"> *</span> : null}
                      </Label>
                    </div>
                  </div>
                ) : f.inputType === "integer" ? (
                  <>
                    <Label htmlFor={`run-param-${f.key}`} className="font-mono">
                      {f.key}
                      {f.isRequired ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    <Input
                      id={`run-param-${f.key}`}
                      type="number"
                      step={1}
                      value={String(values[f.key] ?? "")}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [f.key]: e.target.value,
                        }))
                      }
                      disabled={running}
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor={`run-param-${f.key}`} className="font-mono">
                      {f.key}
                      {f.isRequired ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    <Input
                      id={`run-param-${f.key}`}
                      type={f.inputType === "date" ? "date" : f.inputType === "datetime" ? "datetime-local" : "text"}
                      value={String(values[f.key] ?? "")}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [f.key]: e.target.value,
                        }))
                      }
                      disabled={running}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={(e) => {
              e.preventDefault()
              void handleRun()
            }}
            disabled={running || !formOk}
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
