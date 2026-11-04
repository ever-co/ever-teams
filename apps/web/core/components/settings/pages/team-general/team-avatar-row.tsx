'use client';

import { ChangeEvent, useId, useRef, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Spinner, Upload } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	AVATAR_ACCEPT_ATTRIBUTE,
	AVATAR_MAX_MEGABYTES,
	avatarFileProblemOf,
	type AvatarFileProblem
} from '@/core/lib/utils/settings-profile';
import {
	SETTINGS_ROW,
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL
} from '@/core/components/settings/kit/settings-page';
import type { TOrganizationTeam } from '@/core/types/schemas';

type AvatarStatus = 'idle' | 'uploading' | 'removing';

const FILE_PROBLEM_KEYS: Record<AvatarFileProblem, DottedLanguageObjectStringPaths> = {
	type: 'settings.teamGeneral.AVATAR_TYPE_ERROR',
	size: 'settings.teamGeneral.AVATAR_SIZE_ERROR'
};

interface TeamAvatarRowProps {
	team: TOrganizationTeam;
	canEdit: boolean;
	onUpload: (file: File) => Promise<void>;
	onRemove: () => Promise<void>;
}

function teamImageUrlOf(team: TOrganizationTeam): string | null {
	const url = team.image?.thumbUrl ?? team.image?.fullUrl;
	if (!url) {
		return null;
	}
	return url;
}

export function TeamAvatarRow({ team, canEdit, onUpload, onRemove }: Readonly<TeamAvatarRowProps>) {
	const t = useTranslations();
	const inputId = useId();
	const hintId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [status, setStatus] = useState<AvatarStatus>('idle');
	const [error, setError] = useState<string | null>(null);

	const imageUrl = teamImageUrlOf(team);
	const hasOwnImage = Boolean(team.imageId) || Boolean(team.image);
	const isBusy = status !== 'idle';
	const isUploading = status === 'uploading';
	const showsRemove = hasOwnImage && canEdit;

	let hint: string = t('settings.teamGeneral.AVATAR_RULES', { size: AVATAR_MAX_MEGABYTES });
	if (isUploading) {
		hint = t('settings.teamGeneral.AVATAR_UPLOADING');
	}
	if (error) {
		hint = error;
	}

	let uploadLabel: string = t('settings.teamGeneral.AVATAR_UPLOAD');
	if (hasOwnImage) {
		uploadLabel = t('settings.teamGeneral.AVATAR_REPLACE');
	}

	const failureMessageOf = (failure: unknown) => {
		const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
		return t('settings.teamGeneral.AVATAR_FAILED', { reason: t(reasonKey) });
	};

	const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) {
			return;
		}
		const problem = avatarFileProblemOf(file);
		if (problem) {
			setError(t(FILE_PROBLEM_KEYS[problem], { size: AVATAR_MAX_MEGABYTES }));
			return;
		}
		setError(null);
		setStatus('uploading');
		try {
			await onUpload(file);
		} catch (failure) {
			setError(failureMessageOf(failure));
		} finally {
			setStatus('idle');
		}
	};

	const handleRemove = async () => {
		setError(null);
		setStatus('removing');
		try {
			await onRemove();
		} catch (failure) {
			setError(failureMessageOf(failure));
		} finally {
			setStatus('idle');
		}
	};

	return (
		<div className={SETTINGS_ROW}>
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<EntityTile
					name={team.name}
					color={team.color}
					imageUrl={imageUrl}
					className="size-12 rounded-[12px] text-base"
				/>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className={SETTINGS_ROW_LABEL}>{t('settings.teamGeneral.AVATAR_LABEL')}</span>
					{canEdit && (
						<span
							id={hintId}
							aria-live="polite"
							className={cn(SETTINGS_ROW_DESCRIPTION, error && 'text-destructive-ink')}
						>
							{hint}
						</span>
					)}
				</div>
			</div>
			{canEdit && (
				<div className="flex shrink-0 items-center gap-2 sm:justify-end">
					<input
						ref={inputRef}
						id={inputId}
						type="file"
						accept={AVATAR_ACCEPT_ATTRIBUTE}
						onChange={handleFileChange}
						aria-describedby={hintId}
						disabled={isBusy}
						className="sr-only"
						tabIndex={-1}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() => inputRef.current?.click()}
						disabled={isBusy}
						aria-describedby={hintId}
					>
						{isUploading && <Spinner className="size-3.5 animate-spin" />}
						{!isUploading && <Upload />}
						{uploadLabel}
					</Button>
					{showsRemove && (
						<Button type="button" variant="ghost" onClick={handleRemove} disabled={isBusy}>
							{status === 'removing' && <Spinner className="size-3.5 animate-spin" />}
							{t('settings.teamGeneral.AVATAR_REMOVE')}
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
