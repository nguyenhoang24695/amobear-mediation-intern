"use client"

interface NoPermissionViewProps {
  /** Custom message. Default: "You don't have permission to access this screen." */
  message?: string
}

const DEFAULT_MESSAGE = "You don't have permission to access this screen."

export function NoPermissionView({ message = DEFAULT_MESSAGE }: NoPermissionViewProps) {
  return (
    <div className="flex min-h-[50vh] w-full flex-1 items-center justify-center px-4">
      <p className="text-center text-2xl text-muted-foreground">
        {message}
      </p>
    </div>
  )
}
