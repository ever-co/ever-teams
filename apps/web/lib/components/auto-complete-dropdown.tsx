import React, {
	Dispatch,
	KeyboardEvent,
	PropsWithChildren,
	SetStateAction,
	useCallback,
	useState,
} from 'react';
import { Transition, Combobox } from '@headlessui/react';
import { clsxm } from '@app/utils';
import { Card } from './card';
import { Text } from './typography';

type DropdownItem<D = { [x: string]: any }> = {
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
	placeholder?: string;
	handleAddNew?: any;
	disabled?: boolean;
	error?: string;
	useHandleKeyUp?: boolean;
} & PropsWithChildren;

export function AutoCompleteDropdown<T extends DropdownItem>({
	className,
	buttonClassName,
	children,
	value: Value,
	onChange,
	items,
	optionsClassName,
	placeholder,
	handleAddNew,
	disabled = false,
	error = '',
	useHandleKeyUp = false,
}: Props<T>) {
	const [query, setQuery] = useState('');
	let filteredItem = items;

	if (query !== '') {
		filteredItem = items.filter((item) => {
			return `${item?.data?.title || ''}`
				.toLowerCase()
				.includes(query.toLowerCase());
		});
	}

	const handleKeyUp = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key === 'Enter' && handleAddNew && useHandleKeyUp) {
				handleAddNew(query);
			}
		},
		[query, handleAddNew, useHandleKeyUp]
	);

	return (
		<div className={clsxm('relative', className)}>
			<Combobox value={Value} onChange={onChange} disabled={disabled}>
				<Combobox.Input
					placeholder={placeholder}
					onChange={(event) => setQuery(event.target.value)}
					className={clsxm(
						'input-border',
						'w-full flex justify-between rounded-[0.625rem] px-3 py-2 text-sm items-center bg-transparent',
						'bg-light--theme-light dark:bg-dark--theme-light outline-none',
						'font-normal',
						buttonClassName
					)}
					displayValue={(item: T) => item?.data?.title}
					autoFocus
					onKeyUp={handleKeyUp}
				/>

				<Transition
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<Combobox.Options
						className={clsxm(
							'absolute mt-3 min-w-full max-h-64',
							'overflow-hidden overflow-y-auto',
							optionsClassName
						)}
					>
						<Card
							shadow="custom"
							className="md:px-4 py-4 rounded-[12px]"
							style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
						>
							{/* This should only show when New item needs to be created */}
							{query && handleAddNew && (
								<Combobox.Option
									key={'new'}
									value={query}
									onClick={() => {
										handleAddNew(query);
									}}
									className="font-medium cursor-pointer mb-3"
								>
									<div className="flex justify-between">{`${query}`}</div>
								</Combobox.Option>
							)}
							{filteredItem.map((Item, index) => (
								<Combobox.Option
									key={Item.key ? Item.key : index}
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
								</Combobox.Option>
							))}

							{/* Additional content */}
							<Combobox.Button as="div">{children}</Combobox.Button>
						</Card>
					</Combobox.Options>
				</Transition>
			</Combobox>
			{error && (
				<Text.Error className="self-start justify-self-start">
					{error}
				</Text.Error>
			)}
		</div>
	);
}
