import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Listbox, Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import React, { Dispatch, PropsWithChildren, SetStateAction } from 'react';
import { Card } from './card';
import { SpinnerLoader } from './loader';
import { useTranslations } from 'next-intl';

export type DropdownItem<D = Record<string | number | symbol, any>> = {
	key: React.Key;
	Label: (props: { active?: boolean; selected?: boolean }) => JSX.Element;
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
	return (
		<div className={clsxm('rounded-xl', className)}>
			<Listbox value={Value} onChange={onChange} disabled={publicTeam}>
				<Listbox.Button
					className={clsxm(
						'input-border',
						'w-full flex justify-between rounded-xl px-3 py-2 text-sm items-center',
						'font-normal outline-none',
						buttonClassName
					)}
					style={buttonStyle}
				>
					<div title={Value?.itemTitle} className="w-full overflow-hidden text-ellipsis whitespace-nowrap">
						{Value?.selectedLabel || (Value?.Label && <Value.Label />)}
					</div>

					{loading ? (
						<div className="h-[20px] w-[20px]">
							<SpinnerLoader size={20} variant="primary" className="w-full h-full" />
						</div>
					) : !publicTeam ? (
						<ChevronDownIcon
							className={clsxm(
								'ml-2 h-5 w-5 dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80'
							)}
							aria-hidden="true"
						/>
					) : (
						<></>
					)}
				</Listbox.Button>

				<Transition
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
					className={clsxm('absolute z-40')}
				>
					<Listbox.Options
						className={clsxm(
							'shadow-2xl outline-none min-w-full mt-3 h-fit',
							'overflow-hidden rounded-xl outline-none',
							optionsClassName
						)}
					>
						<Card
							shadow="custom"
							className={clsxm(
								' md:px-4 py-4 rounded-x  dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]',
								searchBar && 'w-96'
							)}
							style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
						>
							{searchBar && (
								<div className="sticky top-0 z-40 mb-4 dark:bg-[#1B1D22] bg-white border-b">
									<input
										placeholder={t('pages.settingsPersonal.TIMEZONE_SEARCH_PLACEHOLDER')}
										className="w-full h-7 focus:outline-0 rounded-md dark:bg-[#1B1D22] dark:text-white"
										onChange={setSearchText && ((e) => setSearchText(e.target.value))}
									/>
								</div>
							)}
							<section className={"max-h-[9.125rem] overflow-y-auto"}>
							{items.map((Item, index) => (
								<Listbox.Option
									key={Item.key ? Item.key : index}
									value={Item}
									disabled={!!Item.disabled}
								>
									{({ active, selected }) => {
										return Item.Label ? <Item.Label active={active} selected={selected} /> : <></>;
									}}
								</Listbox.Option>
							))}
							</section>

							{/* Additional content */}
							{closeOnChildrenClick && <Listbox.Button as="div">{children}</Listbox.Button>}
							{!closeOnChildrenClick && children}
						</Card>
					</Listbox.Options>
				</Transition>
			</Listbox>
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
		<Popover className="relative">
			<Popover.Button>{children}</Popover.Button>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className={clsxm('absolute z-10 right-0', className)}
			>
				<Popover.Panel>
					<Card shadow="custom" className="!px-5 shadow-lg text-lg !py-3">
						<ul className="flex flex-col">
							<li className="w-full mb-2 font-semibold text-primary dark:text-white">
								<Popover.Button className="w-full" onClick={onConfirm}>
									{confirmText}
								</Popover.Button>
							</li>
							<li className="w-full text-sm">
								<Popover.Button>Cancel</Popover.Button>
							</li>
						</ul>
					</Card>
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}
