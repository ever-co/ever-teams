import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useMemo, useState, useCallback } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Badge } from '@components/ui/badge';

export type TGroupByOption = 'date' | 'week' | 'member';

interface IProps {
	onChange: (options: TGroupByOption[]) => void;
	defaultValues: TGroupByOption[];
}

/**
 * [GroupBySelect] - A multi-select component that allows users to choose up to two options
 * from a predefined list ("date", "Week", "Member").
 *
 * Rules enforced:
 * - Only two options can be selected at a time.
 * - "date" and "Week" cannot be selected together.
 * - At least one option must remain selected.
 *
 * @component
 * @param {Object} props - The properties of the component.
 * @param {TGroupByOption[]} props.defaultValues - Initial options selected when the component is rendered.
 * @param {Function} props.onChange - Callback function invoked when the selection changes.
 *
 * @returns {JSX.Element} A custom multi-select dropdown with badges representing selected items.
 *
 */
export function GroupBySelect({ defaultValues, onChange }: IProps) {
	const options = useMemo<TGroupByOption[]>(() => ['date', 'week', 'member'], []);
	const [selected, setSelected] = useState<TGroupByOption[]>(defaultValues);
	const t = useTranslations();

	const handleChange = useCallback(
		(options: TGroupByOption[]) => {
			// Ensure 'date' and 'Week' cannot be selected together
			let updatedOptions = options;

			if (options.includes('date') && options.includes('week')) {
				// If 'date' is newly selected, remove 'Week'
				if (selected.includes('week')) {
					updatedOptions = options.filter((option) => option !== 'week');
				}
				// If 'Week' is newly selected, remove 'date'
				else if (selected.includes('date')) {
					updatedOptions = options.filter((option) => option !== 'date');
				}
			}

			setSelected(updatedOptions);
			onChange(updatedOptions);
		},
		[onChange, selected]
	);

	return (
		<Listbox multiple value={selected} onChange={handleChange}>
			<div className="relative h-[2.2rem] w-[12rem]">
				<Listbox.Button className="relative w-full h-full cursor-default rounded-lg bg-white dark:border-gray-700 dark:bg-dark--theme-light py-2 pl-1 pr-6 text-left border focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:text-sm">
					<div className=" items-center w-full h-full flex gap-1">
						{selected.map((option) => (
							<Badge
								key={option}
								className=" capitalize rounded flex gap-1 font-light"
								variant={'outline'}
							>
								{t(
									`common.${(option == 'date' ? 'date' : option).toUpperCase()}` as DottedLanguageObjectStringPaths
								)}
							</Badge>
						))}
					</div>
					<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
						<ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
					</span>
				</Listbox.Button>
				<Transition
					as="div"
					leave="transition ease-in duration-100"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<Listbox.Options className="absolute mt-1 max-h-60 w-full z-[999] overflow-auto rounded-md bg-white dark:bg-dark--theme-light  py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
						{options.map((option, index) => (
							<Listbox.Option
								disabled={
									// Prevents users from clearing all selections, ensuring at least one option is always selected.
									selected.includes(option) && selected.length == 1
								}
								key={index}
								className={({ active, selected }) =>
									`relative cursor-default select-none py-2 pl-10 pr-4 ${
										active
											? 'bg-primary/10 text-primary dark:text-white dark:bg-primary/10'
											: 'text-gray-900 dark:text-white'
									} ${selected && 'dark:bg-primary/10'}`
								}
								value={option}
							>
								{({ selected }) => (
									<div>
										<span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
											{option}
										</span>
										{selected ? (
											<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
												<CheckIcon className="h-5 w-5" aria-hidden="true" />
											</span>
										) : null}
									</div>
								)}
							</Listbox.Option>
						))}
					</Listbox.Options>
				</Transition>
			</div>
		</Listbox>
	);
}
