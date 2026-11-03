'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';
import {
	ChangeEvent,
	CSSProperties,
	Fragment,
	KeyboardEvent,
	MouseEvent,
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState
} from 'react';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { commandKeycapClass } from '@/core/components/common/command';
import { cn } from '@/core/lib/helpers';

export interface TaskPropertyMenuOption<V> {
	key: string;
	value: V;
	label: string;
	icon?: ReactNode;
	group?: string;
}

interface TaskPropertyMenuProps<V> {
	options: TaskPropertyMenuOption<V>[];
	isSelected: (value: V) => boolean;
	onSelect: (value: V) => void;
	searchPlaceholder: string;
	/** The trigger. Left out when the menu is opened by its owner and anchored to an element of its choosing. */
	children?: ReactNode;
	triggerClassName?: string;
	triggerStyle?: CSSProperties;
	triggerLabel?: string;
	multiple?: boolean;
	disabled?: boolean;
	/** A function receives the search query, for a "Create …" row that names what was typed. */
	footer?: ReactNode | ((query: string) => ReactNode);
	align?: 'start' | 'center' | 'end';
	popupClassName?: string;
	optionLabelClassName?: string;
	/** Opened and closed by the owner (one menu shared by a whole list), anchored to `anchor`. */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onOpenChangeComplete?: (open: boolean) => void;
	anchor?: Element | null;
	/** The key that opened this menu from the keyboard, shown as a key cap on the search line. */
	searchShortcut?: string;
	/** Off where a typed digit starts a search, as in a list of task numbers. */
	digitShortcuts?: boolean;
}

const SHORTCUT_COUNT = 9;

/** The digit that picks a row, as the palette's key caps and the team switcher's counts. */
const SHORTCUT_KEYCAP = cn(commandKeycapClass, 'tabular-nums');

export const MENU_POPUP_RECIPE =
	'surface-raised flex w-60 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[12px] text-popover-foreground outline-hidden origin-(--transform-origin) transition-[opacity,scale] duration-150 data-starting-style:scale-[0.98] data-starting-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:opacity-0';

export const MENU_ROW_RECIPE =
	'flex h-8 w-full cursor-pointer select-none items-center gap-2 rounded-[6px] px-2 text-[13px] text-foreground outline-none';

const TaskPropertyMenuCloseContext = createContext<() => void>(() => undefined);

export function toggleMenuSelection(values: string[], pickedValue: string) {
	const isAlreadySelected = values.includes(pickedValue);
	if (isAlreadySelected) {
		return values.filter((selected) => selected !== pickedValue);
	}
	return [...values, pickedValue];
}

function matchesQuery(label: string, query: string) {
	const normalizedLabel = label.toLowerCase();
	const normalizedQuery = query.trim().toLowerCase();
	return normalizedLabel.includes(normalizedQuery);
}

function wrapIndex(index: number, length: number) {
	const remainder = index % length;
	return (remainder + length) % length;
}

function hasModifierKey(event: KeyboardEvent<HTMLInputElement>) {
	const hasCommandModifier = event.metaKey || event.ctrlKey;
	return hasCommandModifier || event.altKey;
}

function shortcutIndexFromKey(key: string, query: string, optionCount: number) {
	if (query !== '') {
		return null;
	}
	const isShortcutDigit = /^[1-9]$/.test(key);
	if (!isShortcutDigit) {
		return null;
	}
	const index = Number(key) - 1;
	if (index >= optionCount) {
		return null;
	}
	return index;
}

function shortcutLabel(index: number, showsShortcuts: boolean) {
	if (!showsShortcuts) {
		return null;
	}
	if (index >= SHORTCUT_COUNT) {
		return null;
	}
	return index + 1;
}

function emptyMessageKey(hasOptions: boolean) {
	if (hasOptions) {
		return 'taskMenus.noResults';
	}
	return 'taskMenus.noOptions';
}

function footerFor(footer: TaskPropertyMenuProps<unknown>['footer'], query: string) {
	if (typeof footer === 'function') {
		return footer(query);
	}
	return footer;
}

function dataFlag(isOn: boolean) {
	if (!isOn) {
		return undefined;
	}
	return '';
}

function optionElementId(baseId: string, option: unknown, index: number) {
	if (!option) {
		return undefined;
	}
	return `${baseId}-${index}`;
}

function keepFocusInSearch(event: MouseEvent<HTMLDivElement>) {
	event.preventDefault();
}

function initialIndexOf<V>(options: TaskPropertyMenuOption<V>[], isSelected: (value: V) => boolean) {
	const selectedIndex = options.findIndex((option) => isSelected(option.value));
	return Math.max(selectedIndex, 0);
}

/** Focus goes back to the element the menu was anchored to when the owner opened it without a trigger. */
function finalFocusOf(anchor: Element | null | undefined) {
	if (!(anchor instanceof HTMLElement)) {
		return undefined;
	}
	const element: HTMLElement = anchor;
	return () => element;
}

function openStateOf(controlledOpen: boolean | undefined, uncontrolledOpen: boolean) {
	if (controlledOpen === undefined) {
		return uncontrolledOpen;
	}
	return controlledOpen;
}

interface TaskPropertyMenuRowProps {
	id: string;
	label: string;
	icon?: ReactNode;
	isHighlighted: boolean;
	isChecked: boolean;
	shortcut: number | null;
	labelClassName?: string;
	onHighlight: () => void;
	onPick: () => void;
}

function TaskPropertyMenuRow({
	id,
	label,
	icon,
	isHighlighted,
	isChecked,
	shortcut,
	labelClassName,
	onHighlight,
	onPick
}: Readonly<TaskPropertyMenuRowProps>) {
	const hasShortcut = shortcut !== null;
	return (
		<div
			id={id}
			role="option"
			tabIndex={-1}
			aria-selected={isChecked}
			data-highlighted={dataFlag(isHighlighted)}
			onMouseMove={onHighlight}
			onMouseDown={keepFocusInSearch}
			onClick={onPick}
			className={cn(MENU_ROW_RECIPE, 'data-highlighted:bg-foreground/5')}
		>
			<span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
			<span className={cn('min-w-0 flex-1 truncate', labelClassName)}>{label}</span>
			{isChecked && <SelectedMark />}
			{hasShortcut && <kbd className={SHORTCUT_KEYCAP}>{shortcut}</kbd>}
		</div>
	);
}

export function TaskPropertyMenu<V>({
	options,
	isSelected,
	onSelect,
	searchPlaceholder,
	children,
	triggerClassName,
	triggerStyle,
	triggerLabel,
	multiple = false,
	disabled = false,
	footer,
	align = 'start',
	popupClassName,
	optionLabelClassName,
	open: controlledOpen,
	onOpenChange,
	onOpenChangeComplete,
	anchor,
	searchShortcut,
	digitShortcuts = true
}: Readonly<TaskPropertyMenuProps<V>>) {
	const t = useTranslations();
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [highlightedIndex, setHighlightedIndex] = useState(() => initialIndexOf(options, isSelected));
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const scrollsToHighlight = useRef(true);
	const open = openStateOf(controlledOpen, uncontrolledOpen);
	const isAnchoredByOwner = anchor !== undefined;
	const hasSearchShortcut = Boolean(searchShortcut);
	const baseId = useId();
	const listId = `${baseId}-options`;

	const visibleOptions = useMemo(
		() => options.filter((option) => matchesQuery(option.label, query)),
		[options, query]
	);
	const hasOptions = options.length > 0;
	const hasVisibleOptions = visibleOptions.length > 0;
	const showsShortcuts = digitShortcuts && query === '';
	const lastVisibleIndex = visibleOptions.length - 1;
	const activeIndex = Math.min(highlightedIndex, lastVisibleIndex);
	const activeOption = visibleOptions[activeIndex];
	const activeOptionId = optionElementId(baseId, activeOption, activeIndex);
	const footerContent = footerFor(footer, query);

	const setOpen = useCallback(
		(nextOpen: boolean) => {
			setUncontrolledOpen(nextOpen);
			onOpenChange?.(nextOpen);
		},
		[onOpenChange]
	);

	const closeMenu = useCallback(() => setOpen(false), [setOpen]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				return;
			}
			setQuery('');
			setHighlightedIndex(initialIndexOf(options, isSelected));
			scrollsToHighlight.current = true;
		},
		[options, isSelected, setOpen]
	);

	const pickOption = useCallback(
		(option: TaskPropertyMenuOption<V> | undefined) => {
			if (!option) {
				return;
			}
			onSelect(option.value);
			if (multiple) {
				return;
			}
			setOpen(false);
		},
		[onSelect, multiple, setOpen]
	);

	const moveHighlight = useCallback(
		(step: number) => {
			if (!hasVisibleOptions) {
				return;
			}
			const nextIndex = wrapIndex(activeIndex + step, visibleOptions.length);
			scrollsToHighlight.current = true;
			setHighlightedIndex(nextIndex);
		},
		[hasVisibleOptions, activeIndex, visibleOptions.length]
	);

	const handleQueryChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setQuery(event.target.value);
		setHighlightedIndex(0);
		scrollsToHighlight.current = true;
	}, []);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.nativeEvent.isComposing) {
				return;
			}
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				moveHighlight(1);
				return;
			}
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				moveHighlight(-1);
				return;
			}
			if (event.key === 'Enter') {
				event.preventDefault();
				pickOption(activeOption);
				return;
			}
			if (hasModifierKey(event)) {
				return;
			}
			if (!digitShortcuts) {
				return;
			}
			const shortcutIndex = shortcutIndexFromKey(event.key, query, visibleOptions.length);
			if (shortcutIndex === null) {
				return;
			}
			event.preventDefault();
			pickOption(visibleOptions[shortcutIndex]);
		},
		[moveHighlight, pickOption, activeOption, query, visibleOptions, digitShortcuts]
	);

	useEffect(() => {
		if (!scrollsToHighlight.current) {
			return;
		}
		scrollsToHighlight.current = false;
		const highlightedRow = listRef.current?.querySelector('[data-highlighted]');
		highlightedRow?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex, open]);

	return (
		<PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
			{!isAnchoredByOwner && (
				<PopoverPrimitive.Trigger
					disabled={disabled}
					aria-label={triggerLabel}
					style={triggerStyle}
					className={cn(
						'cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default',
						triggerClassName
					)}
				>
					{children}
				</PopoverPrimitive.Trigger>
			)}
			<PopoverPrimitive.Portal>
				<PopoverPrimitive.Positioner
					className="z-[1000] outline-hidden"
					side="bottom"
					align={align}
					sideOffset={4}
					collisionPadding={8}
					anchor={anchor}
				>
					<PopoverPrimitive.Popup
						initialFocus={inputRef}
						finalFocus={finalFocusOf(anchor)}
						data-dropdown=""
						className={cn(MENU_POPUP_RECIPE, popupClassName)}
					>
						<TaskPropertyMenuCloseContext.Provider value={closeMenu}>
							<div className="flex h-9 shrink-0 items-center gap-2 hairline-b border-border px-3">
								<input
									ref={inputRef}
									type="text"
									role="combobox"
									aria-expanded={true}
									aria-controls={listId}
									aria-activedescendant={activeOptionId}
									aria-autocomplete="list"
									aria-label={searchPlaceholder}
									placeholder={searchPlaceholder}
									value={query}
									onChange={handleQueryChange}
									onKeyDown={handleKeyDown}
									autoComplete="off"
									spellCheck={false}
									className="h-full w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
								/>
								{hasSearchShortcut && <kbd className={SHORTCUT_KEYCAP}>{searchShortcut}</kbd>}
							</div>
							<div
								ref={listRef}
								id={listId}
								role="listbox"
								aria-multiselectable={multiple}
								className="max-h-72 overflow-y-auto overscroll-contain p-1"
							>
								{visibleOptions.map((option, index) => {
									const previousGroup = visibleOptions[index - 1]?.group;
									const hasGroup = Boolean(option.group);
									const startsGroup = hasGroup && option.group !== previousGroup;
									return (
										<Fragment key={option.key}>
											{startsGroup && (
												<div
													role="presentation"
													className="flex h-7 items-center px-2 text-xs text-muted-foreground"
												>
													{option.group}
												</div>
											)}
											<TaskPropertyMenuRow
												id={`${baseId}-${index}`}
												label={option.label}
												icon={option.icon}
												isHighlighted={index === activeIndex}
												isChecked={isSelected(option.value)}
												shortcut={shortcutLabel(index, showsShortcuts)}
												labelClassName={optionLabelClassName}
												onHighlight={() => setHighlightedIndex(index)}
												onPick={() => pickOption(option)}
											/>
										</Fragment>
									);
								})}
								{!hasVisibleOptions && (
									<div className="flex h-8 items-center px-2 text-[13px] text-muted-foreground">
										{t(emptyMessageKey(hasOptions))}
									</div>
								)}
							</div>
							{footerContent && (
								<div className="shrink-0 hairline-t border-border p-1">{footerContent}</div>
							)}
						</TaskPropertyMenuCloseContext.Provider>
					</PopoverPrimitive.Popup>
				</PopoverPrimitive.Positioner>
			</PopoverPrimitive.Portal>
		</PopoverPrimitive.Root>
	);
}

interface TaskPropertyMenuActionProps {
	icon?: ReactNode;
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}

export function TaskPropertyMenuAction({
	icon,
	children,
	onClick,
	disabled = false
}: Readonly<TaskPropertyMenuActionProps>) {
	const closeMenu = useContext(TaskPropertyMenuCloseContext);

	const handleClick = useCallback(() => {
		closeMenu();
		onClick();
	}, [closeMenu, onClick]);

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={handleClick}
			className={cn(
				MENU_ROW_RECIPE,
				'transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5 disabled:pointer-events-none disabled:opacity-50'
			)}
		>
			<span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
				{icon}
			</span>
			<span className="min-w-0 flex-1 truncate text-left">{children}</span>
		</button>
	);
}
