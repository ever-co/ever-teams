'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { SETTINGS_ROW, SETTINGS_ROW_LABEL } from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';

function PhoneEditorSkeleton() {
	return (
		<div aria-hidden="true" className="flex w-full flex-col gap-1.5 sm:w-72">
			<span className="h-9 w-full rounded-md hairline-ring ring-border" />
			<span className="h-7 self-end" />
		</div>
	);
}

/** The id `InternationalPhoneInput` gives its field (`phone-input-<name>`). */
const PHONE_INPUT_ID = 'phone-input-phoneNumber';

const PhoneEditor = dynamic(() => import('./phone-editor'), { ssr: false, loading: PhoneEditorSkeleton });

type PhoneRowProps = {
	value: string;
	onSave: (phoneNumber: string) => Promise<unknown>;
};

export function PhoneRow({ value, onSave }: Readonly<PhoneRowProps>) {
	const t = useTranslations();
	const [isEditing, setIsEditing] = useState(false);
	const label = t('settings.profile.PHONE');
	const hasValue = value.trim().length > 0;

	const save = async (phoneNumber: string) => {
		await onSave(phoneNumber);
		setIsEditing(false);
	};

	if (isEditing) {
		return (
			<div className={cn(SETTINGS_ROW, 'sm:items-start')}>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:pt-2">
					<label htmlFor={PHONE_INPUT_ID} className={SETTINGS_ROW_LABEL}>
						{label}
					</label>
				</div>
				<PhoneEditor initialValue={value} onCancel={() => setIsEditing(false)} onSave={save} />
			</div>
		);
	}

	return (
		<div className={SETTINGS_ROW}>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{label}</span>
			</div>
			<div className="flex min-w-0 items-center gap-3 sm:justify-end">
				{hasValue && <span className="min-w-0 truncate text-[13px] text-foreground tabular-nums">{value}</span>}
				{!hasValue && (
					<span className="text-[13px] text-muted-foreground">{t('settings.profile.NOT_SET')}</span>
				)}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setIsEditing(true)}
					aria-label={t('settings.common.EDIT_FIELD', { field: label })}
				>
					{t('common.EDIT')}
				</Button>
			</div>
		</div>
	);
}
