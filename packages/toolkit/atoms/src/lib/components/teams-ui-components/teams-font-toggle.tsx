import { cn, Select, ISelectProps } from '@ever-teams/toolkit-ui';
import useFontSelector from '@hooks/useFontSelector';

type ITeamsFontToggleProps = Partial<Pick<ISelectProps, 'size' | 'placeholder'>> & {
	label?: string;
	containerClassName?: string;
	className?: string;
};

const TeamsFontToggle = ({ className, containerClassName, label, size, placeholder }: ITeamsFontToggleProps) => {
	const { fontOptions, selectedFont, setSelectedFont } = useFontSelector();
	const optionsForSelect = fontOptions.map(({ name, value }) => ({
		label: name,
		value
	}));
	return (
		<div className={cn('flex flex-col gap-2 min-w-60', containerClassName)}>
			{label && (
				<label htmlFor="font" className="text-sm text-foreground">
					{label}
				</label>
			)}
			<Select
				name="font"
				placeholder={placeholder || 'Select font'}
				defaultValue={selectedFont}
				values={optionsForSelect}
				onValueChange={(e) => {
					setSelectedFont(e);
				}}
				value={selectedFont}
				size={size}
				className={className}
			/>
		</div>
	);
};
TeamsFontToggle.displayName = 'TeamsFontToggle';
export { TeamsFontToggle };
