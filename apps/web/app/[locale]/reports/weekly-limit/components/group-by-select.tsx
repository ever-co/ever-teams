import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@components/ui/select';
import { useMemo, useState, useCallback } from 'react';

interface IProps {
	onChange: (OPTION: TGroupByOption) => void;
}

export type TGroupByOption = 'Date' | 'Week' | 'Member';
export function GroupBySelect(props: IProps) {
	const { onChange } = props;
	const options = useMemo<TGroupByOption[]>(() => ['Date', 'Week', 'Member'], []);
	const [selected, setSelected] = useState<TGroupByOption>('Date');

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
								{option}
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
