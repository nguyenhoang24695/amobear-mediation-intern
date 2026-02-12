"use client"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"

export type OrganizationActionType = "deactivate" | "activate" | "delete"

interface OrganizationActionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    actionType: OrganizationActionType
    organizationName: string
    organizationSlug: string
    userCount: number
    teamCount?: number
    onConfirm: () => Promise<void>
    loading?: boolean
}

const actionConfig = {
    deactivate: {
        icon: AlertTriangle,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        title: "Deactivate Organization",
        confirmText: "DEACTIVATE",
        buttonText: "Deactivate",
    },
    activate: {
        icon: AlertTriangle,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        title: "Activate Organization",
        confirmText: "ACTIVATE",
        buttonText: "Activate",
    },
    delete: {
        icon: Trash2,
        iconBg: "bg-red-100",
        iconColor: "text-red-600",
        title: "Delete Organization Permanently",
        confirmText: "", // Will use slug
        buttonText: "Delete Organization",
    },
}

export function OrganizationActionModal({
    open,
    onOpenChange,
    actionType,
    organizationName,
    organizationSlug,
    userCount,
    teamCount,
    onConfirm,
    loading = false,
}: OrganizationActionModalProps) {
    const [confirmInput, setConfirmInput] = useState("")
    const config = actionConfig[actionType]
    const Icon = config.icon
    const expectedConfirm = actionType === "delete" ? organizationSlug : config.confirmText

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setConfirmInput("")
        }
        onOpenChange(newOpen)
    }

    const handleConfirm = async () => {
        if (confirmInput === expectedConfirm) {
            await onConfirm()
            setConfirmInput("")
        }
    }

    const getDescription = () => {
        switch (actionType) {
            case "deactivate":
                return (
                    <div className="space-y-3">
                        <p>
                            Are you sure you want to deactivate{" "}
                            <span className="font-semibold text-slate-900">{organizationName}</span>?
                        </p>
                        <p className="text-slate-500">
                            All {userCount} users will be logged out and unable to access the platform until the
                            organization is reactivated.
                        </p>
                    </div>
                )
            case "activate":
                return (
                    <div className="space-y-3">
                        <p>
                            Are you sure you want to activate{" "}
                            <span className="font-semibold text-slate-900">{organizationName}</span>?
                        </p>
                        <p className="text-slate-500">This will restore user access to the organization.</p>
                    </div>
                )
            case "delete":
                return (
                    <div className="space-y-3">
                        <p className="font-medium text-slate-900">This action is permanent and cannot be undone.</p>
                        <ul className="space-y-1.5 text-sm text-slate-600">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {userCount} users will be removed
                            </li>
                            {teamCount !== undefined && (
                                <li className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    {teamCount} teams will be deleted
                                </li>
                            )}
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                All organization data will be permanently lost
                            </li>
                        </ul>
                    </div>
                )
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 ${config.iconBg} rounded-full flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${config.iconColor}`} />
                        </div>
                        <AlertDialogTitle>{config.title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            {getDescription()}
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="confirmInput" className="text-sm">
                                    Type <span className="font-mono font-semibold text-slate-900">{expectedConfirm}</span>{" "}
                                    {actionType === "delete" ? "(organization slug) " : ""}to confirm
                                </Label>
                                <Input
                                    id="confirmInput"
                                    value={confirmInput}
                                    onChange={(e) => setConfirmInput(e.target.value)}
                                    placeholder={expectedConfirm}
                                />
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmInput("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={confirmInput !== expectedConfirm || loading}
                        onClick={(e) => {
                            e.preventDefault()
                            handleConfirm()
                        }}
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {config.buttonText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
