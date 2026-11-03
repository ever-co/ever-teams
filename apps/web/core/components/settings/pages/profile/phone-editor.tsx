'use client';

import { KeyboardEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import InternationalPhoneInput from '@/core/components/common/international-phone-Input';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';

interface PhoneForm {
	phoneNumber: string;
}

type PhoneEditorProps = {
	initialValue: string;
	onCancel: () => void;
	onSave: (phoneNumber: string) => Promise<unknown>;
};

export default function PhoneEditor({ initialValue, onCancel, onSave }: Readonly<PhoneEditorProps>) {
	const t = useTranslations();
	const [saveError, setSaveError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting }
	} = useForm<PhoneForm>({ defaultValues: { phoneNumber: initialValue } });

	const submit = handleSubmit(async (values) => {
		setSaveError(null);
		const phoneNumber = values.phoneNumber.trim();
		try {
			await onSave(phoneNumber);
		} catch {
			const message = t('settings.common.SAVE_FAILED');
			setSaveError(message);
		}
	});

	const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		event.stopPropagation();
		onCancel();
	};

	return (
		<form onSubmit={submit} onKeyDown={onKeyDown} className="flex w-full min-w-0 flex-col gap-1.5 sm:w-72">
			<InternationalPhoneInput<PhoneForm>
				name="phoneNumber"
				register={register}
				error={errors.phoneNumber}
				value={initialValue}
				wrapperClassName="mb-0"
			/>
			{saveError && (
				<p role="alert" className="text-xs text-destructive-ink">
					{saveError}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" size="sm" disabled={isSubmitting}>
					{isSubmitting && <Spinner className="size-3.5 animate-spin" />}
					{t('common.SAVE')}
				</Button>
			</div>
		</form>
	);
}
