import React, { Dispatch, PropsWithChildren, SetStateAction } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { clsxm } from '@app/utils';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Card } from './card';
import { SpinnerLoader } from './loader';

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
	items: T[];
	loading?: boolean;
	buttonStyle?: React.CSSProperties;
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
}: Props<T>) {
	return (
		<div className={clsxm('relative', className)}>
			<Listbox value={Value} onChange={onChange}>
				<Listbox.Button
					className={clsxm(
						'input-border',
						'w-full flex justify-between rounded-[10px] px-3 py-2 text-sm items-center',
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
					) : (
						<ChevronDownIcon
							className={clsxm(
								'ml-2 h-5 w-5 dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80'
							)}
							aria-hidden="true"
						/>
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
					<Listbox.Options className="absolute mt-3 min-w-full">
						<Card
							shadow="custom"
							className="md:px-4 py-4 rounded-[12px]"
							style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
						>
							{items.map((Item) => (
								<Listbox.Option
									key={Item.key}
									value={Item}
									disabled={Item.disabled}
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
							<Listbox.Button as="div">{children}</Listbox.Button>
						</Card>
					</Listbox.Options>
				</Transition>
			</Listbox>
		</div>
	);
}
