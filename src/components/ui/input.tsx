import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-base text-[#13231C] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[#8a978f] focus-visible:border-[#2F7258] focus-visible:ring-3 focus-visible:ring-[#2F7258]/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#f1f3f1] disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-400 dark:focus-visible:border-[#E2F3E7] dark:focus-visible:ring-[#E2F3E7]/15",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
