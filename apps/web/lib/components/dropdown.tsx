import React, { Dispatch, PropsWithChildren, SetStateAction } from 'react';
import { Listbox, Popover, Transition } from '@headlessui/react';
import { clsxm } from '@app/utils';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Card } from './card';
import { SpinnerLoader } from './loader';
import { IClassName } from '@app/interfaces';

export type DropdownItem<D = { [x: string]: any }> = {
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
}: Props<T>) {
	return (
		<div className={clsxm('rounded-xl', className)}>
			<Listbox value={Value} onChange={onChange} disabled={publicTeam}>
				<Listbox.Button
					className={clsxm(
						'input-border',
						'w-full flex justify-between rounded-xl px-3 py-2 text-sm items-center',
						'font-normal',
						buttonClassName
					)}
					style={buttonStyle}
				>
					<div
						title={Value?.itemTitle}
						className="overflow-hidden text-ellipsis whitespace-nowrap w-full"
					>
						{Value?.selectedLabel || (Value?.Label && <Value.Label />)}
					</div>

					{loading ? (
						<div className="h-[20px] w-[20px]">
							<SpinnerLoader
								size={20}
								variant="primary"
								className="w-full h-full"
							/>
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
				>
					<Listbox.Options
						className={clsxm(
							'absolute mt-3 min-w-full max-h-64',
							'overflow-hidden overflow-y-auto rounded-xl',
							optionsClassName
						)}
					>
						<Card
							shadow="custom"
							className="md:px-4 py-4 rounded-x"
							style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
						>
							{items.map((Item, index) => (
								<Listbox.Option
									key={Item.key ? Item.key : index}
									value={Item}
									disabled={Item?.disabled}
								>
									{({ active, selected }) => {
										return Item.Label ? (
											<Item.Label active={active} selected={selected} />
										) : (
											<></>
										);
									}}
								</Listbox.Option>
							))}

							{/* Additional content */}
							{closeOnChildrenClick && (
								<Listbox.Button as="div">{children}</Listbox.Button>
							)}
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
	className,
}: PropsWithChildren<
	{ onConfirm?: () => void; confirmText?: string } & IClassName
>) {
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
							<li className="text-primary dark:text-white font-semibold mb-2 w-full">
								<Popover.Button className="w-full" onClick={onConfirm}>
									{confirmText}
								</Popover.Button>
							</li>
							<li className="text-sm w-full">
								<Popover.Button>Cancel</Popover.Button>
							</li>
						</ul>
					</Card>
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}
