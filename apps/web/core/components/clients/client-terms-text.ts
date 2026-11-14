import type { useTranslations } from 'next-intl';
import type { ClientTermsReading } from '@/core/hooks/clients/use-client-terms';

type Translate = ReturnType<typeof useTranslations>;

export function clientTermsTextOf(terms: ClientTermsReading, t: Translate) {
	if (terms.kind === 'receipt') {
		return t('clients.terms.DUE_ON_RECEIPT');
	}
	if (terms.kind === 'own') {
		return t('clients.terms.NET_DAYS', { days: terms.days });
	}
	if (terms.days === null) {
		return t('clients.terms.WORKSPACE');
	}
	return t('clients.terms.WORKSPACE_DAYS', { days: terms.days });
}

export function ownTermsTextOf(terms: ClientTermsReading, t: Translate) {
	if (terms.kind === 'workspace') {
		return null;
	}
	return clientTermsTextOf(terms, t);
}
