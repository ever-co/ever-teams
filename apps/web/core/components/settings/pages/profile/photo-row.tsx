'use client';

import { ChangeEvent, useId, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import {
	SETTINGS_ROW,
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL
} from '@/core/components/settings/kit/settings-page';
import { ProfileAvatarStatus, useProfileAvatar } from '@/core/hooks/settings/use-profile-avatar';
import { imgTitle } from '@/core/lib/helpers/img-title';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	AVATAR_ACCEPT_ATTRIBUTE,
	AVATAR_MAX_MEGABYTES,
	AvatarFileProblem,
	avatarFileProblemOf,
	avatarUrlOf,
	hasOwnAvatar
} from '@/core/lib/utils/settings-profile';

type PhotoMessage = { tone: 'error' | 'status'; text: string };

function uploadLabelKeyOf(hasPhoto: boolean) {
	if (hasPhoto) {
		return 'settings.profile.PHOTO_REPLACE';
	}
	return 'settings.profile.PHOTO_UPLOAD';
}

export function PhotoRow() {
	const t = useTranslations();
	const inputId = useId();
	const hintId = `${inputId}-hint`;
	const inputRef = useRef<HTMLInputElement>(null);
	const { user, status, upload, remove } = useProfileAvatar();
	const [message, setMessage] = useState<PhotoMessage | null>(null);
	const isBusy = status !== 'idle';
	const hasPhoto = hasOwnAvatar(user);
	const photoUrl = avatarUrlOf(user);
	const initials = imgTitle(user?.name ?? '');
	const rulesText = t('settings.profile.PHOTO_HINT', { max: AVATAR_MAX_MEGABYTES });

	const failureText = (key: 'PHOTO_UPLOAD_FAILED' | 'PHOTO_REMOVE_FAILED', error: unknown) => {
		const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
		const reason = t(reasonKey);
		return t(`settings.profile.${key}`, { reason });
	};

	const fileProblemText = (problem: AvatarFileProblem) => {
		if (problem === 'type') {
			return t('settings.profile.PHOTO_WRONG_TYPE');
		}
		return t('settings.profile.PHOTO_TOO_LARGE', { max: AVATAR_MAX_MEGABYTES });
	};

	const pickFile = () => {
		inputRef.current?.click();
	};

	const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) {
			return;
		}
		const problem = avatarFileProblemOf(file);
		if (problem) {
			const text = fileProblemText(problem);
			setMessage({ tone: 'error', text });
			return;
		}
		setMessage(null);
		try {
			await upload(file);
			const text = t('settings.profile.PHOTO_SAVED');
			setMessage({ tone: 'status', text });
		} catch (error) {
			const text = failureText('PHOTO_UPLOAD_FAILED', error);
			setMessage({ tone: 'error', text });
		}
	};

	const onRemove = async () => {
		setMessage(null);
		try {
			await remove();
			const text = t('settings.profile.PHOTO_REMOVED');
			setMessage({ tone: 'status', text });
		} catch (error) {
			const text = failureText('PHOTO_REMOVE_FAILED', error);
			setMessage({ tone: 'error', text });
		}
	};

	return (
		<div className={SETTINGS_ROW}>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<Avatar className="size-12">
					<AvatarImage src={photoUrl} alt={t('settings.profile.PHOTO_ALT')} />
					<AvatarFallback className="text-sm">{initials}</AvatarFallback>
				</Avatar>
				<div className="flex min-w-0 flex-col gap-0.5">
					<label htmlFor={inputId} className={SETTINGS_ROW_LABEL}>
						{t('settings.profile.PHOTO')}
					</label>
					<PhotoHint id={hintId} status={status} message={message} rulesText={rulesText} />
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2 sm:justify-end">
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept={AVATAR_ACCEPT_ATTRIBUTE}
					aria-describedby={hintId}
					onChange={onFileChange}
					disabled={isBusy}
					className="sr-only"
					tabIndex={-1}
				/>
				{hasPhoto && (
					<Button type="button" variant="ghost" onClick={onRemove} disabled={isBusy}>
						{t('settings.profile.PHOTO_REMOVE')}
					</Button>
				)}
				<Button type="button" variant="outline" onClick={pickFile} disabled={isBusy} aria-describedby={hintId}>
					{t(uploadLabelKeyOf(hasPhoto))}
				</Button>
			</div>
		</div>
	);
}

function PhotoHint({
	id,
	status,
	message,
	rulesText
}: Readonly<{ id: string; status: ProfileAvatarStatus; message: PhotoMessage | null; rulesText: string }>) {
	const t = useTranslations();

	if (status === 'uploading') {
		return (
			<span id={id} role="status" className={cn(SETTINGS_ROW_DESCRIPTION, 'inline-flex items-center gap-1.5')}>
				<Spinner className="size-3 animate-spin" />
				{t('settings.profile.PHOTO_UPLOADING')}
			</span>
		);
	}
	if (status === 'removing') {
		return (
			<span id={id} role="status" className={cn(SETTINGS_ROW_DESCRIPTION, 'inline-flex items-center gap-1.5')}>
				<Spinner className="size-3 animate-spin" />
				{t('settings.profile.PHOTO_REMOVING')}
			</span>
		);
	}
	const isError = message?.tone === 'error';
	if (isError) {
		return (
			<span id={id} role="alert" className="text-xs text-pretty text-destructive-ink">
				{message?.text}
			</span>
		);
	}
	return (
		<span id={id} aria-live="polite" className={SETTINGS_ROW_DESCRIPTION}>
			{rulesText}
			{message && <span className="sr-only"> {message.text}</span>}
		</span>
	);
}
