'use client';

import React, { Dispatch, KeyboardEvent, PropsWithChildren, SetStateAction, useCallback, useState } from 'react';
import { Transition, Combobox, ComboboxOption, ComboboxOptions, ComboboxInput } from '@headlessui/react';
import { clsxm } from '@/core/lib/utils';
import { Text } from './typography';
import { controlRecipe } from './input';
import { popoverSurfaceRecipe } from './popover';
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
	/** Anchors the options to the input in a portal, so opening them never pushes the content below. */
	anchored?: boolean;
	inputClassName?: string;
	newItemLabel?: (query: string) => React.ReactNode;
} & PropsWithChildren;

function defaultNewItemLabel(query: string) {
	return <div className="flex justify-between">{query}</div>;
}

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
	selectedEmail,
	anchored = false,
	inputClassName,
	newItemLabel
}: Props<T>) {
	const [query, setQuery] = useState('');
	let filteredItem = items;

	if (query !== '') {
		filteredItem = items.filter((item) => {
			return `${item?.data?.title || ''}`.toLowerCase().includes(query.toLowerCase());
		});
	}

	const renderNewItem = newItemLabel ?? defaultNewItemLabel;

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

	const optionList = (
		<div className={clsxm('flex flex-col justify-center p-1', popoverSurfaceRecipe)}>
			{query && handleAddNew && (
				<ComboboxOption
					key={'new'}
					value={query}
					onClick={() => {
						handleAddNew(query);
					}}
					className="flex items-center self-stretch h-full cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors data-focus:bg-foreground/5"
				>
					{renderNewItem(query)}
				</ComboboxOption>
			)}
			{filteredItem.map((Item, index) => (
				<ComboboxOption key={Item.key ? Item.key : index} value={Item} disabled={Item.disabled}>
					{({ focus, selected }) => {
						return Item.Label ? <Item.Label active={focus} selected={selected} /> : <div></div>;
					}}
				</ComboboxOption>
			))}

			{/* Additional content */}
			<div className="mt-2">{children}</div>
		</div>
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
						controlRecipe,
						'flex h-9 items-center justify-between px-2.5 py-1',
						'font-normal',
						buttonClassName,
						inputClassName
					)}
					displayValue={(item: T) => item?.data?.title}
					autoFocus
					onKeyUp={handleKeyUp}
					value={query}
				/>

				{anchored && (
					<ComboboxOptions
						anchor={{ to: 'bottom start', gap: 6 }}
						transition
						className={clsxm(
							'z-[1000] max-h-64 w-(--input-width) min-w-64 overflow-y-auto outline-none transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0',
							optionsClassName
						)}
					>
						{optionList}
					</ComboboxOptions>
				)}
				{!anchored && (
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
								'mt-1 min-w-full max-h-64',
								'overflow-hidden overflow-y-auto',
								optionsClassName
							)}
						>
							{optionList}
						</ComboboxOptions>
					</Transition>
				)}
			</Combobox>
			{error && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
		</div>
	);
}
