'use client';

import React, { Dispatch, KeyboardEvent, PropsWithChildren, SetStateAction, useCallback, useState } from 'react';
import { Transition, Combobox, ComboboxOption, ComboboxOptions, ComboboxInput } from '@headlessui/react';
import { clsxm } from '@/core/lib/utils';
import { Text } from './typography';
import { IInviteEmail } from '../teams/invite/invite-email-item';

type DropdownItem<D = { [x: string]: any }> = {
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
	onChange?: (value: T | null) => void;
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
	setSelectedEmail?: Dispatch<SetStateAction<IInviteEmail | undefined>>;
	selectedEmail?: IInviteEmail | undefined;
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
	setSelectedEmail,
	selectedEmail
}: Props<T>) {
	const [query, setQuery] = useState('');
	let filteredItem = items;

	if (query !== '') {
		filteredItem = items.filter((item) => {
			return `${item?.data?.title || ''}`.toLowerCase().includes(query.toLowerCase());
		});
	}

	const handleKeyUp = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key === 'Enter' && handleAddNew && useHandleKeyUp) {
				handleAddNew(query);
			}

			if (event.key === 'Escape') {
				handleAddNew(query);
			}
		},
		[query, handleAddNew, useHandleKeyUp]
	);

	return (
		<div className={clsxm(className)}>
			<Combobox value={Value} onChange={onChange} disabled={disabled}>
				<ComboboxInput
					placeholder={placeholder}
					onChange={(event) => {
						setQuery(event.target.value);
						setSelectedEmail?.({ name: selectedEmail?.name ?? '', title: event.target.value });
					}}
					className={clsxm(
						'input-border ',
						'w-full flex justify-between rounded-[0.625rem] px-3 py-2 text-sm items-center bg-transparent',
						'bg-light--theme-light dark:bg-dark--theme-light outline-none',
						'font-normal',
						buttonClassName
					)}
					displayValue={(item: T) => item?.data?.title}
					autoFocus
					onKeyUp={handleKeyUp}
					value={query}
				/>

				<Transition
					as="div"
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<ComboboxOptions
						className={clsxm(
							'mt-3 min-w-full max-h-64',
							'overflow-hidden overflow-y-auto',
							optionsClassName
						)}
					>
						<div className="flex flex-col justify-center py-2 rounded shadow-md md:px-4 bg-slate-50 card">
							{/* This should only show when New item needs to be created */}
							{query && handleAddNew && (
								<ComboboxOption
									key={'new'}
									value={query}
									onClick={() => {
										handleAddNew(query);
									}}
									className="flex items-center self-stretch h-full font-medium text-gray-900 cursor-pointer"
								>
									<div className="flex justify-between">{`${query}`}</div>
								</ComboboxOption>
							)}
							{filteredItem.map((Item, index) => (
								<ComboboxOption key={Item.key ? Item.key : index} value={Item} disabled={Item.disabled}>
									{({ focus, selected }) => {
										return Item.Label ? (
											<Item.Label active={focus} selected={selected} />
										) : (
											<div></div>
										);
									}}
								</ComboboxOption>
							))}

							{/* Additional content */}
							<div className="mt-2">{children}</div>
						</div>
					</ComboboxOptions>
				</Transition>
			</Combobox>
			{error && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
		</div>
	);
}
