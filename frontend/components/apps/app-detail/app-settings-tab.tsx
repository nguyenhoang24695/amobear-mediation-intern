"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
    Upload,
    X,
} from "lucide-react"

interface AppSettingsTabProps {
    app: App | null
    onAppUpdated?: (updated: Partial<App>) => void
}

type ServiceAccountJson = Record<string, unknown>
type ServiceAccountSource = "stored" | "uploaded" | null

interface FirebaseFormState {
    enabled: boolean
    firebaseAppKey: string
    serviceAccountJson: ServiceAccountJson | null
    serviceAccountFileName: string
    serviceAccountSource: ServiceAccountSource
}

interface ValidationResult {
    valid: boolean
    errors: string[]
}

const REQUIRED_SERVICE_ACCOUNT_FIELDS = [
    "project_id",
    "private_key_id",
    "private_key",
    "client_email",
    "client_id",
    "auth_uri",
    "token_uri",
    "auth_provider_x509_cert_url",
    "client_x509_cert_url",
] as const

const EMPTY_FORM_STATE: FirebaseFormState = {
    enabled: true,
    firebaseAppKey: "",
    serviceAccountJson: null,
    serviceAccountFileName: "",
    serviceAccountSource: null,
}

function isRecord(value: unknown): value is ServiceAccountJson {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeServiceAccountJson(value: unknown): ServiceAccountJson | null {
    if (isRecord(value)) {
        return value
    }

    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value)
            return isRecord(parsed) ? parsed : null
        } catch {
            return null
        }
    }

    return null
}

function parseFirebaseParams(firebaseParams?: string | null): FirebaseFormState {
    if (!firebaseParams?.trim()) {
        return EMPTY_FORM_STATE
    }

    try {
        const parsed = JSON.parse(firebaseParams)
        if (!isRecord(parsed)) {
            return EMPTY_FORM_STATE
        }

        const serviceAccountJson = normalizeServiceAccountJson(parsed["serviceAccountJson"])

        return {
            enabled: typeof parsed["enabled"] === "boolean" ? parsed["enabled"] : true,
            firebaseAppKey: typeof parsed["firebaseAppKey"] === "string" ? parsed["firebaseAppKey"] : "",
            serviceAccountJson,
            serviceAccountFileName: serviceAccountJson ? "service-account.json" : "",
            serviceAccountSource: serviceAccountJson ? "stored" : null,
        }
    } catch {
        return EMPTY_FORM_STATE
    }
}

function validateFirebaseForm(state: FirebaseFormState, fileUploadError?: string | null): ValidationResult {
    const errors: string[] = []

    if (!state.firebaseAppKey.trim()) {
        errors.push("Firebase app key is required.")
    }

    if (fileUploadError) {
        errors.push(fileUploadError)
    } else if (!state.serviceAccountJson) {
        errors.push("Service account JSON file is required.")
    } else {
        errors.push(...validateServiceAccountJson(state.serviceAccountJson))
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

function getStringField(value: ServiceAccountJson | null, key: string): string | null {
    const fieldValue = value?.[key]
    return typeof fieldValue === "string" ? fieldValue : null
}

function isValidHttpsUrl(value: string): boolean {
    try {
        const url = new URL(value)
        return url.protocol === "https:"
    } catch {
        return false
    }
}

function validateServiceAccountJson(value: ServiceAccountJson): string[] {
    const errors: string[] = []
    const type = getStringField(value, "type")

    if (type !== "service_account") {
        errors.push('Service account "type" must be "service_account".')
    }

    for (const field of REQUIRED_SERVICE_ACCOUNT_FIELDS) {
        const fieldValue = getStringField(value, field)
        if (!fieldValue?.trim()) {
            errors.push(`Service account field "${field}" is required.`)
        }
    }

    const privateKey = getStringField(value, "private_key")
    if (
        privateKey &&
        (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----"))
    ) {
        errors.push('Service account field "private_key" must contain a valid PEM private key.')
    }

    const clientEmail = getStringField(value, "client_email")
    if (clientEmail && (!clientEmail.includes("@") || !clientEmail.toLowerCase().endsWith(".gserviceaccount.com"))) {
        errors.push('Service account field "client_email" must be a Google service account email.')
    }

    for (const field of ["auth_uri", "token_uri", "auth_provider_x509_cert_url", "client_x509_cert_url"] as const) {
        const fieldValue = getStringField(value, field)
        if (fieldValue && !isValidHttpsUrl(fieldValue)) {
            errors.push(`Service account field "${field}" must be a valid HTTPS URL.`)
        }
    }

    return errors
}

export function AppSettingsTab({ app, onAppUpdated }: AppSettingsTabProps) {
    const { toast } = useToast()
    const [formState, setFormState] = useState<FirebaseFormState>(EMPTY_FORM_STATE)
    const [fileInputKey, setFileInputKey] = useState(0)
    const [fileUploadError, setFileUploadError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [isConfigured, setIsConfigured] = useState(false)

    const validation = validateFirebaseForm(formState, fileUploadError)
    const showValidation = isDirty || fileUploadError !== null || (isConfigured && !validation.valid)
    const serviceAccountProjectId = getStringField(formState.serviceAccountJson, "project_id")
    const serviceAccountEmail = getStringField(formState.serviceAccountJson, "client_email")

    useEffect(() => {
        setFormState(parseFirebaseParams(app?.firebaseParams))
        setIsConfigured(Boolean(app?.firebaseParams?.trim()))
        setFileUploadError(null)
        setIsDirty(false)
        setFileInputKey((prev) => prev + 1)
    }, [app?.id, app?.firebaseParams])

    const handleEnabledChange = (checked: boolean) => {
        setFormState((prev) => ({ ...prev, enabled: checked }))
        setIsDirty(true)
    }

    const handleFirebaseAppKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormState((prev) => ({ ...prev, firebaseAppKey: e.target.value }))
        setIsDirty(true)
    }

    const handleServiceAccountUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const fileText = await file.text()
            let parsed: unknown
            try {
                parsed = JSON.parse(fileText)
            } catch {
                throw new Error("Service account file is not a valid JSON file.")
            }

            if (!isRecord(parsed)) {
                throw new Error("Service account file is not in the correct JSON object format.")
            }

            const serviceAccountErrors = validateServiceAccountJson(parsed)
            if (serviceAccountErrors.length > 0) {
                throw new Error(`Service account file format is invalid: ${serviceAccountErrors[0]}`)
            }

            setFormState((prev) => ({
                ...prev,
                serviceAccountJson: parsed,
                serviceAccountFileName: file.name,
                serviceAccountSource: "uploaded",
            }))
            setFileUploadError(null)
            setIsDirty(true)
        } catch (err: any) {
            const message = err?.message || "The selected file is not a valid JSON object."
            setFileUploadError(message)
            setIsDirty(true)
            setFileInputKey((prev) => prev + 1)
            toast({
                title: "Invalid service account file",
                description: message,
                variant: "destructive",
            })
        }
    }

    const handleRemoveServiceAccount = () => {
        setFormState((prev) => ({
            ...prev,
            serviceAccountJson: null,
            serviceAccountFileName: "",
            serviceAccountSource: null,
        }))
        setFileUploadError(null)
        setIsDirty(true)
        setFileInputKey((prev) => prev + 1)
    }

    const handleSave = async () => {
        if (!app) return

        if (!validation.valid) {
            toast({
                title: "Validation Error",
                description: validation.errors[0],
                variant: "destructive",
            })
            return
        }

        setIsSaving(true)
        try {
            const response = await structureApi.updateAppFirebaseParams(app.id, {
                enabled: formState.enabled,
                firebaseAppKey: formState.firebaseAppKey.trim(),
                serviceAccountJson: formState.serviceAccountJson,
            })

            setFormState(parseFirebaseParams(response.firebaseParams))
            setIsDirty(false)
            setIsConfigured(Boolean(response.firebaseParams?.trim()))
            setFileInputKey((prev) => prev + 1)
            onAppUpdated?.({ firebaseParams: response.firebaseParams })

            toast({
                title: "Firebase config saved",
                description: "Firebase params have been updated successfully.",
            })
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
            setFormState(EMPTY_FORM_STATE)
            setFileUploadError(null)
            setIsDirty(false)
            setIsConfigured(false)
            setIsClearDialogOpen(false)
            setFileInputKey((prev) => prev + 1)
            onAppUpdated?.({ firebaseParams: null })

            toast({
                title: "Firebase config cleared",
                description: "Firebase params have been removed.",
            })
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

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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

                <div className="p-6 flex flex-col gap-4">

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="firebase-enabled" className="text-sm font-medium text-slate-700">
                                    Enable Firebase ingestion
                                </Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${formState.enabled ? "text-green-700" : "text-slate-500"}`}>
                                    {formState.enabled ? "Enabled" : "Disabled"}
                                </span>
                                <Switch
                                    id="firebase-enabled"
                                    checked={formState.enabled}
                                    onCheckedChange={handleEnabledChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="firebase-app-key" className="text-sm font-medium text-slate-700">
                            Firebase app key
                        </Label>
                        <Input
                            id="firebase-app-key"
                            value={formState.firebaseAppKey}
                            onChange={handleFirebaseAppKeyChange}
                            placeholder="com_company_appname"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="firebase-service-account" className="text-sm font-medium text-slate-700">
                                    Service account file
                                </Label>
                            </div>
                            {formState.serviceAccountJson && (
                                <Badge
                                    variant="outline"
                                    className={formState.serviceAccountSource === "uploaded"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-50 text-slate-600 border-slate-200"}
                                >
                                    {formState.serviceAccountSource === "uploaded" ? "New file selected" : "Stored credential"}
                                </Badge>
                            )}
                        </div>

                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-2 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-slate-200">
                                    <Upload className="w-5 h-5 text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-slate-800">Upload service account JSON</p>
                                    <p className="text-xs text-slate-500">
                                        Accepts a standard Google service account file exported from Firebase or GCP.
                                    </p>
                                </div>
                            </div>

                            <Input
                                key={fileInputKey}
                                id="firebase-service-account"
                                type="file"
                                accept=".json,application/json"
                                onChange={handleServiceAccountUpload}
                            />

                            {formState.serviceAccountJson && (
                                <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-800">
                                            {formState.serviceAccountFileName || "service-account.json"}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formState.serviceAccountSource === "uploaded"
                                                ? "This file will be saved when you click Save Firebase Config."
                                                : "Loaded from the current firebase_params configuration."}
                                        </p>
                                        {serviceAccountProjectId && (
                                            <p className="text-xs text-slate-500">
                                                Project ID: <span className="font-medium text-slate-700">{serviceAccountProjectId}</span>
                                            </p>
                                        )}
                                        {serviceAccountEmail && (
                                            <p className="text-xs text-slate-500">
                                                Client email: <span className="font-medium text-slate-700">{serviceAccountEmail}</span>
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 gap-2"
                                        onClick={handleRemoveServiceAccount}
                                        disabled={isSaving || isClearing}
                                    >
                                        <X className="w-4 h-4" />
                                        Remove
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {showValidation && !validation.valid && (
                        <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-red-50 border border-red-100">
                            {validation.errors.map((err, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {showValidation && validation.valid && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            Firebase configuration is ready to save.
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                            {isConfigured && (
                                <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                                    <Button
                                        variant="outline"
                                        className="h-9 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        onClick={() => setIsClearDialogOpen(true)}
                                        disabled={isClearing || isSaving}
                                    >
                                        {isClearing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        Clear Config
                                    </Button>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear Firebase Configuration</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will remove the saved Firebase app key and service account for this app.
                                                You can add them again later, but the current configuration will be lost.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    handleClear()
                                                }}
                                                disabled={isClearing}
                                            >
                                                {isClearing ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                Clear Config
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        <Button
                            className="h-9 gap-2"
                            onClick={handleSave}
                            disabled={isSaving || isClearing || !validation.valid}
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
