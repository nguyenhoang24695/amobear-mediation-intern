import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <div 
      className={cn("relative flex items-center justify-center shrink-0", className)} 
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo/logo.png"
        alt="Nexus"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}
