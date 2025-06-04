import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { cn } from '@/core/lib/helpers';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { Dispatch, PropsWithChildren, SetStateAction, useEffect, useState } from 'react';
import { SpinnerLoader } from './loader';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/core/components/common/scroll-bar';
import { EverCard } from '../common/ever-card';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { PopoverClose } from '@radix-ui/react-popover';
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
		<div className={clsxm('rounded-xl relative', className)}>
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
					'input-border',
					'w-full flex justify-between rounded-xl px-3 py-2 text-sm items-center',
					'font-normal outline-none',
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
						<ChevronUp className="w-5 h-5 ml-2 transition-transform duration-150 ease-in-out dark:text-white" />
					) : (
						<ChevronDown className="w-5 h-5 ml-2 transition-transform duration-150 ease-in-out dark:text-white" />
					)
				) : null}
			</button>

			{/* Dropdown content */}
			{open && (
				<div className={clsxm('absolute z-40 min-w-full mt-2', optionsClassName)}>
					<EverCard
						shadow="custom"
						className={clsxm(
							'md:px-4 py-2 rounded-xl dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]',
							searchBar && 'w-96'
						)}
						style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
					>
						{/* Search input */}
						{searchBar && (
							<div className="sticky top-0 z-40 mb-4 dark:bg-[#1B1D22] bg-white border-b">
								<input
									placeholder={t('pages.settingsPersonal.TIMEZONE_SEARCH_PLACEHOLDER')}
									className="w-full h-7 focus:outline-0 rounded-md dark:bg-[#1B1D22] dark:text-white"
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
											'relative flex items-center  py-1 rounded-md cursor-pointer',
											Value?.key === Item.key && 'bg-accent text-accent-foreground',
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
			<PopoverContent
				className={clsxm(
					'z-10 border shadow-none h-fit bg-light--theme-light dark:bg-dark--theme-light rounded-[16px] px-4 p-4 border-light--theme-border dark:border-dark--theme-border',
					className
				)}
				sideOffset={5}
				align="end"
			>
				<ul className="flex flex-col p-2 gap-y-2.5">
					<li className="w-full font-medium text-primary dark:text-white">
						<button className="w-full text-left" onClick={onConfirm}>
							{confirmText}
						</button>
					</li>
					<li className="w-full text-sm">
						<PopoverClose asChild>
							<button className="w-full text-left text-red-500">Cancel</button>
						</PopoverClose>
					</li>
				</ul>
			</PopoverContent>
		</Popover>
	);
}
