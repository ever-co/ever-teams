'use client';

import * as React from 'react';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { ChevronRight, Circle } from '@/core/components/icons/hugeicons';
import { cn } from '@/core/lib/helpers';
import { SelectedMark } from './selected-mark';
import {
	openStateAttribute,
	renderFromAsChild,
	stopBaseUIHandlerWhenDefaultPrevented,
	useMirroredOpenState
} from './base-ui';

const MenuOpenContext = React.createContext(false);

const InsideMenuPortalContext = React.createContext(false);

function DropdownMenu({ open, defaultOpen, onOpenChange, ...props }: MenuPrimitive.Root.Props) {
	const { isOpen, trackOpen } = useMirroredOpenState(open, defaultOpen);
	const handleOpenChange = (nextOpen: boolean, eventDetails: MenuPrimitive.Root.ChangeEventDetails) => {
		trackOpen(nextOpen);
		onOpenChange?.(nextOpen, eventDetails);
	};
	return (
		<MenuOpenContext.Provider value={isOpen}>
			<MenuPrimitive.Root open={isOpen} onOpenChange={handleOpenChange} {...props} />
		</MenuOpenContext.Provider>
	);
}
DropdownMenu.displayName = 'DropdownMenu';

interface DropdownMenuTriggerProps extends MenuPrimitive.Trigger.Props {
	asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
	({ asChild, children, render, nativeButton, ...props }, ref) => {
		const isOpen = React.useContext(MenuOpenContext);
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		return (
			<MenuPrimitive.Trigger
				ref={ref}
				data-slot="dropdown-menu-trigger"
				data-state={openStateAttribute(isOpen)}
				nativeButton={resolvedNativeButton}
				render={composed.render}
				{...props}
			>
				{composed.children}
			</MenuPrimitive.Trigger>
		);
	}
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuGroup = React.forwardRef<HTMLDivElement, MenuPrimitive.Group.Props>((props, ref) => (
	<MenuPrimitive.Group ref={ref} data-slot="dropdown-menu-group" {...props} />
));
DropdownMenuGroup.displayName = 'DropdownMenuGroup';

function DropdownMenuPortal({ children, ...props }: MenuPrimitive.Portal.Props) {
	return (
		<MenuPrimitive.Portal {...props}>
			<InsideMenuPortalContext.Provider value={true}>{children}</InsideMenuPortalContext.Provider>
		</MenuPrimitive.Portal>
	);
}
DropdownMenuPortal.displayName = 'DropdownMenuPortal';

/** A content wrapped in `DropdownMenuPortal` by the call site must not portal a second time. */
function MenuPortalUnlessProvided({ children }: Readonly<{ children: React.ReactNode }>) {
	const isInsidePortal = React.useContext(InsideMenuPortalContext);
	if (isInsidePortal) {
		return <>{children}</>;
	}
	return <MenuPrimitive.Portal>{children}</MenuPrimitive.Portal>;
}

const DropdownMenuSub = MenuPrimitive.SubmenuRoot;

const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

const menuPopupRecipe =
	'z-[1000] max-h-(--available-height) min-w-40 overflow-x-hidden overflow-y-auto rounded-xl bg-popover p-1 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 outline-hidden origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 [--radix-dropdown-menu-trigger-width:var(--anchor-width)] [--radix-dropdown-menu-trigger-height:var(--anchor-height)] [--radix-dropdown-menu-content-available-height:var(--available-height)]';

const menuItemRecipe =
	"relative flex min-h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] outline-hidden transition-colors data-highlighted:bg-foreground/5 data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

type MenuPositionProps = Pick<
	MenuPrimitive.Positioner.Props,
	'align' | 'alignOffset' | 'side' | 'sideOffset' | 'collisionPadding' | 'anchor' | 'sticky'
>;

interface DropdownMenuContentProps extends MenuPrimitive.Popup.Props, MenuPositionProps {}

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
	(
		{
			className,
			align = 'center',
			alignOffset,
			side = 'bottom',
			sideOffset = 4,
			collisionPadding,
			anchor,
			sticky,
			...props
		},
		ref
	) => (
		<MenuPortalUnlessProvided>
			<MenuPrimitive.Positioner
				data-slot="dropdown-menu-positioner"
				className="z-[1000] outline-hidden"
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				collisionPadding={collisionPadding}
				anchor={anchor}
				sticky={sticky}
			>
				<MenuPrimitive.Popup
					ref={ref}
					data-slot="dropdown-menu-content"
					className={cn(menuPopupRecipe, className)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPortalUnlessProvided>
	)
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

interface DropdownMenuSubTriggerProps extends MenuPrimitive.SubmenuTrigger.Props {
	inset?: boolean;
	asChild?: boolean;
	textValue?: string;
}

const DropdownMenuSubTrigger = React.forwardRef<HTMLElement, DropdownMenuSubTriggerProps>(
	({ className, inset, asChild, children, render, nativeButton, textValue, label, ...props }, ref) => {
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		const resolvedLabel = label ?? textValue;
		return (
			<MenuPrimitive.SubmenuTrigger
				ref={ref}
				data-slot="dropdown-menu-sub-trigger"
				label={resolvedLabel}
				nativeButton={resolvedNativeButton}
				render={composed.render}
				className={cn(
					menuItemRecipe,
					'data-popup-open:bg-foreground/5 data-popup-open:text-foreground',
					inset && 'pl-8',
					className
				)}
				{...props}
			>
				{composed.children}
				<ChevronRight className="ml-auto" />
			</MenuPrimitive.SubmenuTrigger>
		);
	}
);
DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

const DropdownMenuSubContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
	({ className, align = 'start', side = 'right', sideOffset = 0, ...props }, ref) => (
		<DropdownMenuContent
			ref={ref}
			data-slot="dropdown-menu-sub-content"
			align={align}
			side={side}
			sideOffset={sideOffset}
			className={cn('min-w-36', className)}
			{...props}
		/>
	)
);
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

type MenuClickEvent = Parameters<typeof stopBaseUIHandlerWhenDefaultPrevented>[0];

function runMenuItemClick<TEvent extends MenuClickEvent>(
	event: TEvent,
	onClick: ((event: TEvent) => void) | undefined,
	onSelect: ((event: Event) => void) | undefined
) {
	onClick?.(event);
	onSelect?.(event.nativeEvent);
	stopBaseUIHandlerWhenDefaultPrevented(event);
}

type MenuItemClickEvent = Parameters<NonNullable<MenuPrimitive.Item.Props['onClick']>>[0];

interface DropdownMenuItemProps extends Omit<MenuPrimitive.Item.Props, 'onSelect'> {
	inset?: boolean;
	variant?: 'default' | 'destructive';
	asChild?: boolean;
	textValue?: string;
	/** The Radix select event; `event.preventDefault()` keeps the menu open, as before. */
	onSelect?: (event: Event) => void;
}

const DropdownMenuItem = React.forwardRef<HTMLElement, DropdownMenuItemProps>(
	(
		{
			className,
			inset,
			variant = 'default',
			asChild,
			children,
			render,
			nativeButton,
			textValue,
			label,
			onSelect,
			onClick,
			...props
		},
		ref
	) => {
		const isDestructive = variant === 'destructive';
		const composed = renderFromAsChild({ asChild, children, render });
		const resolvedNativeButton = nativeButton ?? composed.nativeButton;
		const resolvedLabel = label ?? textValue;
		const handleClick = (event: MenuItemClickEvent) => runMenuItemClick(event, onClick, onSelect);
		return (
			<MenuPrimitive.Item
				ref={ref}
				data-slot="dropdown-menu-item"
				data-variant={variant}
				label={resolvedLabel}
				nativeButton={resolvedNativeButton}
				render={composed.render}
				onClick={handleClick}
				className={cn(
					menuItemRecipe,
					isDestructive &&
						"text-destructive-ink data-highlighted:bg-destructive/10 data-highlighted:text-destructive-ink [&_svg:not([class*='text-'])]:text-destructive-ink",
					inset && 'pl-8',
					className
				)}
				{...props}
			>
				{composed.children}
			</MenuPrimitive.Item>
		);
	}
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

type RadixCheckedState = 'checked' | 'unchecked' | undefined;

function checkedStateAttribute(checked: boolean | undefined): RadixCheckedState {
	if (checked === undefined) {
		return undefined;
	}
	if (checked) {
		return 'checked';
	}
	return 'unchecked';
}

type MenuCheckboxItemClickEvent = Parameters<NonNullable<MenuPrimitive.CheckboxItem.Props['onClick']>>[0];

interface DropdownMenuCheckboxItemProps extends Omit<MenuPrimitive.CheckboxItem.Props, 'onSelect'> {
	textValue?: string;
	onSelect?: (event: Event) => void;
}

const DropdownMenuCheckboxItem = React.forwardRef<HTMLElement, DropdownMenuCheckboxItemProps>(
	({ className, children, checked, closeOnClick = true, textValue, label, onSelect, onClick, ...props }, ref) => {
		const resolvedLabel = label ?? textValue;
		const handleClick = (event: MenuCheckboxItemClickEvent) => runMenuItemClick(event, onClick, onSelect);
		return (
			<MenuPrimitive.CheckboxItem
				ref={ref}
				data-slot="dropdown-menu-checkbox-item"
				data-state={checkedStateAttribute(checked)}
				label={resolvedLabel}
				className={cn(menuItemRecipe, 'pl-8', className)}
				checked={checked}
				closeOnClick={closeOnClick}
				onClick={handleClick}
				{...props}
			>
				<span className="pointer-events-none absolute left-1.5 flex size-[18px] items-center justify-center">
					<MenuPrimitive.CheckboxItemIndicator>
						<SelectedMark />
					</MenuPrimitive.CheckboxItemIndicator>
				</span>
				{children}
			</MenuPrimitive.CheckboxItem>
		);
	}
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

interface DropdownMenuRadioItemProps extends MenuPrimitive.RadioItem.Props {
	textValue?: string;
}

const DropdownMenuRadioItem = React.forwardRef<HTMLElement, DropdownMenuRadioItemProps>(
	({ className, children, closeOnClick = true, textValue, label, ...props }, ref) => {
		const resolvedLabel = label ?? textValue;
		return (
			<MenuPrimitive.RadioItem
				ref={ref}
				data-slot="dropdown-menu-radio-item"
				label={resolvedLabel}
				closeOnClick={closeOnClick}
				className={cn(menuItemRecipe, 'pl-8', className)}
				{...props}
			>
				<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
					<MenuPrimitive.RadioItemIndicator>
						<Circle className="size-2 fill-current" />
					</MenuPrimitive.RadioItemIndicator>
				</span>
				{children}
			</MenuPrimitive.RadioItem>
		);
	}
);
DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

interface DropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
	inset?: boolean;
}

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
	({ className, inset, ...props }, ref) => (
		<div
			ref={ref}
			data-slot="dropdown-menu-label"
			className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', inset && 'pl-8', className)}
			{...props}
		/>
	)
);
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, MenuPrimitive.Separator.Props>(
	({ className, ...props }, ref) => (
		<MenuPrimitive.Separator
			ref={ref}
			data-slot="dropdown-menu-separator"
			className={cn('-mx-1 my-1 h-px bg-border', className)}
			{...props}
		/>
	)
);
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			data-slot="dropdown-menu-shortcut"
			className={cn('ml-auto text-xs text-muted-foreground', className)}
			{...props}
		/>
	);
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
	menuItemRecipe,
	menuPopupRecipe
};
