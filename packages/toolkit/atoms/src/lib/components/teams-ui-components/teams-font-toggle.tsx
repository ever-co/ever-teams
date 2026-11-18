import { useTranslation } from 'react-i18next';
import { cn, Select, ISelectProps } from '@ever-teams/toolkit-ui';
import useFontSelector from '@hooks/useFontSelector';
import { useKitOptions } from '@components/teams-provider/kit-root';

// What the widgets draw in until a font is picked: the web app's face in the kit root, the page's font without one
function unpickedFontKey(scoped: boolean): string {
	if (scoped) {
		return 'FONT_PICKER.system_font';
	}
	return 'FONT_PICKER.page_font';
}

type ITeamsFontToggleProps = Partial<Pick<ISelectProps, 'size' | 'placeholder'>> & {
	label?: string;
	containerClassName?: string;
	className?: string;
};

const TeamsFontToggle = ({ className, containerClassName, label, size, placeholder }: ITeamsFontToggleProps) => {
	const { t } = useTranslation();
	const { scoped } = useKitOptions();
	// Until a font is picked the toggle names the font the widgets draw in, instead of a font they do not use
	const { fontOptions, pickedFont, setSelectedFont } = useFontSelector();
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
				placeholder={placeholder || t(unpickedFontKey(scoped))}
				defaultValue={pickedFont}
				values={optionsForSelect}
				onValueChange={(e) => {
					setSelectedFont(e);
				}}
				value={pickedFont}
				size={size}
				className={className}
			/>
		</div>
	);
};
TeamsFontToggle.displayName = 'TeamsFontToggle';
export { TeamsFontToggle };
