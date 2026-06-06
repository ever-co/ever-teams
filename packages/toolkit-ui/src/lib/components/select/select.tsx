/** @jsxImportSource theme-ui */
'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

const ShadCnSelect = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = ({
	ref,
	className,
	children,
	loading = false,
	onClear,
	...props
}: SelectPrimitive.SelectTriggerProps & {
	loading?: boolean;
	onClear?: () => void;
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.Trigger>>;
}) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className={cn(
			'group flex h-10 w-full items-center justify-between rounded-md border dark:border-black p-2 text-sm placeholder:text-muted-foreground focus:outline-hidden  disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 text-gray-500 bg-transparent dark:bg-popover  border-input ',
			className
		)}
		sx={{
			'&:focus': { borderColor: 'borderColor' }
		}}
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			<div className="flex w-9 justify-end gap-1 items-center">
				{loading && <LoaderCircle className="h-4 w-4 opacity-50 animate-spin" />}

				{/* {onClear && !loading && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onClear();
						}}
						onMouseDown={(e) => e.preventDefault()}
					>
						<X className="size-3 opacity-50 cursor-pointer hover:text-red-600 hover:opacity-100 transition-all duration-200 ease-in-out group-data-[placeholder]:hidden" />
					</button>
				)} */}
				<ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200 ease-in-out data-[state=open]:rotate-180" />
			</div>
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
);
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.ScrollUpButton>>;
}) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cn('flex cursor-default items-center justify-center py-1', className)}
		{...props}
	>
		<ChevronUp className="h-4 w-4" />
	</SelectPrimitive.ScrollUpButton>
);
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.ScrollDownButton>>;
}) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cn('flex cursor-default items-center justify-center py-1', className)}
		{...props}
	>
		<ChevronDown className="h-4 w-4" />
	</SelectPrimitive.ScrollDownButton>
);
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = ({
	ref,
	className,
	children,
	position = 'popper',
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.Content>>;
}) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			className={cn(
				'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md bg-[hsl(var(--popover))] dark:bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				position === 'popper' &&
					'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
				className
			)}
			position={position}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport
				className={cn(
					'p-1',
					position === 'popper' &&
						'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
			<SelectScrollDownButton />
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
);
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.Label>>;
}) => (
	<SelectPrimitive.Label ref={ref} className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)} {...props} />
);
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = ({
	ref,
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.Item>>;
}) => (
	<SelectPrimitive.Item
		ref={ref}
		className={cn(
			'relative truncate flex w-full cursor-default select-none items-center rounded-xs py-1.5 pl-8 pr-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
			className
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<SelectPrimitive.ItemIndicator>
				<Check className="h-4 w-4" />
			</SelectPrimitive.ItemIndicator>
		</span>
		<SelectPrimitive.ItemText className="truncate">{children}</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
);
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = ({
	ref,
	className,
	...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator> & {
	ref?: React.RefObject<React.ElementRef<typeof SelectPrimitive.Separator>>;
}) => <SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />;
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
	ShadCnSelect,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectScrollUpButton,
	SelectScrollDownButton
};
