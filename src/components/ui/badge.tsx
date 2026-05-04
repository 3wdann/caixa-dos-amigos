import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-[#d8e4dd] bg-white px-3 py-0.5 text-xs font-medium whitespace-nowrap text-[#214F3F] transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary: "bg-[#E2F3E7] text-[#214F3F] [a]:hover:bg-[#d5ebdc]",
        destructive:
          "bg-red-50 text-red-700 focus-visible:ring-destructive/20 dark:bg-red-500/15 dark:text-red-200 dark:focus-visible:ring-destructive/40 [a]:hover:bg-red-100",
        outline: "border-[#d8e4dd] bg-white text-[#214F3F] [a]:hover:bg-[#f4f8f5] dark:border-white/10 dark:bg-transparent dark:text-white",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
