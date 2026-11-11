'use client';

import { useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { Button } from '@/core/components/duplicated-components/_button';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { controlRecipe, Input } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { Building } from '@/core/components/icons';
import { createWorkspaceErrorCodeOf, useCreateWorkspace } from '@/core/hooks/auth/use-create-workspace';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { cn } from '@/core/lib/helpers';
import { MAX_EMAILS_PER_INVITE } from '@/core/lib/validation/invite';
import { inviteAddressesOf, MAX_WORKSPACE_NAME_LENGTH } from '@/core/lib/validation/workspace';
import { timerStatusState } from '@/core/stores';

const PROFILE_SETTINGS_PATH = '/settings/personal';

/** The form as typed: the invitations are free text, read as addresses on submit. */
function formSchemaOf(t: ReturnType<typeof useTranslations>) {
	const nameOf = (required: string) =>
		z
			.string()
			.trim()
			.min(1, required)
			.max(MAX_WORKSPACE_NAME_LENGTH, t('workspaceCreation.NAME_TOO_LONG', { max: MAX_WORKSPACE_NAME_LENGTH }));
	return z.object({
		name: nameOf(t('workspaceCreation.NAME_REQUIRED')),
		teamName: nameOf(t('workspaceCreation.TEAM_REQUIRED')),
		invites: z.string().superRefine((text, context) => {
			const { valid, invalid } = inviteAddressesOf(text);
			if (invalid.length > 0) {
				context.addIssue({
					code: 'custom',
					message: t('workspaceCreation.INVITES_INVALID', { addresses: invalid.join(', ') })
				});
			} else if (valid.length > MAX_EMAILS_PER_INVITE) {
				context.addIssue({
					code: 'custom',
					message: t('workspaceCreation.INVITES_TOO_MANY', { max: MAX_EMAILS_PER_INVITE })
				});
			}
		})
	});
}

type CreateWorkspaceForm = z.infer<ReturnType<typeof formSchemaOf>>;

/**
 * `/workspace/new` (#5025): another workspace for the signed-in person, from the workspace menu or the sign-in's
 * workspace list. Its name, its first team's (it follows the workspace's name until edited) and the members invited to
 * that team; once created, the browser opens it.
 */
export function CreateWorkspacePage() {
	const t = useTranslations();
	const router = useRouter();
	const { data: user } = useUserQuery();
	const isAddressUnconfirmed = user?.isEmailVerified === false;
	// The new workspace opens signed in: a timer running here would keep counting out of sight (the workspace switch
	// refuses to change workspaces while it runs, for the same reason)
	const isTimerRunning = Boolean(useAtomValue(timerStatusState)?.running);
	const creation = useCreateWorkspace();
	const schema = useMemo(() => formSchemaOf(t), [t]);
	const form = useForm<CreateWorkspaceForm>({
		resolver: zodResolver(schema),
		defaultValues: { name: '', teamName: '', invites: '' }
	});
	const { errors, dirtyFields } = form.formState;

	// The first team takes the workspace's name until the person names it
	const name = useWatch({ control: form.control, name: 'name' });
	useEffect(() => {
		if (!dirtyFields.teamName) {
			form.setValue('teamName', name);
		}
	}, [dirtyFields.teamName, form, name]);

	const submit = form.handleSubmit(({ name, teamName, invites }) => {
		if (isTimerRunning) {
			return;
		}
		creation.mutate({ name, teamName, invites: inviteAddressesOf(invites).valid });
	});

	const failure = creation.isError ? createWorkspaceErrorCodeOf(creation.error) : null;
	const isUnconfirmed = isAddressUnconfirmed || failure === 'ADDRESS_UNCONFIRMED';
	// Created but not opened: another try would create a second workspace
	const isCreatedUnopened = failure === 'CREATED_NOT_OPENED';
	const isClosed = isUnconfirmed || isCreatedUnopened;
	// Creating, then opening the new workspace: the button stays busy until the page is replaced
	const isBusy = creation.isPending || creation.isSuccess;

	return (
		<PageLayout title={t('workspaceCreation.TITLE')} className="min-h-0 flex-1">
			<div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
				<header className="flex flex-col gap-1.5">
					<h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
						<Building aria-hidden="true" className="size-5 text-muted-foreground" />
						{t('workspaceCreation.TITLE')}
					</h1>
					<p className="text-[13px] text-pretty text-muted-foreground">
						{t('workspaceCreation.DESCRIPTION')}
					</p>
				</header>

				{isUnconfirmed && (
					<Notice
						tone="warning"
						title={t('workspaceCreation.ADDRESS_UNCONFIRMED_TITLE')}
						description={t('workspaceCreation.ADDRESS_UNCONFIRMED_DESCRIPTION')}
						actions={
							<Button asChild variant="outline" size="default">
								<NextLink href={PROFILE_SETTINGS_PATH}>{t('switchers.CONFIRM_ADDRESS')}</NextLink>
							</Button>
						}
					/>
				)}
				{isTimerRunning && !isClosed && (
					<Notice
						tone="warning"
						title={t('workspaceCreation.TIMER_RUNNING_TITLE')}
						description={t('workspaceCreation.TIMER_RUNNING_DESCRIPTION')}
					/>
				)}
				{isCreatedUnopened && (
					<Notice
						tone="warning"
						title={t('workspaceCreation.CREATED_NOT_OPENED_TITLE')}
						description={t('workspaceCreation.CREATED_NOT_OPENED_DESCRIPTION')}
					/>
				)}
				{failure === 'REGISTRATION_CLOSED' && (
					<Notice
						tone="error"
						title={t('workspaceCreation.REGISTRATION_CLOSED_TITLE')}
						description={t('workspaceCreation.REGISTRATION_CLOSED_DESCRIPTION')}
					/>
				)}
				{(failure === 'FAILED' || failure === 'INVALID') && (
					<Notice
						tone="error"
						title={t('workspaceCreation.FAILED_TITLE')}
						description={t('workspaceCreation.FAILED_DESCRIPTION')}
					/>
				)}

				<form className="flex flex-col gap-5" noValidate onSubmit={submit}>
					<fieldset className="flex flex-col gap-5" disabled={isBusy || isClosed}>
						<div>
							<DialogFieldLabel htmlFor="workspace-name" isRequired>
								{t('workspaceCreation.NAME_LABEL')}
							</DialogFieldLabel>
							<Input
								id="workspace-name"
								autoFocus
								autoComplete="organization"
								maxLength={MAX_WORKSPACE_NAME_LENGTH}
								placeholder={t('workspaceCreation.NAME_PLACEHOLDER')}
								aria-invalid={Boolean(errors.name)}
								aria-describedby={errors.name ? 'workspace-name-error' : undefined}
								{...form.register('name')}
							/>
							{errors.name && (
								<p id="workspace-name-error" className="mt-1.5 text-xs text-destructive-ink">
									{errors.name.message}
								</p>
							)}
						</div>

						<div>
							<DialogFieldLabel htmlFor="workspace-team" isRequired>
								{t('workspaceCreation.TEAM_LABEL')}
							</DialogFieldLabel>
							<Input
								id="workspace-team"
								autoComplete="off"
								maxLength={MAX_WORKSPACE_NAME_LENGTH}
								aria-invalid={Boolean(errors.teamName)}
								aria-describedby={errors.teamName ? 'workspace-team-error' : 'workspace-team-hint'}
								{...form.register('teamName')}
							/>
							{errors.teamName ? (
								<p id="workspace-team-error" className="mt-1.5 text-xs text-destructive-ink">
									{errors.teamName.message}
								</p>
							) : (
								<p id="workspace-team-hint" className="mt-1.5 text-xs text-muted-foreground">
									{t('workspaceCreation.TEAM_HINT')}
								</p>
							)}
						</div>

						<div>
							<DialogFieldLabel
								htmlFor="workspace-invites"
								optionalLabel={t('workspaceCreation.OPTIONAL')}
							>
								{t('workspaceCreation.INVITES_LABEL')}
							</DialogFieldLabel>
							<textarea
								id="workspace-invites"
								rows={3}
								autoComplete="off"
								placeholder="ada@example.com, grace@example.com"
								aria-invalid={Boolean(errors.invites)}
								aria-describedby={errors.invites ? 'workspace-invites-error' : 'workspace-invites-hint'}
								className={cn(controlRecipe, 'min-h-20 resize-y px-2.5 py-2')}
								{...form.register('invites')}
							/>
							{errors.invites ? (
								<p id="workspace-invites-error" className="mt-1.5 text-xs text-destructive-ink">
									{errors.invites.message}
								</p>
							) : (
								<p id="workspace-invites-hint" className="mt-1.5 text-xs text-muted-foreground">
									{t('workspaceCreation.INVITES_HINT')}
								</p>
							)}
						</div>
					</fieldset>

					<div className="flex flex-wrap items-center justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							size="default"
							onClick={() => router.back()}
							disabled={isBusy}
						>
							{t('common.CANCEL')}
						</Button>
						<Button
							type="submit"
							size="default"
							aria-busy={isBusy}
							disabled={isBusy || isClosed || isTimerRunning}
						>
							{isBusy ? t('workspaceCreation.CREATING') : t('workspaceCreation.CREATE')}
						</Button>
					</div>
				</form>
			</div>
		</PageLayout>
	);
}
