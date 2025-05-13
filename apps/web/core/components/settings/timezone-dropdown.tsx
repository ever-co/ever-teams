import { useCallback, useMemo, useState } from 'react';
import { InputField } from '@/core/components';
import { useTimezoneSettings } from '@/core/hooks';
import moment from 'moment-timezone';
import _debounce from 'lodash/debounce';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { cn } from '@/core/lib/helpers';
import { CheckIcon, ChevronDown, Search } from 'lucide-react';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { ScrollBar } from '@/core/components/common/scroll-bar';

const allTimezonesNames = moment.tz.names();

export const TimezoneDropDown = ({
	currentTimezone,
	onChange,
	className
}: {
	currentTimezone: string;
	onChange: (timeZone: string) => void;
	className?: string;
}) => {
	const { setActiveTimezone } = useTimezoneSettings();
	const [searchTerm, setSearchTerm] = useState<string>('');

	const items = useMemo(() => {
		const allTimezonesWithUTC = allTimezonesNames.map((item) => {
			const offset = moment.tz(item).format('Z');
			return { value: `${item} (UTC ${offset})`, offset: offset, id: `${item}-${offset}`.toLowerCase() };
		});

		allTimezonesWithUTC.sort((a, b) => {
			// Compare the offsets for sorting
			if (a.offset < b.offset) {
				return -1;
			}
			if (a.offset > b.offset) {
				return 1;
			}
			return 0;
		});

		return allTimezonesWithUTC;
	}, []);

	const filteredSearchResult = useMemo(
		() => (searchTerm ? items.filter((t) => t.value.toLowerCase().includes(searchTerm.toLowerCase())) : items),
		[items, searchTerm]
	);

	const handleChange = useCallback(
		(timeZone: string) => {
			onChange(timeZone);
			setActiveTimezone(timeZone);
		},
		[onChange, setActiveTimezone]
	);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const debouncedSetSearchText = useCallback(_debounce(setSearchTerm, 300), []);

	const handleSearchChange = (e: string) => {
		debouncedSetSearchText(e);
	};

	return (
		<div className={cn('relative w-full', className)}>
			<Listbox value={currentTimezone} onChange={handleChange}>
				<ListboxButton
					className={cn(
						'w-full font-medium text-sm rounded-xl  input-border flex items-center justify-between text-left px-2 py-1 h-[54px] dark:bg-dark--theme-light'
					)}
				>
					<span className={cn('  capitalize', !currentTimezone?.length && 'text-gray-400')}>
						{items?.find((el) => el.value.toLowerCase() == currentTimezone.toLowerCase())?.value ||
							'Pick a timezone'}
					</span>

					<ChevronDown size={15} className="text-gray-400 " />
				</ListboxButton>
				<ListboxOptions
					className={cn(
						'absolute z-20 text-xs top-14 border space-y-1 w-full bg-white dark:bg-dark--theme-light rounded-md p-1 shadow-md'
					)}
				>
					<div className="w-full flex border dark:border-white rounded-md   h-[2rem] items-center px-1">
						<Search size={15} className=" text-slate-300" />
						<InputField
							value={searchTerm}
							onChange={(e) => {
								handleSearchChange(e.target.value);
							}}
							placeholder={'Search ...'}
							className="h-full text-sm bg-transparent border-none  dark:bg-transparent"
							noWrapper
						/>
					</div>

					<ScrollArea className="flex flex-col gap-1 h-72">
						{filteredSearchResult?.map((item) => (
							<ListboxOption key={item.id} value={item.value.toLowerCase()} as="div">
								{({ selected }) => (
									<li className={cn('text-xs cursor-pointer rounded ')}>
										<div
											className={cn(
												'w-full h-full p-1 px-2 flex items-center gap-2 rounded',
												selected && 'bg-primary text-primary-foreground dark:text-white'
											)}
										>
											{selected && <CheckIcon size={10} />}
											<span className={cn(' capitalize', currentTimezone && !selected && 'pl-5')}>
												{item.value || '-'}
											</span>
										</div>
									</li>
								)}
							</ListboxOption>
						))}
						<ScrollBar className="-pl-7" />
					</ScrollArea>
				</ListboxOptions>
			</Listbox>
		</div>
	);
};
