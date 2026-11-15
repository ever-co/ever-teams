'use client';

import { type FormEvent, useId, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { AppDialog, APP_DIALOG_BODY, AppDialogDescription, AppDialogHeader } from '@/core/components/common/app-dialog';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Input } from '@/core/components/common/input';
import { toastMoment } from '@/core/components/common/toast-moment';
import { Button } from '@/core/components/duplicated-components/_button';
import { Info, Spinner, User, UserAdd } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	placeholderFailureOf,
	placeholderFormProblemOf,
	type PlaceholderFailure,
	type PlaceholderForm,
	type PlaceholderFormProblem
} from '@/core/lib/utils/member-placeholder';

/** Gauzy's limits: longer names and addresses are refused. */
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;

const EMPTY_FORM: PlaceholderForm = { firstName: '', lastName: '', email: '' };

const PROBLEM_KEYS: Record<PlaceholderFormProblem, DottedLanguageObjectStringPaths> = {
	nameRequired: 'settings.members.FIRST_NAME_REQUIRED',
	emailInvalid: 'settings.members.placeholder.EMAIL_INVALID'
};

function TeamContext() {
	const activeTeam = useAtomValue(activeTeamState);
	if (!activeTeam?.name) {
		return null;
	}
	return (
		<>
			<EntityTile
				name={activeTeam.name}
				color={activeTeam.color}
				imageUrl={activeTeam.image?.thumbUrl ?? activeTeam.image?.fullUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{activeTeam.name}</span>
		</>
	);
}

/**
 * Adds someone who worked with the team and has no account, laid out as the Invite dialog: a name and, optionally,
 * an email kept to invite them to claim their time later. Nobody is emailed now.
 */
export function AddPlaceholderDialog({
	open,
	onClose,
	onAdd
}: Readonly<{ open: boolean; onClose: () => void; onAdd: (form: PlaceholderForm) => Promise<void> }>) {
	const t = useTranslations();
	const firstNameId = useId();
	const lastNameId = useId();
	const emailId = useId();
	const hintId = useId();
	const [form, setForm] = useState<PlaceholderForm>(EMPTY_FORM);
	const [problem, setProblem] = useState<PlaceholderFormProblem | null>(null);
	const [failure, setFailure] = useState<PlaceholderFailure | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const close = () => {
		// The member may be created already: its answer must land in this dialog, not in the next one
		if (isSaving) {
			return;
		}
		setForm(EMPTY_FORM);
		setProblem(null);
		setFailure(null);
		onClose();
	};

	const change = (field: keyof PlaceholderForm, value: string) => {
		setForm((current) => ({ ...current, [field]: value }));
		setProblem(null);
		setFailure(null);
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formProblem = placeholderFormProblemOf(form);
		if (formProblem) {
			setProblem(formProblem);
			return;
		}
		setIsSaving(true);
		setFailure(null);
		try {
			await onAdd(form);
			const name = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ');
			toastMoment(t('settings.members.placeholder.ADDED', { name }), <UserAdd />);
			setForm(EMPTY_FORM);
			onClose();
		} catch (error) {
			setFailure(placeholderFailureOf(error, 'create'));
		} finally {
			setIsSaving(false);
		}
	};

	const nameProblem = problem === 'nameRequired';
	const emailProblem = problem === 'emailInvalid';
	const failureText = failure && t(failure.key as DottedLanguageObjectStringPaths, failure.values);

	return (
		<AppDialog open={open} onClose={close} width="md" keepOpenOnOutsideClick>
			<AppDialogHeader
				title={t('settings.members.placeholder.ADD_TITLE')}
				context={<TeamContext />}
				onClose={close}
			/>
			<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
				<form onSubmit={submit} className="flex flex-col gap-4" autoComplete="off" noValidate>
					<AppDialogDescription className="-mt-1 text-[13px] text-pretty text-muted-foreground">
						{t('settings.members.placeholder.ADD_DESCRIPTION')}
					</AppDialogDescription>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="min-w-0">
							<DialogFieldLabel htmlFor={firstNameId} isRequired>
								{t('settings.members.FIRST_NAME')}
							</DialogFieldLabel>
							<Input
								id={firstNameId}
								value={form.firstName}
								onChange={(event) => change('firstName', event.target.value)}
								maxLength={NAME_MAX_LENGTH}
								autoFocus
								aria-invalid={nameProblem || undefined}
							/>
						</div>
						<div className="min-w-0">
							<DialogFieldLabel htmlFor={lastNameId}>{t('settings.members.LAST_NAME')}</DialogFieldLabel>
							<Input
								id={lastNameId}
								value={form.lastName}
								onChange={(event) => change('lastName', event.target.value)}
								maxLength={NAME_MAX_LENGTH}
							/>
						</div>
						<div className="min-w-0 sm:col-span-2">
							<DialogFieldLabel
								htmlFor={emailId}
								optionalLabel={t('settings.members.placeholder.OPTIONAL')}
							>
								{t('settings.members.placeholder.EMAIL')}
							</DialogFieldLabel>
							<Input
								id={emailId}
								type="email"
								value={form.email}
								onChange={(event) => change('email', event.target.value)}
								maxLength={EMAIL_MAX_LENGTH}
								placeholder="name@example.com"
								aria-invalid={emailProblem || undefined}
								aria-describedby={hintId}
							/>
						</div>
					</div>
					<div id={hintId} className="flex flex-col gap-1">
						<p className="flex items-start gap-1.5 text-xs text-pretty text-muted-foreground">
							<Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
							{t('settings.members.placeholder.EMAIL_HINT')}
						</p>
						{problem && (
							<p role="alert" className="text-xs text-destructive-ink">
								{t(PROBLEM_KEYS[problem])}
							</p>
						)}
						{failureText && (
							<p role="alert" className="text-xs text-pretty text-destructive-ink">
								{t('settings.members.placeholder.ADD_FAILED')} {failureText}
							</p>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={close} disabled={isSaving}>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving && <Spinner aria-hidden="true" className="animate-spin" />}
							{!isSaving && <User aria-hidden="true" />}
							{t('settings.members.placeholder.ADD_CONFIRM')}
						</Button>
					</div>
				</form>
			</div>
		</AppDialog>
	);
}
