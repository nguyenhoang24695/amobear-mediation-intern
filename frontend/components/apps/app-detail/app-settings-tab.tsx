"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { structureApi } from "@/lib/api/services"
import type { App } from "@/types/api"
import {
    Flame,
    Save,
    Trash2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Loader2,
    Info,
} from "lucide-react"

interface AppSettingsTabProps {
    app: App | null
    onAppUpdated?: (updated: Partial<App>) => void
}

interface ValidationResult {
    valid: boolean
    errors: string[]
    parsed?: Record<string, unknown>
}

function validateFirebaseParams(jsonStr: string): ValidationResult {
    if (!jsonStr.trim()) {
        return { valid: false, errors: ["JSON cannot be empty."] }
    }

    let parsed: Record<string, unknown>
    try {
        parsed = JSON.parse(jsonStr)
    } catch {
        return { valid: false, errors: ["Invalid JSON format. Please check the syntax."] }
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { valid: false, errors: ["firebase_params must be a JSON object."] }
    }

    const errors: string[] = []

    // firebaseAppKey is required
    if (!parsed.firebaseAppKey || typeof parsed.firebaseAppKey !== "string" || !parsed.firebaseAppKey.trim()) {
        errors.push('Missing required field "firebaseAppKey" (string).')
    }

    // serviceAccountJson is required and must be an object
    if (!parsed.serviceAccountJson) {
        errors.push('Missing required field "serviceAccountJson" (object).')
    } else if (typeof parsed.serviceAccountJson !== "object" || Array.isArray(parsed.serviceAccountJson)) {
        errors.push('"serviceAccountJson" must be a JSON object (not a string or array).')
    }

    if (errors.length > 0) {
        return { valid: false, errors, parsed }
    }

    return { valid: true, errors: [], parsed }
}

function prettifyJson(jsonStr: string): string {
    try {
        return JSON.stringify(JSON.parse(jsonStr), null, 2)
    } catch {
        return jsonStr
    }
}

export function AppSettingsTab({ app, onAppUpdated }: AppSettingsTabProps) {
    const { toast } = useToast()
    const [jsonValue, setJsonValue] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const [validation, setValidation] = useState<ValidationResult | null>(null)
    const [isDirty, setIsDirty] = useState(false)
    const [isConfigured, setIsConfigured] = useState(false)

    // Populate textarea with existing firebaseParams
    useEffect(() => {
        if (app?.firebaseParams) {
            setJsonValue(prettifyJson(app.firebaseParams))
            setIsConfigured(true)
            setIsDirty(false)
            setValidation(null)
        } else {
            setJsonValue("")
            setIsConfigured(false)
            setIsDirty(false)
            setValidation(null)
        }
    }, [app?.id, app?.firebaseParams])

    const handleJsonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setJsonValue(val)
        setIsDirty(true)
        // Live validate if user has typed something
        if (val.trim()) {
            setValidation(validateFirebaseParams(val))
        } else {
            setValidation(null)
        }
    }, [])

    const handleSave = async () => {
        if (!app) return

        const result = validateFirebaseParams(jsonValue)
        setValidation(result)
        if (!result.valid) {
            toast({
                title: "Validation Error",
                description: result.errors[0],
                variant: "destructive",
            })
            return
        }

        setIsSaving(true)
        try {
            const response = await structureApi.updateAppFirebaseParams(app.id, result.parsed!)
            toast({
                title: "Firebase config saved",
                description: "Firebase params have been updated successfully.",
            })
            // Update the local display
            setJsonValue(prettifyJson(JSON.stringify(result.parsed)))
            setIsDirty(false)
            setIsConfigured(true)
            onAppUpdated?.({ firebaseParams: response.firebaseParams })
        } catch (err: any) {
            toast({
                title: "Failed to save",
                description: err?.message || "An error occurred while saving Firebase params.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleClear = async () => {
        if (!app) return

        setIsClearing(true)
        try {
            await structureApi.updateAppFirebaseParams(app.id, null)
            toast({
                title: "Firebase config cleared",
                description: "Firebase params have been removed.",
            })
            setJsonValue("")
            setIsDirty(false)
            setValidation(null)
            setIsConfigured(false)
            onAppUpdated?.({ firebaseParams: null })
        } catch (err: any) {
            toast({
                title: "Failed to clear",
                description: err?.message || "An error occurred while clearing Firebase params.",
                variant: "destructive",
            })
        } finally {
            setIsClearing(false)
        }
    }

    const handlePrettify = () => {
        if (jsonValue.trim()) {
            try {
                const prettified = prettifyJson(jsonValue)
                setJsonValue(prettified)
            } catch {
                // Already invalid, validation will show error
            }
        }
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            {/* Firebase Configuration Card */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-50">
                            <Flame className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Firebase Configuration</h3>
                            <p className="text-sm text-slate-500">
                                Configure Firebase pipeline params for this app
                            </p>
                        </div>
                    </div>
                    <div>
                        {isConfigured ? (
                            <Badge className="bg-green-100 text-green-700 border-0 gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Configured
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500 gap-1.5">
                                <XCircle className="w-3.5 h-3.5" />
                                Not configured
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-4">
                    {/* Info */}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="text-sm text-blue-700">
                            <p>
                                Paste the full <code className="px-1 py-0.5 rounded bg-blue-100 text-xs font-mono">firebase_params</code> JSON below.
                                Required fields: <code className="px-1 py-0.5 rounded bg-blue-100 text-xs font-mono">firebaseAppKey</code> and{" "}
                                <code className="px-1 py-0.5 rounded bg-blue-100 text-xs font-mono">serviceAccountJson</code> (object).
                            </p>
                        </div>
                    </div>

                    {/* JSON Textarea */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-700">
                                firebase_params (JSON)
                            </label>
                            <button
                                type="button"
                                onClick={handlePrettify}
                                className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                disabled={!jsonValue.trim()}
                            >
                                Format JSON
                            </button>
                        </div>
                        <textarea
                            value={jsonValue}
                            onChange={handleJsonChange}
                            placeholder={`{
  "enabled": true,
  "firebaseAppKey": "com_company_appname",
  "serviceAccountJson": {
    "type": "service_account",
    "project_id": "...",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
    "client_email": "...@....iam.gserviceaccount.com",
    "client_id": "...",
    ...
  }
}`}
                            className="w-full min-h-[320px] p-4 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition-colors"
                            spellCheck={false}
                        />
                    </div>

                    {/* Validation Messages */}
                    {validation && !validation.valid && (
                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-red-50 border border-red-100">
                            {validation.errors.map((err, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {validation && validation.valid && isDirty && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            JSON is valid and contains all required fields.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                            {isConfigured && (
                                <Button
                                    variant="outline"
                                    className="h-9 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    onClick={handleClear}
                                    disabled={isClearing || isSaving}
                                >
                                    {isClearing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Clear Config
                                </Button>
                            )}
                        </div>
                        <Button
                            className="h-9 gap-2"
                            onClick={handleSave}
                            disabled={isSaving || isClearing || !jsonValue.trim() || (validation !== null && !validation.valid)}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Firebase Config
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
