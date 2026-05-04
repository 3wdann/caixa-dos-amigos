import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[#214F3F] text-white shadow-[0_16px_30px_rgba(33,79,63,0.22)] hover:-translate-y-0.5 hover:bg-[#1a4033]",
        outline:
          "border-[#BCD5C4] bg-white text-[#214F3F] shadow-[0_10px_22px_rgba(33,79,63,0.08)] hover:-translate-y-0.5 hover:bg-[#f3f9f4] dark:border-white/15 dark:bg-transparent dark:text-[#E2F3E7] dark:hover:bg-white/5",
        secondary:
          "bg-[#E2F3E7] text-[#214F3F] shadow-[0_10px_22px_rgba(33,79,63,0.08)] hover:-translate-y-0.5 hover:bg-[#d4eadb]",
        ghost:
          "text-[#214F3F] hover:bg-[#eef6ef] dark:text-[#E2F3E7] dark:hover:bg-white/5",
        destructive:
          "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/20",
        link: "text-[#214F3F] underline-offset-4 hover:underline dark:text-[#E2F3E7]",
      },
      size: {
        default: "h-11 gap-2 px-5",
        xs: "h-8 gap-1 rounded-full px-3 text-xs",
        sm: "h-9 gap-1.5 rounded-full px-4 text-sm",
        lg: "h-12 gap-2 px-6 text-base",
        icon: "size-11",
        "icon-xs": "size-8 rounded-full",
        "icon-sm": "size-9 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
