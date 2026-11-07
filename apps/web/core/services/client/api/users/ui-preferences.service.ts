import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

/** The keyboard bindings a person changed: command id → binding in this app's syntax (`'mod+s'`, `'g t'`). */
export interface IKeyboardUiPreferences {
	bindings?: Record<string, string>;
}

/** The per-user UI preferences the platform keeps on the user row, by feature. */
export interface IUiPreferences {
	keyboard?: IKeyboardUiPreferences;
	[feature: string]: Record<string, unknown> | undefined;
}

/**
 * Client of the platform's per-user UI preferences (`PUT /user/ui-preferences`): one object per feature, merged
 * shallowly per top-level key by the platform, so a feature never clobbers another's state. Read back through the
 * signed-in user (`uiPreferences` on `GET /user/me`).
 */
class UiPreferencesService extends APIService {
	/** Replaces one feature's object (null removes it); answers the user's preferences as stored. */
	setFeature = async (feature: string, value: Record<string, unknown> | null): Promise<IUiPreferences> => {
		const response = await this.put<IUiPreferences>('/user/ui-preferences', { [feature]: value });
		return response.data;
	};

	setKeyboard = async (keyboard: IKeyboardUiPreferences | null): Promise<IUiPreferences> => {
		return this.setFeature('keyboard', keyboard as Record<string, unknown> | null);
	};
}

export const uiPreferencesService = new UiPreferencesService(GAUZY_API_BASE_SERVER_URL.value);
