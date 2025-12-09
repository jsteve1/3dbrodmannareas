import * as React from "react"
import { cn } from "../../lib/utils"

const Drawer = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
      className
    )}
    {...props}
  />
))
Drawer.displayName = "Drawer"

const DrawerContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-4", className)} {...props}>
    {children}
  </div>
))
DrawerContent.displayName = "DrawerContent"

export { Drawer, DrawerContent }

