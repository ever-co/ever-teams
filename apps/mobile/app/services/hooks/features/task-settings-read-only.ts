import { translate } from '../../../i18n';

/** Why a task setting is out of reach to this user: one reason, which the settings screens and a row's menu both show. */
export function taskSettingsReadOnlyHint(): string {
	return translate('settingScreen.teamSection.taskSettingsReadOnly');
}
