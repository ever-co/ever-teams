import { useTranslation } from 'react-i18next';
import { Select } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import {
	defaultTheme,
	gradientTheme,
	theme1,
	theme10,
	theme11,
	theme12,
	theme13,
	theme14,
	theme2,
	theme3,
	theme5,
	theme6,
	theme7,
	theme8,
	theme9
} from '@lib/themes/themes';

// The themes of the picker, in its order, each with the key of its name in the kit's translations
const PICKER_THEMES: Array<[string, typeof defaultTheme]> = [
	['default', defaultTheme],
	['purple_gradient', gradientTheme],
	['theme1', theme1],
	['theme2', theme2],
	['theme3', theme3],
	// ['theme4', theme4],
	['theme5', theme5],
	['theme6', theme6],
	['theme7', theme7],
	['theme8', theme8],
	['theme9', theme9],
	['theme10', theme10],
	['theme11', theme11],
	['theme12', theme12],
	['theme13', theme13],
	['theme14', theme14]
];

const TeamsThemeToggle = ({ size, className }: { size?: 'default' | 'sm' | 'lg' | null; className?: string }) => {
	const { t } = useTranslation();
	const { appliedTheme, setAppliedTheme } = useTeamsContext();
	return (
		<div className={' flex  gap-2 min-w-60 ' + className}>
			{/* <label htmlFor="">Teams Theme :</label> */}
			<Select
				size={size}
				className={className}
				placeholder={t('THEME_PICKER.placeholder')}
				values={PICKER_THEMES.map(([key, theme]) => ({
					label: t(`THEME_PICKER.${key}`),
					value: JSON.stringify(theme)
				}))}
				onValueChange={(e) => {
					setAppliedTheme(JSON.parse(e));
				}}
				value={JSON.stringify(appliedTheme)}
			/>
		</div>
	);
};

TeamsThemeToggle.displayName = 'TeamsThemeToggle';
export { TeamsThemeToggle };
