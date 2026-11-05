import { useCallback, useMemo, useState } from 'react';
import { useTimezoneSettings } from '@/core/hooks';
import moment from 'moment-timezone';
import _debounce from 'lodash/debounce';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { cn } from '@/core/lib/helpers';
import { Check, ChevronDown, Search } from '@/core/components/icons';
import { controlGroupRecipe, controlRecipe } from '@/core/components/common/input';
import { ScrollArea } from '@/core/components/common/scroll-area';
import { ScrollBar } from '@/core/components/common/scroll-bar';
import { InputField } from '../duplicated-components/_input';

const allTimezonesNames = moment.tz.names();

const TRIGGER_CLASS = cn(controlRecipe, 'flex h-9 items-center justify-between gap-2 px-2.5 text-left');
const SEARCH_BOX_CLASS = cn(controlGroupRecipe, 'h-8 gap-1.5 px-2');

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
				<ListboxButton className={TRIGGER_CLASS}>
					<span className={cn('truncate capitalize', !currentTimezone?.length && 'text-muted-foreground')}>
						{items?.find((el) => el.value.toLowerCase() == currentTimezone.toLowerCase())?.value ||
							'Pick a timezone'}
					</span>

					<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
				</ListboxButton>
				<ListboxOptions className="absolute top-full z-20 mt-1 w-full space-y-1 rounded-xl bg-popover p-1 text-sm text-popover-foreground shadow-md shadow-black/6.5 hairline-ring ring-border outline-none">
					<div className={SEARCH_BOX_CLASS}>
						<Search className="size-4 shrink-0 text-muted-foreground" />
						<InputField
							value={searchTerm}
							onChange={(e) => {
								handleSearchChange(e.target.value);
							}}
							placeholder={'Search ...'}
							className="h-full bg-transparent px-1 py-0 shadow-none ring-0 focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent dark:ring-0"
							noWrapper
						/>
					</div>

					<ScrollArea className="flex flex-col gap-1 h-72">
						{filteredSearchResult?.map((item) => (
							<ListboxOption
								key={item.id}
								value={item.value.toLowerCase()}
								as="div"
								className="group rounded-md outline-none"
							>
								{({ selected }) => (
									<li className="cursor-pointer rounded-md">
										<div
											className={cn(
												'flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5 group-data-focus:bg-foreground/5',
												selected && 'bg-foreground/5 font-medium text-foreground'
											)}
										>
											{selected && <Check className="size-3 shrink-0" />}
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
