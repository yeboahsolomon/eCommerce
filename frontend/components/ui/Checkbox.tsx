import * as React from "react"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

// If radix-ui checkbox is not installed, I can use a simple implementation
// But let's assume I can use a simpler one without radix dependency if user didn't ask for radix.
// The user has lucide-react. The user has @tailwindcss/postcss.
// I'll create a simple accessible checkbox without radix for now to avoid dependency issues if radix isn't present.
// Note: package.json checks showed NO radix-ui packages. Just react-hook-form, zod, lucide-react.
// So I should build a controlled checkbox component using standard input.

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex items-start space-x-2">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            className={cn(
              "peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:text-slate-50",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {label && (
          <label
            htmlFor={props.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer"
          >
            {label}
          </label>
        )}
         {error && (
          <p className="text-xs text-red-500 font-medium animate-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
