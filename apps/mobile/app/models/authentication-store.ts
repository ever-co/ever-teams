import { getRoot, Instance, SnapshotOut, types } from 'mobx-state-tree';
import { holdSession } from '../services/client/session';
import { ILanguageItemList, IUser } from '../services/interfaces/IUserData';

/** The stores beside this one in the app's root store, whose data is the signed-in person's. */
type StoresOfThePerson = {
	TaskStore?: { resetTeamTasksData(): void };
	teamStore?: { clearStoredTeamData(): void };
};

export const AuthenticationStoreModel = types
	.model('AuthenticationStore')
	.props({
		authToken: types.maybe(types.string),
		tempAuthToken: types.maybe(types.string),
		refreshToken: types.maybe(types.string),
		authEmail: types.optional(types.string, ''),
		authTeamName: types.optional(types.string, ''),
		authUsername: types.optional(types.string, ''),
		authConfirmCode: types.optional(types.string, ''),
		authInviteCode: types.optional(types.string, ''),
		organizationId: types.optional(types.string, ''),
		tenantId: types.optional(types.string, ''),
		// Nullable: logout() sets this to null, and a fresh store has no user. Declaring it non-null
		// was a type lie that TypeScript 6 strict mode caught (TS2322 in logout).
		user: types.frozen<IUser | null>(),
		employeeId: types.optional(types.string, ''),
		preferredLanguage: types.optional(types.frozen(), null),
		isDarkMode: types.optional(types.boolean, false)
	})
	.views((store) => ({
		get isAuthenticated() {
			return !!store.authToken;
		},
		get validationErrors() {
			return {
				authEmail: (function () {
					if (store.authEmail.length === 0) return "This field can't be blank";
					if (store.authEmail.length < 6) return 'Must be at least 6 characters';
					if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.authEmail)) return 'Must be a valid email address';
					return '';
				})(),
				authTeamName: (function () {
					if (store.authTeamName.length === 0) return "This field can't be blank";
					return '';
				})(),
				authUsername: (function () {
					if (store.authUsername.length === 0) return "This field can't be blank";
					return '';
				})()
			};
		}
	}))
	.actions((store) => ({
		setAuthToken(value?: string) {
			store.authToken = value;
		},
		setAuthEmail(value: string) {
			store.authEmail = value?.replace(/ /g, '');
		},
		setAuthTeamName(value: string) {
			store.authTeamName = value;
		},
		setAuthConfirmCode(value: string) {
			store.authConfirmCode = value?.replace(/ /g, '');
		},
		setAuthInviteCode(value: string) {
			store.authInviteCode = value?.replace(/ /g, '');
		},
		setAuthUsername(value: string) {
			store.authUsername = value;
		},
		setOrganizationId(value: string) {
			store.organizationId = value?.replace(/ /g, '');
		},
		setEmployeeId(value: string) {
			store.employeeId = value?.replace(/ /g, '');
		},
		setUser(value: any) {
			store.user = value;
		},
		setRefreshToken(value: string) {
			store.refreshToken = value;
		},
		setTenantId(value: string) {
			store.tenantId = value?.replace(/ /g, '');
		},
		setPreferredLanguage(locale: ILanguageItemList) {
			store.preferredLanguage = locale;
		},
		setTempAuthToken(value?: string) {
			store.tempAuthToken = value;
		},
		toggleTheme() {
			store.isDarkMode = !store.isDarkMode;
		},
		logout() {
			store.authToken = '';
			store.authEmail = '';
			store.authTeamName = '';
			store.authUsername = '';
			store.authInviteCode = '';
			store.authConfirmCode = store.tenantId = '';
			store.organizationId = '';
			store.user = null;
			store.employeeId = '';
			store.refreshToken = '';
			store.tempAuthToken = '';
		}
	}))
	.actions((store) => {
		let letGoOfSession: (() => void) | undefined;

		return {
			/**
			 * This store holds the session, and the HTTP client reads it here to renew it: a request the API refuses
			 * because the access token expired gets a new pair with the refresh token, which is kept below
			 * (services/client/session.ts).
			 */
			afterCreate() {
				letGoOfSession = holdSession({
					tokens: () => ({ accessToken: store.authToken, refreshToken: store.refreshToken }),
					keep: ({ accessToken, refreshToken }) => {
						store.setAuthToken(accessToken);
						// Gauzy rotates the refresh token: the one just sent is refused from now on
						if (refreshToken) {
							store.setRefreshToken(refreshToken);
						}
					},
					// As a sign-out the person asks for: their teams and tasks go with the session
					end: () => {
						const stores = getRoot(store) as unknown as StoresOfThePerson;
						stores.TaskStore?.resetTeamTasksData();
						stores.teamStore?.clearStoredTeamData();
						store.logout();
					}
				});
			},
			beforeDestroy() {
				letGoOfSession?.();
			}
		};
	});

export interface AuthenticationStore extends Instance<typeof AuthenticationStoreModel> {}
export interface AuthenticationStoreSnapshot extends SnapshotOut<typeof AuthenticationStoreModel> {}
