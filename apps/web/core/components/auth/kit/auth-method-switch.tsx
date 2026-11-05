'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Mail } from '@/core/components/icons';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';

export type AuthMethod = 'code' | 'password';

const METHOD_PATH: Record<AuthMethod, string> = {
	code: '/auth/passcode',
	password: '/auth/password'
};

function otherMethodOf(method: AuthMethod): AuthMethod {
	if (method === 'code') {
		return 'password';
	}
	return 'code';
}

function methodHref(method: AuthMethod, email: string) {
	const path = METHOD_PATH[method];
	const trimmed = email.trim();
	if (!trimmed) {
		return path;
	}
	const query = new URLSearchParams({ email: trimmed });
	return `${path}?${query.toString()}`;
}

export function AuthMethodSwitch({ method, email }: Readonly<{ method: AuthMethod; email: string }>) {
	const t = useTranslations();
	const router = useRouter();
	const [shownMethod, setShownMethod] = useState(method);

	useEffect(() => {
		const otherMethod = otherMethodOf(method);
		const otherPath = METHOD_PATH[otherMethod];
		router.prefetch(otherPath);
	}, [method, router]);

	const items: SegmentedControlItem<AuthMethod>[] = [
		{ value: 'code', icon: <Mail aria-hidden="true" />, label: t('auth.method.CODE') },
		{ value: 'password', icon: <Lock aria-hidden="true" />, label: t('auth.method.PASSWORD') }
	];

	const switchTo = (nextMethod: AuthMethod) => {
		if (nextMethod === method) {
			return;
		}
		setShownMethod(nextMethod);
		const href = methodHref(nextMethod, email);
		router.push(href);
	};

	return (
		<SegmentedControl
			items={items}
			value={shownMethod}
			onValueChange={switchTo}
			ariaLabel={t('auth.method.LABEL')}
			className="flex w-full [&>button]:flex-1"
		/>
	);
}
