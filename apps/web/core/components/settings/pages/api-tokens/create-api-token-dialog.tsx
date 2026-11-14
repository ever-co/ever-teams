'use client';

import { FormEvent, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Input } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner } from '@/core/components/icons';
import { ChoiceCards, type ChoiceCardOption } from '@/core/components/settings/kit/choice-cards';
import {
	createFailureOf,
	useCreateUserApiToken,
	type UserApiTokenCreateFailure
} from '@/core/hooks/settings/use-user-api-tokens';
import { cn } from '@/core/lib/helpers';
import {
	expiryDateOf,
	formatUserApiTokenDate,
	MAX_ACTIVE_USER_API_TOKENS,
	userApiTokenNameProblem,
	type UserApiTokenNameProblem
} from '@/core/lib/utils/user-api-tokens';
import {
	USER_API_TOKEN_NAME_MAX_LENGTH,
	type TCreatedUserApiToken,
	type TUserApiTokenExpiry
} from '@/core/types/schemas/user/user-api-token.schema';
import { ApiTokenSecret } from './api-token-secret';

type Translate = ReturnType<typeof useTranslations>;

const DEFAULT_EXPIRY: TUserApiTokenExpiry = '90d';

function nameProblemTextOf(problem: UserApiTokenNameProblem, t: Translate): string {
	if (problem === 'TOO_LONG') {
		return t('settings.apiTokens.NAME_TOO_LONG', { max: USER_API_TOKEN_NAME_MAX_LENGTH });
	}
	return t('settings.apiTokens.NAME_REQUIRED');
}

function failureTextOf(failure: UserApiTokenCreateFailure, t: Translate): string {
	if (failure === 'LIMIT_REACHED') {
		return t('settings.apiTokens.CREATE_LIMIT', { max: MAX_ACTIVE_USER_API_TOKENS });
	}
	if (failure === 'DISABLED') {
		return t('settings.apiTokens.CREATE_DISABLED');
	}
	return t('settings.apiTokens.CREATE_FAILED');
}

function endDetailOf(expiry: TUserApiTokenExpiry, now: Date, t: Translate, locale: string): string {
	const end = expiryDateOf(expiry, now);
	if (!end) {
		return t('settings.apiTokens.EXPIRY_NEVER_DETAIL');
	}
	return t('settings.apiTokens.EXPIRY_ON_DATE', { date: formatUserApiTokenDate(end.toISOString(), locale) });
}

function expiryOptionsOf(now: Date, t: Translate, locale: string): ChoiceCardOption<TUserApiTokenExpiry>[] {
	return [
		{ value: '90d', title: t('settings.apiTokens.EXPIRY_90D'), detail: endDetailOf('90d', now, t, locale) },
		{ value: '1y', title: t('settings.apiTokens.EXPIRY_1Y'), detail: endDetailOf('1y', now, t, locale) },
		{ value: 'never', title: t('settings.apiTokens.EXPIRY_NEVER'), detail: endDetailOf('never', now, t, locale) }
	];
}

type CreateTokenFormProps = {
	now: Date;
	onCancel: () => void;
	onCreated: (created: TCreatedUserApiToken) => void;
};

function CreateTokenForm({ now, onCancel, onCreated }: Readonly<CreateTokenFormProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const nameId = useId();
	const nameNoteId = useId();
	const create = useCreateUserApiToken();
	const [name, setName] = useState('');
	const [expiry, setExpiry] = useState<TUserApiTokenExpiry>(DEFAULT_EXPIRY);
	const [nameProblem, setNameProblem] = useState<UserApiTokenNameProblem | null>(null);
	const [failure, setFailure] = useState<UserApiTokenCreateFailure | null>(null);
	const isCreating = create.isPending;

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isCreating) {
			return;
		}
		const problem = userApiTokenNameProblem(name);
		setNameProblem(problem);
		if (problem) {
			return;
		}
		setFailure(null);
		create.mutate(
			{ name: name.trim(), expiry },
			{
				onSuccess: (created) => onCreated(created),
				onError: (error) => setFailure(createFailureOf(error))
			}
		);
	};

	const hasNameProblem = nameProblem !== null;
	let nameNote: string = t('settings.apiTokens.NAME_HINT');
	if (nameProblem) {
		nameNote = nameProblemTextOf(nameProblem, t);
	}
	let submitLabel = t('settings.apiTokens.CREATE');
	if (isCreating) {
		submitLabel = t('settings.apiTokens.CREATING');
	}

	return (
		<form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={t('settings.apiTokens.CREATE_TITLE')} onClose={onCancel} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pt-1 pb-5')}>
				<div className="flex flex-col gap-1.5">
					<label htmlFor={nameId} className="text-xs font-medium text-foreground">
						{t('settings.apiTokens.NAME_LABEL')}
					</label>
					<Input
						id={nameId}
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={USER_API_TOKEN_NAME_MAX_LENGTH}
						autoComplete="off"
						spellCheck={false}
						aria-invalid={hasNameProblem}
						aria-describedby={nameNoteId}
						disabled={isCreating}
						data-initial-focus=""
					/>
					<p
						id={nameNoteId}
						className={cn('text-xs text-muted-foreground', hasNameProblem && 'text-destructive-ink')}
					>
						{nameNote}
					</p>
				</div>
				<div className="flex flex-col gap-1.5">
					<span aria-hidden="true" className="text-xs font-medium text-foreground">
						{t('settings.apiTokens.EXPIRY_LEGEND')}
					</span>
					<ChoiceCards
						legend={t('settings.apiTokens.EXPIRY_LEGEND')}
						options={expiryOptionsOf(now, t, locale)}
						value={expiry}
						onChange={setExpiry}
						disabled={isCreating}
					/>
				</div>
				{failure && <Notice tone="error" title={failureTextOf(failure, t)} />}
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" disabled={isCreating}>
					{isCreating && <Spinner className="animate-spin" aria-hidden="true" />}
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}

type CreatedTokenStepProps = {
	created: TCreatedUserApiToken;
	onDone: () => void;
};

/** The secret, shown this once; Done (the only way out) forgets it. */
function CreatedTokenStep({ created, onDone }: Readonly<CreatedTokenStepProps>) {
	const t = useTranslations();
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={t('settings.apiTokens.SECRET_TITLE')} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pt-1 pb-5')}>
				<p className="text-[13px] text-pretty text-muted-foreground">
					{t('settings.apiTokens.SECRET_TEXT', { name: created.name })}
				</p>
				<ApiTokenSecret value={created.token} />
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" onClick={onDone} data-initial-focus="">
					{t('settings.apiTokens.DONE')}
				</Button>
			</div>
		</div>
	);
}

type CreateApiTokenDialogProps = {
	open: boolean;
	onClose: () => void;
	now: Date;
};

/**
 * Creates a token from a name and an expiry, then shows its secret this once. While the secret is on screen, only
 * Done closes the dialog, so a stray Escape or click outside never loses it; a half-filled form is never lost to a
 * click outside either.
 */
export function CreateApiTokenDialog({ open, onClose, now }: Readonly<CreateApiTokenDialogProps>) {
	const [created, setCreated] = useState<TCreatedUserApiToken | null>(null);
	const isSecretShown = created !== null;

	const close = () => {
		setCreated(null);
		onClose();
	};

	return (
		<AppDialog open={open} onClose={close} width="sm" keepOpenOnOutsideClick dismissible={!isSecretShown}>
			{created && <CreatedTokenStep created={created} onDone={close} />}
			{!created && <CreateTokenForm now={now} onCancel={close} onCreated={setCreated} />}
		</AppDialog>
	);
}
