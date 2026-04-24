"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCurrentUser } from "@/lib/auth"
import { AbUserAppMappingEditor } from "./ab-user-app-mapping-editor"

interface AbUserAppMappingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
}

function isAdminOrSuperAdmin(role?: string) {
  const r = role?.toLowerCase() ?? ""
  return r === "admin" || r === "super_admin"
}

export function AbUserAppMappingModal({ open, onOpenChange, userId, userName }: AbUserAppMappingModalProps) {
  const me = getCurrentUser()
  const canBulkEdit = isAdminOrSuperAdmin(me?.role)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] sm:max-w-[min(96vw,1280px)] max-h-[92vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>History Permission</DialogTitle>
          <DialogDescription>
            Lịch sử phân quyền app từ <span className="font-mono">gold.ab_user_app_mapping</span> cho{" "}
            <span className="font-semibold text-slate-900">{userName}</span> (StarRocks).
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <AbUserAppMappingEditor
            userId={userId}
            canBulkEdit={canBulkEdit}
            fetchEnabled={open}
            mappingCacheKey={`ab-user-app-mapping-modal-${userId}`}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
