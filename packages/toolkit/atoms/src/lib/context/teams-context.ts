import { createContext, SetStateAction, useContext } from 'react';

import { IHookResponse, IPermission, IUser, IUserOrganization, PaginationResponse } from '@ever-teams/toolkit-types';

import { Theme } from 'theme-ui';
import { DateRange } from 'react-day-picker';
import { useAtom } from 'jotai';
import {
	accessTokenAtom,
	appliedThemeAtom,
	reportDatesAtom,
	selectedEmployeeAtom,
	selectedFontAtom,
	selectedOrganizationAtom,
	selectedTeamAtom,
	userAtom,
	userOrganizationsAtom,
	userPermissionsAtom
} from '../teams-jotai/atoms/teams-atoms';
import { FontOption } from '../font/font';
export interface ITeamsContext {
	// Font properties
	selectedFont: string;
	fontOptions: FontOption[];
	setSelectedFont: React.Dispatch<React.SetStateAction<string>>;

	handleChangeToken?: {
		handleTokenSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
		handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	};
}

export type IReturnUseTeamsContext = ITeamsContext & {
	appliedTheme: Theme<{}>;
	setAppliedTheme: React.Dispatch<React.SetStateAction<Theme<{}>>>;

	authenticatedUser: IUser | null;
	setAuthenticatedUser: React.Dispatch<SetStateAction<IHookResponse<IUser>>>;

	token: string;
	setToken: React.Dispatch<React.SetStateAction<string>>;

	reportDates?: DateRange;
	setReportDates?: React.Dispatch<React.SetStateAction<DateRange | undefined>>;

	userPermissions: IPermission[] | null;
	setPermissions: React.Dispatch<React.SetStateAction<IHookResponse<IPermission[]>>>;

	userOrganizations: PaginationResponse<IUserOrganization> | null;

	selectedEmployee: string;
	setSelectedEmployee: React.Dispatch<SetStateAction<string>>;

	selectedTeam: string;
	setSelectedTeam: React.Dispatch<SetStateAction<string>>;

	selectedOrganization: string;
	setSelectedOrganization: React.Dispatch<SetStateAction<string>>;

	loadings: {
		userLoading: boolean;
		permissionLoading: boolean;
		userOrganizationsLoading: boolean;
	};
};

export const TeamsContextDefaultValue: ITeamsContext | null = null;

const TeamsContext: React.Context<ITeamsContext | null> = createContext<ITeamsContext | null>(TeamsContextDefaultValue);

const useTeamsContext = (): IReturnUseTeamsContext => {
	const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
	const [reportDates, setReportDates] = useAtom(reportDatesAtom);
	const [appliedTheme, setAppliedTheme] = useAtom(appliedThemeAtom);
	const [{ fontOptions, selectedFont, setSelectedFont }] = useAtom(selectedFontAtom);

	const [{ data: user, loading: userLoading }, setUser] = useAtom(userAtom);
	const [{ data: userPermissions, loading: permissionLoading }, setPermissions] = useAtom(userPermissionsAtom);
	const [selectedEmployee, setSelectedEmployee] = useAtom<string>(selectedEmployeeAtom);
	const [selectedOrganization, setSelectedOrganization] = useAtom(selectedOrganizationAtom);
	const [selectedTeam, setSelectedTeam] = useAtom<string>(selectedTeamAtom);

	const [{ data: userOrganizations, loading: userOrganizationsLoading }] = useAtom(userOrganizationsAtom);

	const context = useContext(TeamsContext);

	if (!context) {
		throw new Error(
			'Remember to wrap your application or components in a `<TeamsProvider> {...} </TeamsProvider>` !!!'
		);
	}

	return {
		...context,
		fontOptions,
		selectedFont,
		setSelectedFont: setSelectedFont,

		selectedEmployee,
		setSelectedEmployee,

		selectedTeam,
		setSelectedTeam,

		selectedOrganization,
		setSelectedOrganization,

		appliedTheme,
		setAppliedTheme,

		authenticatedUser: user,
		setAuthenticatedUser: setUser,

		token: accessToken,
		setToken: setAccessToken,

		reportDates,
		setReportDates,

		userPermissions,
		setPermissions,

		userOrganizations,

		// handleChangeToken: {
		// 	handleTokenSubmit: handleTokenSubmit,
		// 	handleInputChange: handleInputChange
		// },
		loadings: {
			userLoading,
			permissionLoading,
			userOrganizationsLoading
		}
	};
};

export { TeamsContext, useTeamsContext };
