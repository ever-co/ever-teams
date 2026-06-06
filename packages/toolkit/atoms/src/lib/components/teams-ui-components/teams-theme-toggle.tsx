import { Select } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import {
	defaultTheme,
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

const TeamsThemeToggle = ({ size, className }: { size?: 'default' | 'sm' | 'lg' | null; className?: string }) => {
	const { appliedTheme, setAppliedTheme } = useTeamsContext();
	return (
		<div className={' flex  gap-2 min-w-60 ' + className}>
			{/* <label htmlFor="">Teams Theme :</label> */}
			<Select
				size={size}
				className={className}
				placeholder="Select theme"
				values={[
					{ label: 'Default', value: JSON.stringify(defaultTheme) },
					{ label: 'Black and white', value: JSON.stringify(theme1) },
					{ label: 'Red and Green', value: JSON.stringify(theme2) },
					{ label: 'Yellow and Red', value: JSON.stringify(theme3) },
					// { label: 'Default', value: theme4 },
					{ label: 'Blue and green (Black)', value: JSON.stringify(theme5) },
					{ label: 'Pink and White', value: JSON.stringify(theme6) },
					{ label: 'Green and Yellow', value: JSON.stringify(theme7) },
					{ label: 'Red and Blue', value: JSON.stringify(theme8) },
					{ label: 'Green and yellow', value: JSON.stringify(theme9) },
					{ label: 'Pink and blue', value: JSON.stringify(theme10) },
					{ label: 'Orange and red', value: JSON.stringify(theme11) },
					{ label: 'Chocolate and white', value: JSON.stringify(theme12) },
					{ label: 'Blue and Pink', value: JSON.stringify(theme13) },
					{ label: 'Yellow and pink', value: JSON.stringify(theme14) }
				]}
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
