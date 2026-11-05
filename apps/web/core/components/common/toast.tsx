import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { Viewport as ToastPrimitivesViewport } from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '@/core/components/duplicated-components/_button';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<HTMLOListElement, React.ComponentProps<typeof ToastPrimitivesViewport>>(
	function ToastViewport({ className, ...props }, ref) {
		return (
			<ToastPrimitivesViewport
				{...props}
				ref={ref}
				className={cn(
					'fixed bottom-0 right-0 z-[1000] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-sm',
					className
				)}
			/>
		);
	}
);

ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
	'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl p-4 pr-8 hairline-ring ring-border shadow-md shadow-black/6.5 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
	{
		variants: {
			variant: {
				default: 'bg-popover text-popover-foreground',
				destructive: 'destructive group bg-popover text-destructive-ink ring-destructive/30'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
);

const Toast = React.forwardRef<
	React.ElementRef<typeof ToastPrimitives.Root>,
	React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
	return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
	React.ElementRef<typeof ToastPrimitives.Action>,
	React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
	<ToastPrimitives.Action
		ref={ref}
		className={cn(
			buttonVariants({ variant: 'outline', size: 'default' }),
			'group-[.destructive]:text-destructive-ink group-[.destructive]:hover:bg-destructive/10',
			className
		)}
		{...props}
	/>
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
	React.ElementRef<typeof ToastPrimitives.Close>,
	React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
	<ToastPrimitives.Close
		ref={ref}
		className={cn(
			'absolute right-2 top-2 rounded-md p-1 text-muted-foreground opacity-0 transition-[opacity,color,background-color] hover:bg-foreground/5 hover:text-foreground focus:opacity-100 focus:outline-none focus-visible:hairline-ring focus-visible:ring-ring group-hover:opacity-100 group-[.destructive]:text-destructive-ink',
			className
		)}
		toast-close=""
		{...props}
	>
		<X className="size-4" />
	</ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
	React.ElementRef<typeof ToastPrimitives.Title>,
	React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
	<ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
	React.ElementRef<typeof ToastPrimitives.Description>,
	React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
	<ToastPrimitives.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
	type ToastProps,
	type ToastActionElement,
	ToastProvider,
	ToastViewport,
	Toast,
	ToastTitle,
	ToastDescription,
	ToastClose,
	ToastAction
};
