
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <>
      {/* Regular shadcn/ui toaster */}
      <ToastProvider>
        {toasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose />
            </Toast>
          )
        })}
        <ToastViewport />
      </ToastProvider>
      
      {/* Sonner toaster with improved configuration for better mobile experience */}
      <SonnerToaster 
        position="top-center" 
        closeButton 
        richColors 
        duration={4000}
        expand={false}
        visibleToasts={3}
        toastOptions={{
          className: "rounded-lg border border-border shadow-lg",
          descriptionClassName: "text-sm text-muted-foreground",
        }}
      />
    </>
  )
}
