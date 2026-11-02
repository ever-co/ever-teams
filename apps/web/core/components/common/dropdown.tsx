import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { cn } from '@/core/lib/helpers';
import { ChevronDown, ChevronUp } from '@/core/components/icons';
import React, { Dispatch, PropsWithChildren, SetStateAction, useEffect, useState } from 'react';
import { SpinnerLoader } from './loader';
import { controlRecipe } from './input';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { EverCard } from '../common/ever-card';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './popover';
export type DropdownItem<D = Record<string | number | symbol, any>> = {
	key: React.Key;
	Label: React.ComponentType<{ active?: boolean; selected?: boolean }>;
	selectedLabel?: React.ReactNode;
	itemTitle?: string;
	disabled?: boolean;
	data?: D;
};

type Props<T extends DropdownItem> = {
	className?: string;
	value?: T | null;
	onChange?: Dispatch<SetStateAction<T | undefined>> | ((item: T) => void);
	buttonClassName?: string;
	optionsClassName?: string;
	items: T[];
	loading?: boolean;
	buttonStyle?: React.CSSProperties;
	publicTeam?: boolean;
	closeOnChildrenClick?: boolean;
	cardClassName?: string;
	searchBar?: boolean;
	setSearchText?: React.Dispatch<React.SetStateAction<string>> | ((e: string) => void);
} & PropsWithChildren;

export function Dropdown<T extends DropdownItem>({
	className,
	buttonClassName,
	children,
	value: Value,
	onChange,
	items,
	loading,
	buttonStyle,
	optionsClassName,
	publicTeam,
	closeOnChildrenClick = true,
	searchBar = false,
	setSearchText
}: Props<T>) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [searchValue, setSearchValue] = useState('');

	// Handle search text updates
	useEffect(() => {
		if (setSearchText) {
			setSearchText(searchValue);
		}
	}, [searchValue, setSearchText]);

	const handleSelect = (item: T) => {
		if (onChange) onChange(item);
		setOpen(false);
	};

	const selectedItem = items.find((item) => item.key === Value?.key);
	const otherItems = items.filter((item) => item.key !== Value?.key);
	const orderedItems = selectedItem ? [selectedItem, ...otherItems] : items;

	return (
		<div className={clsxm('relative', className)}>
			{/* Backdrop for clicking outside */}
			{open && (
				<div
					onClick={() => setOpen(false)}
					className="fixed top-0 left-0 z-30 w-screen h-screen bg-transparent"
				></div>
			)}

			{/* Custom trigger button */}
			<button
				type="button"
				className={clsxm(
					controlRecipe,
					'flex items-center justify-between gap-2 px-3 py-1.5 text-left font-normal',
					'disabled:pointer-events-auto disabled:cursor-default disabled:opacity-100',
					buttonClassName
				)}
				onClick={() => !publicTeam && setOpen(!open)}
				style={buttonStyle}
				disabled={publicTeam}
			>
				<div title={Value?.itemTitle} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
					{Value?.selectedLabel || (Value?.Label && <Value.Label />)}
				</div>

				{loading ? (
					<div className="w-5 h-5">
						<SpinnerLoader size={20} variant="primary" className="w-full h-full" />
					</div>
				) : !publicTeam ? (
					open ? (
						<ChevronUp className="size-4 shrink-0 text-muted-foreground" />
					) : (
						<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
					)
				) : null}
			</button>

			{/* Dropdown content */}
			{open && (
				<div className={clsxm('absolute z-40 min-w-full mt-1', optionsClassName)}>
					<EverCard
						shadow="bigger"
						className={clsxm('bg-popover p-1 text-popover-foreground md:px-1', searchBar && 'w-96')}
					>
						{/* Search input */}
						{searchBar && (
							<div className="sticky top-0 z-40 mb-1 hairline-b border-border bg-popover">
								<input
									placeholder={t('pages.settingsPersonal.TIMEZONE_SEARCH_PLACEHOLDER')}
									className="h-9 w-full bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/75"
									value={searchValue}
									onChange={(e) => setSearchValue(e.target.value)}
								/>
							</div>
						)}

						{/* Items list */}
						<ScrollArea>
							<section className="max-h-96 min-w-[100px]">
								{orderedItems.map((Item, index) => (
									<div
										key={Item.key ? Item.key : index}
										className={cn(
											'relative flex cursor-pointer items-center rounded-md py-1 transition-colors hover:bg-foreground/5',
											Value?.key === Item.key && 'bg-foreground/5 text-foreground',
											Item.disabled && 'opacity-50 cursor-not-allowed'
										)}
										onClick={() => !Item.disabled && handleSelect(Item)}
									>
										<div className="w-full px-1">
											{Item.Label ? (
												<Item.Label
													active={Value?.key === Item.key}
													selected={Value?.key === Item.key}
												/>
											) : null}
										</div>
									</div>
								))}
							</section>
						</ScrollArea>

						{/* Additional content */}
						{closeOnChildrenClick && <div className="mt-2">{children}</div>}
						{!closeOnChildrenClick && children}
					</EverCard>
				</div>
			)}
		</div>
	);
}

export function ConfirmDropdown({
	children,
	onConfirm,
	confirmText = 'Confirm',
	className
}: PropsWithChildren<{ onConfirm?: () => void; confirmText?: string } & IClassName>) {
	return (
		<Popover>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent className={clsxm('h-fit w-auto min-w-40 p-1', className)} sideOffset={5} align="end">
				<ul className="flex flex-col">
					<li className="w-full">
						<button
							className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm font-medium text-destructive-ink outline-none transition-colors hover:bg-destructive/10 focus-visible:bg-destructive/10"
							onClick={onConfirm}
						>
							{confirmText}
						</button>
					</li>
					<li className="w-full">
						<PopoverClose asChild>
							<button className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5">
								Cancel
							</button>
						</PopoverClose>
					</li>
				</ul>
			</PopoverContent>
		</Popover>
	);
}
