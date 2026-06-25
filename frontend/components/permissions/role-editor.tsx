"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Plus, Pencil, Trash2, Settings } from "lucide-react"
import type { Role } from "./permission-management-content"

interface RoleEditorProps {
  roles: Role[]
  selectedRole: Role
  onCreateRole: (name: string, description: string) => void
  onRenameRole: (roleId: string, name: string, description: string) => void
  onDeleteRole: (roleId: string) => void
  canCreate?: boolean
  canRename?: boolean
  canDelete?: boolean
}

export function RoleEditor({ roles, selectedRole, onCreateRole, onRenameRole, onDeleteRole, canCreate = true, canRename = true, canDelete = true }: RoleEditorProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const openCreate = () => {
    setName("")
    setDescription("")
    setCreateOpen(true)
  }

  const openRename = () => {
    setName(selectedRole.name)
    setDescription(selectedRole.description)
    setRenameOpen(true)
  }

  const handleCreate = () => {
    if (!name.trim()) return
    onCreateRole(name.trim(), description.trim())
    setCreateOpen(false)
  }

  const handleRename = () => {
    if (!name.trim()) return
    onRenameRole(selectedRole.id, name.trim(), description.trim())
    setRenameOpen(false)
  }

  const handleDelete = () => {
    onDeleteRole(selectedRole.id)
    setDeleteOpen(false)
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Role Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Button
            variant="outline"
            className="w-full justify-start text-sm bg-transparent"
            onClick={openCreate}
            disabled={!canCreate}
            title={!canCreate ? "You don't have permission to create roles" : undefined}
          >
            <Plus className="w-4 h-4 mr-2 text-primary" />
            Create New Role
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-sm bg-transparent"
            onClick={openRename}
            disabled={selectedRole.isSystem || !canRename}
            title={!canRename ? "You don't have permission to rename roles" : undefined}
          >
            <Pencil className="w-4 h-4 mr-2 text-muted-foreground" />
            Rename Role
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-sm text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive bg-transparent"
            onClick={() => setDeleteOpen(true)}
            disabled={selectedRole.isSystem || roles.length <= 1 || !canDelete}
            title={!canDelete ? "You don't have permission to delete roles" : undefined}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Role
          </Button>
          {selectedRole.isSystem && (
            <p className="text-xs text-muted-foreground px-1 pt-1">
              System roles cannot be renamed or deleted.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role with a name and description. You can configure permissions after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Role Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Editor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Input
                id="create-desc"
                placeholder="Brief description of this role"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreate}
              disabled={!name.trim()}
            >
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Role Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Role</DialogTitle>
            <DialogDescription>
              Update the name and description for &quot;{selectedRole.name}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rename-name">Role Name</Label>
              <Input
                id="rename-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-desc">Description</Label>
              <Input
                id="rename-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleRename}
              disabled={!name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{selectedRole.name}&quot; Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this role? This action cannot be undone.
              {selectedRole.userCount > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Warning: {selectedRole.userCount} user{selectedRole.userCount === 1 ? " is" : "s are"} currently assigned to this role.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

