import { Fragment, useCallback, useMemo, useState } from 'react';
import { InputField } from 'lib/components';
import { useTimezoneSettings } from '@app/hooks';
import moment from 'moment-timezone';
import _debounce from 'lodash/debounce';
import { Listbox } from '@headlessui/react';
import { cn } from '../utils';
import { CheckIcon, ChevronDown, Search } from 'lucide-react';
import { ScrollArea } from '@components/ui/scroll-area';
import { ScrollBar } from '@components/ui/scroll-bar';

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

	const filteredSearchResult = useMemo(() => searchTerm
	? items.filter((t) => t.value.toLowerCase().includes(searchTerm.toLowerCase()))
	: items, [items, searchTerm])

	const handleChange = useCallback(
		(timeZone : string) => {
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
		<div className={cn("relative w-full", className)}>
			<Listbox value={currentTimezone} onChange={handleChange}>
				<Listbox.Button
					className={cn(
						'w-full font-medium text-sm rounded-xl  input-border flex items-center justify-between text-left px-2 py-1 h-[54px]'
					)}
				>
					<span className={cn('  capitalize', !currentTimezone?.length && 'text-gray-400')}>
						{items?.find((el) => el.value.toLowerCase() == currentTimezone.toLowerCase())?.value ||
							'Pick a timezone'}
					</span>

					<ChevronDown size={15} className=" text-gray-400" />
				</Listbox.Button>
				<Listbox.Options
					className={cn(
						'absolute z-20 text-xs top-14 border space-y-1 w-full bg-white dark:bg-dark--theme rounded-md p-1 shadow-md'
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
							className=" text-sm h-full border-none bg-transparent dark:bg-transparent"
							noWrapper
						/>
					</div>

					<ScrollArea className="h-72 flex flex-col gap-1">
						{filteredSearchResult?.map((item) => (
							<Listbox.Option key={item.id} value={item.value.toLowerCase()} as={Fragment}>
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
							</Listbox.Option>
						))}
						<ScrollBar className="-pl-7" />
					</ScrollArea>
				</Listbox.Options>
			</Listbox>
		</div>
	);
};
