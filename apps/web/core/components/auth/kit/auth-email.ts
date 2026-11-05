import { isEmail } from 'class-validator';
import type { useTranslations } from 'next-intl';

type Translate = ReturnType<typeof useTranslations>;

/** The reason an address typed in an auth form cannot be sent, or null when it can go. */
export function emailErrorOf(address: string, t: Translate) {
	if (!address) {
		return t('form.EMAIL_REQUIRED');
	}
	if (!isEmail(address)) {
		return t('auth.field.EMAIL_INVALID');
	}
	return null;
}
