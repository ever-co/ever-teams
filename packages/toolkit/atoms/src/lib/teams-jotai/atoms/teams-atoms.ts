import { atom } from 'jotai';
import { getWeekStartAndEnd } from '@ever-teams/toolkit-ui';
import { DateRange } from 'react-day-picker';
import { defaultTheme } from '../../themes/themes';
import { useAuthUser } from '@hooks/useAuthUser';
import useFontSelector from '@hooks/useFontSelector';
import { FONT_OPTIONS } from '../../font/font';
import { useUserPermission } from '@hooks/useUserPermission';
import { useUserOrganization } from '@hooks/useUserOrganization';

const getInitialFont = () => {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('selected-font') || FONT_OPTIONS[0].value;
	}
	return FONT_OPTIONS[0].value;
};

// Atoms

export const reportDatesAtom = atom<DateRange | undefined>({
	from: getWeekStartAndEnd(new Date()).start,
	to: getWeekStartAndEnd(new Date()).end
});

export const appliedThemeAtom = atom(defaultTheme);

export const userOrganizationsAtom = atom<ReturnType<typeof useUserOrganization>>({ data: null, loading: false });

export const selectedFontAtom = atom<ReturnType<typeof useFontSelector>>({
	selectedFont: getInitialFont(),
	fontOptions: FONT_OPTIONS,
	setSelectedFont: () => {}
});

export const selectedEmployeeAtom = atom<string>('all');

export const selectedTeamAtom = atom<string>('all');

export const selectedOrganizationAtom = atom<string>('');

export const userAtom = atom<ReturnType<typeof useAuthUser>>({ data: null, loading: false });

export const userPermissionsAtom = atom<ReturnType<typeof useUserPermission>>({ data: null, loading: false });

export const accessTokenAtom = atom<string>('');
