import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@components/ui/select';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useMemo, useState, useCallback } from 'react';

interface IProps {
	onChange: (OPTION: TGroupByOption) => void;
	defaultValue: TGroupByOption;
}

/**
 * GroupBySelect component provides a dropdown selector for grouping data by day, week, or member.
 *
 * @component
 * @param {IProps} props - The component props.
 * @param {(option: TGroupByOption) => void} props.onChange - Function to handle changes in the selected grouping option.
 * @param {TGroupByOption} props.defaultValue - The initial grouping option.
 *
 * @returns {JSX.Element} A dropdown for selecting a grouping option.
 */

export type TGroupByOption = 'Day' | 'Week' | 'Member';
export function GroupBySelect(props: IProps) {
	const { onChange, defaultValue } = props;
	const options = useMemo<TGroupByOption[]>(() => ['Day', 'Week', 'Member'], []);
	const [selected, setSelected] = useState<TGroupByOption>(defaultValue);
	const t = useTranslations();
	const handleChange = useCallback(
		(option: TGroupByOption) => {
			setSelected(option);
			onChange(option);
		},
		[onChange]
	);

	return (
		<Select value={selected} onValueChange={handleChange}>
			<SelectTrigger className="w-36 overflow-hidden  h-[2.2rem]  text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
				<SelectValue placeholder="Group by" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{options.map((option) => {
						return (
							<SelectItem key={option} value={option}>
								{t(
									`common.${(option == 'Day' ? 'Date' : option).toUpperCase()}` as DottedLanguageObjectStringPaths
								)}
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
