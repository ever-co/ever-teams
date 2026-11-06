import * as React from 'react';
import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from '@/core/components/icons';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from 'core/components/common/dialog';
import { cn } from '@/core/lib/helpers';
import { useActiveIndicator, type IndicatorBox } from '@/core/hooks/common/use-active-indicator';

const commandKeycapClass =
	'keycap-3d inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-sans text-[11px] font-medium leading-none text-foreground/70';

const commandIconTileClass =
	'keycap-3d inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-foreground/70 [&_svg]:size-4';

const Command = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
	<CommandPrimitive
		ref={ref}
		className={cn(
			'flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground',
			className
		)}
		{...props}
	/>
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, ...props }: DialogProps) => {
	return (
		<Dialog
			{...props}
			aria-label="Command Dialog"
			aria-labelledby="Command Dialog"
			aria-describedby="Command Dialog"
		>
			<DialogContent
				className="top-[12%] max-w-[40rem] translate-y-0 gap-0 overflow-hidden p-0 max-sm:top-4"
				showCloseButton={false}
				aria-label="Command Dialog"
				aria-labelledby="Command Dialog"
				aria-describedby="Command Dialog"
			>
				<DialogHeader>
					<DialogTitle className="sr-only">Command Dialog</DialogTitle>
				</DialogHeader>
				<Command
					className={cn(
						'rounded-none bg-transparent',
						'[&_[data-cmdk-input-wrapper]]:h-14 [&_[data-cmdk-input-wrapper]]:gap-3 [&_[data-cmdk-input-wrapper]]:px-5',
						'[&_[data-cmdk-input-wrapper]>svg]:size-5 [&_[cmdk-input]]:h-14 [&_[cmdk-input]]:text-[15px]',
						'[&_[cmdk-list]]:max-h-[min(28rem,calc(100dvh-14rem))] [&_[cmdk-list]]:px-2 [&_[cmdk-list]]:pb-2'
					)}
				>
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
};

interface CommandInputProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {
	shortcutKeys?: string[];
}

const CommandInput = React.forwardRef<React.ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
	({ className, shortcutKeys, ...props }, ref) => {
		const hasShortcut = Boolean(shortcutKeys?.length);
		return (
			<div className="flex items-center gap-2 hairline-b border-border px-3" data-cmdk-input-wrapper="">
				<Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				<CommandPrimitive.Input
					ref={ref}
					className={cn(
						'flex h-9 w-full bg-transparent py-2 text-[13px] outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
						className
					)}
					{...props}
				/>
				{hasShortcut && (
					<span className="flex shrink-0 items-center gap-1" aria-hidden="true">
						{shortcutKeys?.map((key) => (
							<kbd key={key} className={commandKeycapClass}>
								{key}
							</kbd>
						))}
					</span>
				)}
			</div>
		);
	}
);

CommandInput.displayName = CommandPrimitive.Input.displayName;

interface CommandTabItem {
	value: string;
	label: React.ReactNode;
}

interface CommandTabsProps {
	label: string;
	items: CommandTabItem[];
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
}

const TAB_INDICATOR_INSET = 8;

function tabIndicatorStyle(box: IndicatorBox): React.CSSProperties {
	const left = box.left + TAB_INDICATOR_INSET;
	const insetWidth = box.width - TAB_INDICATOR_INSET * 2;
	const width = Math.max(insetWidth, 0);
	return { transform: `translateX(${left}px)`, width };
}

function CommandTabs({ label, items, value, onValueChange, className }: Readonly<CommandTabsProps>) {
	const { listRef, activeRef, box } = useActiveIndicator<HTMLDivElement, HTMLButtonElement>(value);
	return (
		<div className={cn('no-scrollbar overflow-x-auto hairline-b border-border px-3', className)}>
			<div ref={listRef} role="tablist" aria-label={label} className="relative flex min-w-max items-end gap-1">
				{items.map((item) => {
					const isActive = item.value === value;
					const activeItemRef = isActive && activeRef;
					return (
						<button
							key={item.value}
							ref={activeItemRef || undefined}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => onValueChange(item.value)}
							className={cn(
								'relative flex h-10 items-center gap-1.5 rounded-md px-2 text-[13px] whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
								isActive && 'font-medium text-foreground',
								!isActive && 'text-muted-foreground hover:text-foreground'
							)}
						>
							{item.label}
							{isActive && !box && (
								<span
									aria-hidden="true"
									className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-primary"
								/>
							)}
						</button>
					);
				})}
				{box && (
					<span
						aria-hidden="true"
						style={tabIndicatorStyle(box)}
						className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-t-full bg-primary transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
					/>
				)}
			</div>
		</div>
	);
}

interface CommandListProps extends React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> {
	tabs?: CommandTabItem[];
	activeTab?: string;
	onTabChange?: (value: string) => void;
	tabsLabel?: string;
}

const CommandList = React.forwardRef<React.ElementRef<typeof CommandPrimitive.List>, CommandListProps>(
	({ className, tabs, activeTab, onTabChange, tabsLabel, ...props }, ref) => {
		const hasTabs = Boolean(tabs?.length) && Boolean(onTabChange);
		const list = (
			<CommandPrimitive.List
				ref={ref}
				className={cn('max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden', className)}
				{...props}
			/>
		);
		if (!hasTabs) {
			return list;
		}
		return (
			<>
				<CommandTabs
					label={tabsLabel ?? ''}
					items={tabs ?? []}
					value={activeTab ?? ''}
					onValueChange={(value) => onTabChange?.(value)}
				/>
				{list}
			</>
		);
	}
);

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Empty>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
	<CommandPrimitive.Empty ref={ref} className="py-6 text-center text-[13px] text-muted-foreground" {...props} />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Group>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		ref={ref}
		className={cn(
			'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:h-7 [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-normal [&_[cmdk-group-heading]]:text-muted-foreground',
			className
		)}
		{...props}
	/>
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator ref={ref} className={cn('-mx-1 h-px bg-border', className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem: React.FC<React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>> = React.forwardRef<
	React.ElementRef<typeof CommandPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex min-h-8 cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1 text-[13px] outline-hidden transition-colors data-[disabled=true]:pointer-events-none data-[selected=true]:bg-foreground/5 data-[selected=true]:text-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
			className
		)}
		{...props}
	/>
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn(
				'ml-auto inline-flex shrink-0 items-center gap-1 font-sans text-[11px] font-medium leading-none text-muted-foreground tabular-nums',
				className
			)}
			{...props}
		/>
	);
};
CommandShortcut.displayName = 'CommandShortcut';

const CommandFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
	return (
		<div
			className={cn(
				'flex items-center gap-4 hairline-t border-border px-4 py-2.5 text-xs text-muted-foreground',
				'[&_kbd]:inline-flex [&_kbd]:min-w-5 [&_kbd]:items-center [&_kbd]:justify-center [&_kbd]:rounded-sm [&_kbd]:bg-foreground/5',
				'[&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-sans [&_kbd]:text-[11px] [&_kbd]:font-medium [&_kbd]:leading-none',
				className
			)}
			{...props}
		/>
	);
};
CommandFooter.displayName = 'CommandFooter';

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
	commandKeycapClass,
	commandIconTileClass
};
