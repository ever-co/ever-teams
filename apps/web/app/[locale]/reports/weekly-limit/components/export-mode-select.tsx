import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@components/ui/select';
import { useMemo, useState, useCallback } from 'react';

interface IProps {
	onChange: (mode: TExportMode) => void;
}

type TExportMode = 'Excel' | 'PDF';
export function ExportModeSelect(props: IProps) {
	const { onChange } = props;
	const options = useMemo<TExportMode[]>(() => ['Excel', 'PDF'], []);
	const [selected, setSelected] = useState<TExportMode>();

	const handleChange = useCallback(
		(mode: TExportMode) => {
			setSelected(mode);
			onChange(mode);
		},
		[onChange]
	);

	return (
		<Select value={selected} onValueChange={handleChange}>
			<SelectTrigger className="w-36 overflow-hidden  h-[2.2rem]  text-clip border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
				<SelectValue placeholder="Export" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{options.map((mode) => {
						return (
							<SelectItem key={mode} value={mode}>
								{mode}
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
