'use client';

import { useTranslations } from 'next-intl';
import { Lock, Mail } from '@/core/components/icons';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';

export type AuthMethod = 'code' | 'password';

/** Sign in with an e-mailed code or with a password: one form that changes in place. */
export function AuthMethodSwitch({
	method,
	onMethodChange
}: Readonly<{ method: AuthMethod; onMethodChange: (method: AuthMethod) => void }>) {
	const t = useTranslations();

	const items: SegmentedControlItem<AuthMethod>[] = [
		{ value: 'code', icon: <Mail aria-hidden="true" />, label: t('auth.method.CODE') },
		{ value: 'password', icon: <Lock aria-hidden="true" />, label: t('auth.method.PASSWORD') }
	];

	return (
		<SegmentedControl
			items={items}
			value={method}
			onValueChange={onMethodChange}
			ariaLabel={t('auth.method.LABEL')}
			className="flex w-full [&>button]:flex-1"
		/>
	);
}
