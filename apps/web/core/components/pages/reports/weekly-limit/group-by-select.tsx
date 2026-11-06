import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useMemo, useState, useCallback } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronsUpDown } from '@/core/components/icons';
import { controlRecipe } from '@/core/components/common/input';
import { clsxm } from '@/core/lib/utils';
import { Badge } from '@/core/components/common/badge';

type TGroupByOption = 'date' | 'week' | 'member';

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
			<div className="relative h-8 w-[12rem]">
				<Listbox.Button
					className={clsxm(controlRecipe, 'relative h-full cursor-default py-1 pl-1 pr-7 text-left')}
				>
					<div className=" items-center w-full h-full flex gap-1">
						{selected.map((option) => (
							<Badge key={option} className="capitalize" variant={'secondary'}>
								{t(
									`common.${(option == 'date' ? 'date' : option).toUpperCase()}` as DottedLanguageObjectStringPaths
								)}
							</Badge>
						))}
					</div>
					<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
						<ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
					</span>
				</Listbox.Button>
				<Transition
					as="div"
					leave="transition ease-in duration-100"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<Listbox.Options className="absolute z-[999] mt-1 max-h-60 w-full overflow-auto rounded-xl bg-popover p-1 text-sm text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 focus:outline-none">
						{options.map((option, index) => (
							<Listbox.Option
								disabled={
									// Prevents users from clearing all selections, ensuring at least one option is always selected.
									selected.includes(option) && selected.length == 1
								}
								key={index}
								className={({ active }) =>
									clsxm(
										'relative cursor-default select-none rounded-md py-1.5 pl-8 pr-2 text-foreground',
										active && 'bg-foreground/5'
									)
								}
								value={option}
							>
								{({ selected }) => (
									<div>
										<span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
											{option}
										</span>
										{selected ? (
											<span className="absolute inset-y-0 left-0 flex items-center pl-2 text-primary-ink">
												<Check className="size-4" aria-hidden="true" />
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
