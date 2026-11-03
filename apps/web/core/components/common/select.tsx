'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown } from '@/core/components/icons/hugeicons';

import { cn } from '@/core/lib/helpers';
import { clsxm } from '@/core/lib/utils';
import { composeRefs, openStateAttribute, useMirroredOpenState } from './base-ui';
import { controlRecipe } from './input';

type SelectValueType = string | null;

interface SelectContextValue {
	value: SelectValueType;
	isOpen: boolean;
	valueNode: HTMLElement | null;
	setValueNode: (node: HTMLElement | null) => void;
	valueNodeHasChildren: boolean;
	setValueNodeHasChildren: (hasChildren: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(): SelectContextValue {
	const context = React.useContext(SelectContext);
	if (context === null) {
		throw new Error('Select parts must be rendered inside <Select>.');
	}
	return context;
}

/**
 * Radix showed the picked item's children in `SelectValue` even while the list was closed, by rendering the
 * items into a detached fragment. Base UI only knows the raw value, so the content is rendered a second
 * time, hidden, and the selected item portals its children into the value node from there.
 */
const SelectLabelRegistryContext = React.createContext(false);

type SelectRootPrimitiveProps = SelectPrimitive.Root.Props<string, false>;

type SelectRootOwnProps = Omit<
	SelectRootPrimitiveProps,
	| 'value'
	| 'defaultValue'
	| 'onValueChange'
	| 'onOpenChange'
	| 'multiple'
	| 'items'
	| 'itemToStringLabel'
	| 'itemToStringValue'
	| 'isItemEqualToValue'
>;

interface SelectProps extends SelectRootOwnProps {
	value?: string;
	defaultValue?: string;
	onValueChange?(value: string): void;
	onOpenChange?(open: boolean): void;
}

/** Radix treated the empty string as "nothing selected"; Base UI uses `null`. */
function toBaseValue(value: string | undefined): SelectValueType {
	if (!value) {
		return null;
	}
	return value;
}

function Select({
	children,
	value,
	defaultValue,
	onValueChange,
	open,
	defaultOpen,
	onOpenChange,
	...props
}: Readonly<SelectProps>) {
	const [internalValue, setInternalValue] = React.useState<SelectValueType>(() => toBaseValue(defaultValue));
	const isControlled = value !== undefined;
	let currentValue = internalValue;
	if (isControlled) {
		currentValue = toBaseValue(value);
	}
	const { isOpen, trackOpen } = useMirroredOpenState(open, defaultOpen);
	const [valueNode, setValueNode] = React.useState<HTMLElement | null>(null);
	const [valueNodeHasChildren, setValueNodeHasChildren] = React.useState(false);

	const handleValueChange = (nextValue: SelectValueType) => {
		if (!isControlled) {
			setInternalValue(nextValue);
		}
		onValueChange?.(nextValue ?? '');
	};
	const handleOpenChange = (nextOpen: boolean) => {
		trackOpen(nextOpen);
		onOpenChange?.(nextOpen);
	};

	const contextValue = React.useMemo<SelectContextValue>(
		() => ({
			value: currentValue,
			isOpen,
			valueNode,
			setValueNode,
			valueNodeHasChildren,
			setValueNodeHasChildren
		}),
		[currentValue, isOpen, valueNode, valueNodeHasChildren]
	);

	return (
		<SelectContext.Provider value={contextValue}>
			<SelectPrimitive.Root
				value={currentValue}
				onValueChange={handleValueChange}
				open={isOpen}
				onOpenChange={handleOpenChange}
				{...props}
			>
				{children}
			</SelectPrimitive.Root>
		</SelectContext.Provider>
	);
}
Select.displayName = 'Select';

const SelectPortal = SelectPrimitive.Portal;

const SelectGroup = React.forwardRef<HTMLDivElement, SelectPrimitive.Group.Props>(({ children, ...props }, ref) => {
	const isLabelRegistry = React.useContext(SelectLabelRegistryContext);
	if (isLabelRegistry) {
		return <>{children}</>;
	}
	return (
		<SelectPrimitive.Group ref={ref} data-slot="select-group" {...props}>
			{children}
		</SelectPrimitive.Group>
	);
});
SelectGroup.displayName = 'SelectGroup';

interface SelectValueProps extends Omit<SelectPrimitive.Value.Props, 'children' | 'placeholder'> {
	children?: React.ReactNode;
	placeholder?: React.ReactNode;
}

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
	({ className, children, placeholder, ...props }, ref) => {
		const { setValueNode, setValueNodeHasChildren } = useSelectContext();
		const hasChildren = children !== undefined;
		React.useLayoutEffect(() => {
			setValueNodeHasChildren(hasChildren);
		}, [hasChildren, setValueNodeHasChildren]);
		const registerValueNode = React.useMemo(
			() => composeRefs<HTMLSpanElement>(ref, setValueNode),
			[ref, setValueNode]
		);
		const renderValue = (value: SelectValueType) => {
			const isEmpty = value === null || value === '';
			if (isEmpty) {
				return placeholder;
			}
			if (hasChildren) {
				return children;
			}
			return null;
		};
		return (
			<SelectPrimitive.Value
				ref={registerValueNode}
				data-slot="select-value"
				className={cn('pointer-events-none', className)}
				{...props}
			>
				{renderValue}
			</SelectPrimitive.Value>
		);
	}
);
SelectValue.displayName = 'SelectValue';

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectPrimitive.Trigger.Props>(
	({ className, children, ...props }, ref) => {
		const { isOpen } = useSelectContext();
		return (
			<SelectPrimitive.Trigger
				ref={ref}
				data-slot="select-trigger"
				data-state={openStateAttribute(isOpen)}
				className={cn(
					controlRecipe,
					'flex h-9 items-center justify-between gap-2 px-3 py-1.5 text-left data-placeholder:text-muted-foreground/75 [&>span]:truncate',
					className
				)}
				{...props}
			>
				{children}
				<SelectPrimitive.Icon data-slot="select-icon" className="flex shrink-0">
					<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
				</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
		);
	}
);
SelectTrigger.displayName = 'SelectTrigger';

type SelectPosition = 'popper' | 'item-aligned';

type SelectPositionProps = Pick<
	SelectPrimitive.Positioner.Props,
	'align' | 'alignOffset' | 'side' | 'sideOffset' | 'collisionPadding' | 'anchor' | 'sticky'
>;

interface SelectContentProps extends SelectPrimitive.Popup.Props, SelectPositionProps {
	position?: SelectPosition;
}

const POPPER_SIDE_OFFSET = 4;
const ITEM_ALIGNED_SIDE_OFFSET = 0;

function defaultSideOffset(isItemAligned: boolean): number {
	if (isItemAligned) {
		return ITEM_ALIGNED_SIDE_OFFSET;
	}
	return POPPER_SIDE_OFFSET;
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
	(
		{
			className,
			children,
			position = 'popper',
			align = 'start',
			alignOffset,
			side = 'bottom',
			sideOffset,
			collisionPadding = 10,
			anchor,
			sticky,
			...props
		},
		ref
	) => {
		const isItemAligned = position === 'item-aligned';
		const isPopper = !isItemAligned;
		const resolvedSideOffset = sideOffset ?? defaultSideOffset(isItemAligned);
		return (
			<>
				<SelectLabelRegistryContext.Provider value={true}>
					<div hidden aria-hidden="true" data-slot="select-label-registry">
						{children}
					</div>
				</SelectLabelRegistryContext.Provider>
				<SelectPrimitive.Portal>
					<SelectPrimitive.Positioner
						data-slot="select-positioner"
						className="z-[1070] select-none outline-hidden"
						align={align}
						alignOffset={alignOffset}
						side={side}
						sideOffset={resolvedSideOffset}
						collisionPadding={collisionPadding}
						anchor={anchor}
						sticky={sticky}
						alignItemWithTrigger={isItemAligned}
					>
						<SelectPrimitive.Popup
							ref={ref}
							data-slot="select-content"
							className={cn(
								'relative z-[1000] flex max-h-(--available-height) min-w-32 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 [--radix-select-trigger-width:var(--anchor-width)] [--radix-select-trigger-height:var(--anchor-height)] [--radix-select-content-available-height:var(--available-height)]',
								className
							)}
							{...props}
						>
							<SelectPrimitive.List
								data-slot="select-viewport"
								className={cn('min-h-0 p-1', isPopper && 'w-full min-w-(--anchor-width)')}
							>
								{children}
							</SelectPrimitive.List>
						</SelectPrimitive.Popup>
					</SelectPrimitive.Positioner>
				</SelectPrimitive.Portal>
			</>
		);
	}
);
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef<HTMLDivElement, SelectPrimitive.GroupLabel.Props>(
	({ className, ...props }, ref) => {
		const isLabelRegistry = React.useContext(SelectLabelRegistryContext);
		if (isLabelRegistry) {
			return null;
		}
		return (
			<SelectPrimitive.GroupLabel
				ref={ref}
				data-slot="select-label"
				className={cn('py-1.5 pl-8 pr-2 text-xs font-medium text-muted-foreground', className)}
				{...props}
			/>
		);
	}
);
SelectLabel.displayName = 'SelectLabel';

type RadixCheckedState = 'checked' | 'unchecked';

function checkedStateAttribute(isSelected: boolean): RadixCheckedState {
	if (isSelected) {
		return 'checked';
	}
	return 'unchecked';
}

interface SelectItemProps extends SelectPrimitive.Item.Props {
	chevronClass?: string;
	textValue?: string;
}

const SelectItem = React.forwardRef<HTMLElement, SelectItemProps>(
	({ className, chevronClass, children, textValue, label, value, ...props }, ref) => {
		const isLabelRegistry = React.useContext(SelectLabelRegistryContext);
		const { value: selectedValue, valueNode, valueNodeHasChildren } = useSelectContext();
		const hasSelection = selectedValue !== null;
		const isSelected = hasSelection && selectedValue === value;
		if (isLabelRegistry) {
			const canPortalLabel = isSelected && !valueNodeHasChildren;
			if (!canPortalLabel) {
				return null;
			}
			if (valueNode === null) {
				return null;
			}
			return createPortal(children, valueNode);
		}
		const resolvedLabel = label ?? textValue;
		return (
			<SelectPrimitive.Item
				ref={ref}
				data-slot="select-item"
				data-state={checkedStateAttribute(isSelected)}
				value={value}
				label={resolvedLabel}
				className={cn(
					'relative flex w-full cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors data-highlighted:bg-foreground/5 data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
					className
				)}
				{...props}
			>
				<span className="absolute left-2 flex size-3.5 items-center justify-center">
					<SelectPrimitive.ItemIndicator>
						<Check className={clsxm('size-4', chevronClass)} />
					</SelectPrimitive.ItemIndicator>
				</span>

				<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
			</SelectPrimitive.Item>
		);
	}
);
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<HTMLDivElement, SelectPrimitive.Separator.Props>(
	({ className, ...props }, ref) => {
		const isLabelRegistry = React.useContext(SelectLabelRegistryContext);
		if (isLabelRegistry) {
			return null;
		}
		return (
			<SelectPrimitive.Separator
				ref={ref}
				data-slot="select-separator"
				className={cn('-mx-1 my-1 h-px bg-border', className)}
				{...props}
			/>
		);
	}
);
SelectSeparator.displayName = 'SelectSeparator';

export {
	Select,
	SelectGroup,
	SelectValue,
	SelectTrigger,
	SelectContent,
	SelectLabel,
	SelectItem,
	SelectSeparator,
	SelectPortal
};
