"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCurrentUser } from "@/lib/auth";
import { AbUserAppMappingEditor } from "./ab-user-app-mapping-editor";

interface AbUserAppMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

function isAdminOrSuperAdmin(role?: string) {
  const r = role?.toLowerCase() ?? "";
  return r === "admin" || r === "super_admin";
}

export function AbUserAppMappingModal({
  open,
  onOpenChange,
  userId,
  userName,
}: AbUserAppMappingModalProps) {
  const me = getCurrentUser();
  const canBulkEdit = isAdminOrSuperAdmin(me?.role);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-[min(96vw,1280px)] sm:max-w-[min(96vw,1280px)] max-h-[calc(100vh-1rem)] overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
        <DialogHeader>
          <DialogTitle>History Permission</DialogTitle>
          <DialogDescription>
            Lịch sử phân quyền app từ{" "}
            <span className="font-mono">gold.ab_user_app_mapping</span> cho{" "}
            <span className="font-semibold ">{userName}</span> (StarRocks).
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
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
