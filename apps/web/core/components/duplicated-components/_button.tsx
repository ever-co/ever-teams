import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/core/lib/helpers';

/** Linear's primary: a flat indigo pill with a darker hairline of its own hue and a one-pixel drop. */
const primaryRecipe =
	'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.12)] hairline-ring ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_18%,hsl(var(--primary)))] focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-primary/90 dark:[--ring-color:color-mix(in_oklab,white_15%,hsl(var(--primary)))]';

const destructiveRecipe =
	'bg-destructive text-white shadow-[0_1px_2px_rgb(0_0_0/0.14),inset_0_1px_0_rgb(255_255_255/0.12)] hairline-ring ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_18%,hsl(var(--destructive)))] focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-destructive/90 dark:[--ring-color:color-mix(in_oklab,white_15%,hsl(var(--destructive)))]';

/** Linear's secondary action: a white pill on a hairline with a soft one-pixel drop. */
const outlineRecipe =
	'bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)] hairline-ring ring-foreground/12 duration-150 hover:bg-foreground/[0.03] aria-expanded:bg-foreground/[0.04] data-[state=open]:bg-foreground/[0.04] dark:bg-foreground/[0.04] dark:ring-foreground/15 dark:hover:bg-foreground/[0.07]';

const ghostRecipe =
	'rounded-md hover:bg-foreground/5 hover:text-foreground aria-expanded:bg-foreground/5 aria-expanded:text-foreground data-[state=open]:bg-foreground/5';

const buttonVariants = cva(
	"group/button inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium outline-none transition-all focus-visible:hairline-ring focus-visible:ring-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: primaryRecipe,
				destructive: destructiveRecipe,
				outline: outlineRecipe,
				secondary: 'bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.09]',
				ghost: ghostRecipe,
				link: 'rounded-md text-primary-ink underline-offset-4 hover:underline'
			},
			size: {
				default: 'h-8 px-3.5 text-[13px]',
				sm: 'h-7 px-2.5 text-xs',
				lg: 'h-9 px-4 text-[13px]',
				icon: 'size-8',
				'icon-sm': 'size-7'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				data-slot="button"
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants, type ButtonSize, type ButtonVariant };
