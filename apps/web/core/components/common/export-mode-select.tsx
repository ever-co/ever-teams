import { cn } from '@/core/lib/helpers';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectGroup,
	SelectItem
} from '@/core/components/common/select';
import { useMemo, useState, useCallback } from 'react';

interface IProps {
	onChange: (mode: TExportMode) => void;
	className?: string;
}

/**
 * ExportModeSelect component provides a dropdown selector for choosing an export format (Excel or PDF).
 *
 * @component
 * @param {IProps} props - The component props.
 * @param {(mode: TExportMode) => void} props.onChange - Function to handle changes in the selected export mode.
 *
 * @returns {JSX.Element} A dropdown for selecting the export mode.
 */

type TExportMode = 'Excel' | 'PDF';
export function ExportModeSelect(props: IProps) {
	const { onChange, className } = props;
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
		<Select aria-label="Select export format" value={selected} onValueChange={handleChange}>
			<SelectTrigger className={cn('w-32 overflow-hidden text-clip', className)}>
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
