"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useToast } from "@/hooks/use-toast"
import {
  getCurrentUser,
  getUserInitials,
  getUserDisplayName,
  getUserRoleDisplayName,
  type AuthUser,
} from "@/lib/auth"
import { logoutUser } from "@/lib/logout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronDown,
  User,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
  LogOut,
  Loader2,
} from "lucide-react"

export function UserDropdown() {
  const router = useRouter()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [logoutAllDevices, setLogoutAllDevices] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { theme = "system", setTheme } = useTheme()
  const [user, setUser] = useState<AuthUser | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    // Get user from localStorage
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const { apiFailed } = await logoutUser(logoutAllDevices)

    try {
      // Show success message
      if (apiFailed) {
        toast({
          title: "Logged out",
          description: "Your local session has been cleared.",
          variant: "default",
        })
      } else {
        toast({
          title: logoutAllDevices ? "Logged out from all devices" : "Logged out",
          description: logoutAllDevices
            ? "You have been logged out from all devices."
            : "You have been logged out successfully.",
        })
      }

      // Redirect to login
      router.push("/login")
    } finally {
      setIsLoggingOut(false)
      setShowLogoutModal(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <Avatar className="h-7 w-7">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {/* User Info Header */}
          <DropdownMenuLabel className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getUserInitials(user)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{getUserDisplayName(user)}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user?.email || "No email"}</span>
                <Badge variant="secondary" className="mt-1 w-fit text-xs">
                  {getUserRoleDisplayName(user)}
                </Badge>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Account Section */}
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              My Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Preferences Section */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              {theme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : theme === "light" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
              Appearance
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light" className="gap-2">
                  <Sun className="w-4 h-4" />
                  Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="gap-2">
                  <Moon className="w-4 h-4" />
                  Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="gap-2">
                  <Monitor className="w-4 h-4" />
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Support Section */}
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => window.open("https://docs.nexus.io", "_blank")}
          >
            <HelpCircle className="w-4 h-4" />
            Help & Documentation
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Logout */}
          <DropdownMenuItem
            className="gap-2 text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
            onClick={() => setShowLogoutModal(true)}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle>Log out of Nexus?</DialogTitle>
            <DialogDescription>You will need to sign in again to access your account.</DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 py-4">
            <Checkbox
              id="logout-all"
              checked={logoutAllDevices}
              onCheckedChange={(checked: boolean) => setLogoutAllDevices(checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="logout-all" className="text-sm font-medium cursor-pointer">
                Log out from all devices
              </label>
              <p className="text-xs text-muted-foreground">This will end all your active sessions</p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Log out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
