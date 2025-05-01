import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

const Separator: React.ForwardRefExoticComponent<
	React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> & {
		ref?: React.Ref<HTMLDivElement>; // An explicit reference for HTMLDivElement
	}
> = React.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
	<SeparatorPrimitive.Root
		ref={ref}
		decorative={decorative}
		orientation={orientation}
		className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)}
		{...props}
	/>
));

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
