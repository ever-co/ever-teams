'use client';

import { CheckIcon, ChevronDown, XIcon } from 'lucide-react';

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator
} from '../command';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
	type ComponentPropsWithoutRef,
	type ReactNode
} from 'react';
import { Badge } from '../badge';
import { cn } from '@/lib/utils/utils';
import { Button } from '../button';

type MultiSelectContextType = {
	open: boolean;
	setOpen: (open: boolean) => void;
	selectedValues: Set<string>;
	toggleValue: (value: string) => void;
	items: Map<string, ReactNode>;
	onItemAdded: (value: string, label: ReactNode) => void;
};
const MultiSelectContext = createContext<MultiSelectContextType | null>(null);

export function MultiSelect({
	children,
	values,
	defaultValues,
	onValuesChange
}: {
	children: ReactNode;
	values?: string[];
	defaultValues?: string[];
	onValuesChange?: (values: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [internalValues, setInternalValues] = useState(new Set<string>(values ?? defaultValues));
	const selectedValues = values ? new Set(values) : internalValues;
	const [items, setItems] = useState<Map<string, ReactNode>>(new Map());

	function toggleValue(value: string) {
		const getNewSet = (prev: Set<string>) => {
			const newSet = new Set(prev);
			if (newSet.has(value)) {
				newSet.delete(value);
			} else {
				newSet.add(value);
			}
			return newSet;
		};
		setInternalValues(getNewSet);
		onValuesChange?.([...getNewSet(selectedValues)]);
	}

	const onItemAdded = useCallback((value: string, label: ReactNode) => {
		setItems((prev) => {
			if (prev.get(value) === label) return prev;
			return new Map(prev).set(value, label);
		});
	}, []);

	return (
		<MultiSelectContext.Provider
			value={{
				open,
				setOpen,
				selectedValues,
				toggleValue,
				items,
				onItemAdded
			}}
		>
			<Popover open={open} onOpenChange={setOpen} modal={true}>
				{children}
			</Popover>
		</MultiSelectContext.Provider>
	);
}

export function MultiSelectTrigger({
	className,
	children,
	...props
}: {
	className?: string;
	children?: ReactNode;
} & ComponentPropsWithoutRef<typeof Button>) {
	const { open } = useMultiSelectContext();

	return (
		<PopoverTrigger asChild>
			<Button
				{...props}
				variant={props.variant ?? 'outline'}
				role={props.role ?? 'combobox'}
				aria-expanded={props['aria-expanded'] ?? open}
				className={cn(
					"flex h-auto min-h-9 w-fit items-center justify-between gap-2 overflow-hidden rounded-md border border-input bg-transparent px-3 py-1.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
					className
				)}
			>
				{children}
				<ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200 ease-in-out data-[state=open]:rotate-180" />
			</Button>
		</PopoverTrigger>
	);
}

export function MultiSelectValue({
	placeholder,
	clickToRemove = true,
	className,
	overflowBehavior = 'wrap-when-open',
	...props
}: {
	placeholder?: string;
	clickToRemove?: boolean;
	overflowBehavior?: 'wrap' | 'wrap-when-open' | 'cutoff';
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) {
	const { selectedValues, toggleValue, items, open } = useMultiSelectContext();
	const [overflowAmount, setOverflowAmount] = useState(0);
	const valueRef = useRef<HTMLDivElement | null>(null);
	const overflowRef = useRef<HTMLDivElement | null>(null);

	const shouldWrap = overflowBehavior === 'wrap' || (overflowBehavior === 'wrap-when-open' && open);

	const checkOverflow = useCallback(() => {
		if (valueRef.current == null) return;

		const containerElement = valueRef.current;
		const overflowElement = overflowRef.current;
		const items = containerElement.querySelectorAll<HTMLElement>('[data-selected-item]');

		if (overflowElement != null) overflowElement.style.display = 'none';
		items.forEach((child) => child.style.removeProperty('display'));
		let amount = 0;
		for (let i = items.length - 1; i >= 0; i--) {
			const child = items[i]!;
			if (containerElement.scrollWidth <= containerElement.clientWidth) {
				break;
			}
			amount = items.length - i;
			child.style.display = 'none';
			overflowElement?.style.removeProperty('display');
		}
		setOverflowAmount(amount);
	}, []);

	const handleResize = useCallback(
		(node: HTMLDivElement) => {
			valueRef.current = node;

			const mutationObserver = new MutationObserver(checkOverflow);
			const observer = new ResizeObserver(debounce(checkOverflow, 100));

			mutationObserver.observe(node, {
				childList: true,
				attributes: true,
				attributeFilter: ['class', 'style']
			});
			observer.observe(node);

			return () => {
				observer.disconnect();
				mutationObserver.disconnect();
				valueRef.current = null;
			};
		},
		[checkOverflow]
	);

	if (selectedValues.size === 0 && placeholder) {
		return (
			<span className="min-w-0 overflow-hidden font-normal text-gray-400 dark:text-gray-600">{placeholder}</span>
		);
	}

	return (
		<div
			{...props}
			ref={handleResize}
			className={cn('flex w-full gap-1.5 overflow-hidden', shouldWrap && 'h-full flex-wrap', className)}
		>
			{[...selectedValues]
				.filter((value) => items.has(value))
				.map((value) => (
					<Badge
						variant="outline"
						data-selected-item
						className="group flex items-center gap-1"
						key={value}
						onClick={
							clickToRemove
								? (e) => {
										e.stopPropagation();
										toggleValue(value);
									}
								: undefined
						}
					>
						{items.get(value)}
						{clickToRemove && (
							<XIcon className="size-2 text-muted-foreground group-hover:text-destructive" />
						)}
					</Badge>
				))}
			<div
				ref={overflowRef}
				style={{
					display: overflowAmount > 0 && !shouldWrap ? 'inline-flex' : 'none'
				}}
			>
				<Badge variant="outline">+{overflowAmount}</Badge>
			</div>
		</div>
	);
}

export function MultiSelectContent({
	search = true,
	children,
	...props
}: {
	search?: boolean | { placeholder?: string; emptyMessage?: string };
	children: ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof Command>, 'children'>) {
	const canSearch = typeof search === 'object' ? true : search;

	return (
		<>
			<div style={{ display: 'none' }}>
				<Command>
					<CommandList>{children}</CommandList>
				</Command>
			</div>
			<PopoverContent className="min-w-fit p-0">
				<Command {...props}>
					{canSearch ? (
						<CommandInput placeholder={typeof search === 'object' ? search.placeholder : undefined} />
					) : (
						<button autoFocus className="sr-only" />
					)}
					<CommandList>
						{canSearch && (
							<CommandEmpty>{typeof search === 'object' ? search.emptyMessage : undefined}</CommandEmpty>
						)}
						{children}
					</CommandList>
				</Command>
			</PopoverContent>
		</>
	);
}

export function MultiSelectItem({
	value,
	children,
	badgeLabel,
	onSelect,
	...props
}: {
	badgeLabel?: ReactNode;
	value: string;
} & Omit<ComponentPropsWithoutRef<typeof CommandItem>, 'value'>) {
	const { toggleValue, selectedValues, onItemAdded } = useMultiSelectContext();
	const isSelected = selectedValues.has(value);

	useEffect(() => {
		onItemAdded(value, badgeLabel ?? children);
	}, [value, children, onItemAdded, badgeLabel]);

	return (
		<CommandItem
			{...props}
			onSelect={() => {
				toggleValue(value);
				onSelect?.(value);
			}}
		>
			<CheckIcon className={cn('mr-2 size-4', isSelected ? 'opacity-100' : 'opacity-0')} />
			{children}
		</CommandItem>
	);
}

export function MultiSelectGroup(props: ComponentPropsWithoutRef<typeof CommandGroup>) {
	return <CommandGroup {...props} />;
}

export function MultiSelectSeparator(props: ComponentPropsWithoutRef<typeof CommandSeparator>) {
	return <CommandSeparator {...props} />;
}

function useMultiSelectContext() {
	const context = useContext(MultiSelectContext);
	if (context == null) {
		throw new Error('useMultiSelectContext must be used within a MultiSelectContext');
	}
	return context;
}

function debounce<T extends (...args: never[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return function (this: unknown, ...args: Parameters<T>) {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func.apply(this, args), wait);
	};
}
