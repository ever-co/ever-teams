'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { toast } from 'sonner';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Button } from '@/core/components/duplicated-components/_button';
import { LogOut, Task, Trash, UserCheck, UserRemove, Users } from '@/core/components/icons';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { ConfirmDestructiveDialog, DangerConsequence, DangerRow } from '@/core/components/settings/kit/danger';
import { AccountDangerAction, useAccountDangerZone } from '@/core/hooks/settings/use-account-danger-zone';
import { ACCOUNT_DELETION_PATH } from '@/core/lib/auth/account-deletion';
import { imgTitle } from '@/core/lib/helpers/img-title';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import { avatarUrlOf } from '@/core/lib/utils/settings-profile';
import { isAccountDeletionPlanChanged } from '@/core/services/client/api/auth/account-deletion.service';
import type { TUser } from '@/core/types/schemas';

const DeleteMyAccountPreview = dynamic(
	() =>
		import('@/core/components/pages/settings/personal/delete-my-account-preview').then(
			(module) => module.DeleteMyAccountPreview
		),
	{ ssr: false }
);

const NOT_FOUND_STATUS = 404;

type Translate = ReturnType<typeof useTranslations>;

interface DialogCopy {
	title: string;
	description?: string;
	confirmLabel: string;
	consequences: DangerConsequence[];
	confirmationText?: string;
}

function dialogCopyOf(action: AccountDangerAction, email: string, t: Translate): DialogCopy {
	if (action === 'leaveTeams') {
		return {
			title: t('settings.profile.LEAVE_TEAMS_TITLE'),
			confirmLabel: t('settings.profile.LEAVE_TEAMS_ACTION'),
			consequences: [
				{ key: 'teams', icon: <Users />, text: t('settings.profile.LEAVE_TEAMS_ROW_TEAMS') },
				{ key: 'tasks', icon: <Task />, text: t('settings.profile.LEAVE_TEAMS_ROW_TASKS') },
				{ key: 'kept', icon: <UserCheck />, text: t('settings.profile.LEAVE_TEAMS_ROW_KEPT') }
			]
		};
	}
	if (action === 'deleteAccount') {
		return {
			title: t('settings.profile.DELETE_ACCOUNT_TITLE'),
			confirmLabel: t('settings.profile.DELETE_ACCOUNT_ACTION'),
			consequences: [
				{ key: 'account', icon: <Trash />, text: t('settings.profile.DELETE_ACCOUNT_ROW_ACCOUNT') },
				{ key: 'teams', icon: <UserRemove />, text: t('settings.profile.DELETE_ACCOUNT_ROW_TEAMS') },
				{ key: 'sign-out', icon: <LogOut />, text: t('pages.accountDeletion.SIGN_OUT_AFTER') }
			],
			confirmationText: email
		};
	}
	return {
		title: t('settings.profile.DELETE_DATA_TITLE'),
		description: t('settings.profile.DELETE_DATA_DESCRIPTION'),
		confirmLabel: t('pages.accountDeletion.CONFIRM_BUTTON'),
		consequences: [],
		confirmationText: email
	};
}

function failureMessageOf(action: AccountDangerAction, failure: unknown, t: Translate): string {
	const isPlanChanged = action === 'deleteAllData' && isAccountDeletionPlanChanged(failure);
	if (isPlanChanged) {
		return t('pages.accountDeletion.PLAN_CHANGED');
	}
	const isNotFound = errorStatusOf(failure) === NOT_FOUND_STATUS;
	const isNothingToLeave = action === 'leaveTeams' && isNotFound;
	if (isNothingToLeave) {
		return t('settings.profile.LEAVE_TEAMS_NONE');
	}
	const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
	const reason = t(reasonKey);
	if (action === 'leaveTeams') {
		return t('settings.profile.LEAVE_FAILED', { reason });
	}
	return t('settings.profile.DELETE_FAILED', { reason });
}

function AccountSubject({ user }: Readonly<{ user: TUser | null | undefined }>) {
	const name = user?.name ?? '';
	const photoUrl = avatarUrlOf(user);
	const initials = imgTitle(name);

	return (
		<div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hairline-ring ring-border">
			<Avatar className="size-8">
				<AvatarImage src={photoUrl} alt="" />
				<AvatarFallback>{initials}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
				<span className="truncate text-xs text-muted-foreground">{user?.email}</span>
			</div>
		</div>
	);
}

export function AccountDangerSection() {
	const t = useTranslations();
	const [openAction, setOpenAction] = useState<AccountDangerAction | null>(null);
	/** The last action opened, kept while its dialog plays its closing transition. */
	const [shownAction, setShownAction] = useState<AccountDangerAction>('leaveTeams');
	const [error, setError] = useState<string | null>(null);
	const {
		user,
		leaveTeams,
		isLeavingTeams,
		deleteAccount,
		isDeletingAccount,
		deleteAllData,
		isDeletingAllData,
		preview,
		previewLoading,
		previewError,
		retryPreview,
		isPreviewReady
	} = useAccountDangerZone(openAction);
	const email = user?.email ?? '';

	const open = (action: AccountDangerAction) => {
		setError(null);
		setShownAction(action);
		setOpenAction(action);
	};

	const close = () => {
		setError(null);
		setOpenAction(null);
	};

	const pendingOf = (action: AccountDangerAction) => {
		if (action === 'leaveTeams') {
			return isLeavingTeams;
		}
		if (action === 'deleteAccount') {
			return isDeletingAccount;
		}
		return isDeletingAllData;
	};

	const run = async (action: AccountDangerAction) => {
		if (action === 'leaveTeams') {
			await leaveTeams();
			const message = t('settings.profile.LEAVE_TEAMS_DONE');
			toast.success(message);
			return;
		}
		if (action === 'deleteAccount') {
			await deleteAccount();
			return;
		}
		await deleteAllData();
	};

	const confirm = async () => {
		if (!openAction) {
			return;
		}
		const waitsForPreview = openAction === 'deleteAllData' && !isPreviewReady;
		if (waitsForPreview) {
			const message = t('settings.profile.DELETE_DATA_WAIT');
			setError(message);
			return;
		}
		setError(null);
		try {
			await run(openAction);
			close();
		} catch (failure) {
			const message = failureMessageOf(openAction, failure, t);
			setError(message);
		}
	};

	const copy = dialogCopyOf(shownAction, email, t);
	const showsPreview = shownAction === 'deleteAllData';
	const waitsForPreviewToShow = showsPreview && !isPreviewReady;
	const isPending = pendingOf(shownAction);
	const isOpen = openAction !== null;

	return (
		<SettingsSection
			id="danger-zone"
			tone="danger"
			title={t('settings.profile.SECTION_ACCOUNT')}
			description={t('settings.profile.SECTION_ACCOUNT_DESCRIPTION')}
		>
			<SettingsSurface>
				<DangerRow
					label={t('settings.profile.LEAVE_TEAMS')}
					consequence={t('settings.profile.LEAVE_TEAMS_CONSEQUENCE')}
					actionLabel={t('settings.profile.LEAVE_TEAMS_ACTION')}
					onAction={() => open('leaveTeams')}
				/>
				<DangerRow
					label={t('settings.profile.DELETE_ACCOUNT')}
					consequence={t('settings.profile.DELETE_ACCOUNT_CONSEQUENCE')}
					actionLabel={t('settings.profile.DELETE_ACCOUNT_ACTION')}
					onAction={() => open('deleteAccount')}
				/>
				<DangerRow
					label={t('settings.profile.DELETE_DATA')}
					consequence={t('settings.profile.DELETE_DATA_CONSEQUENCE')}
					actionLabel={t('settings.profile.DELETE_DATA_ACTION')}
					onAction={() => open('deleteAllData')}
				/>
				<SettingsRow
					label={t('pages.accountDeletion.DANGER_ZONE_TITLE')}
					description={t('pages.accountDeletion.DANGER_ZONE_DESCRIPTION')}
				>
					<Button asChild variant="outline" className="text-destructive-ink hover:bg-destructive/[0.06]">
						<Link href={ACCOUNT_DELETION_PATH} data-testid="danger-zone-delete-by-email">
							{t('pages.accountDeletion.DELETE_BY_EMAIL_LINK')}
						</Link>
					</Button>
				</SettingsRow>
			</SettingsSurface>
			<ConfirmDestructiveDialog
				open={isOpen}
				onClose={close}
				title={copy.title}
				description={copy.description}
				subject={<AccountSubject user={user} />}
				consequences={copy.consequences}
				confirmationText={copy.confirmationText}
				confirmLabel={copy.confirmLabel}
				isPending={isPending}
				confirmDisabled={waitsForPreviewToShow}
				error={error}
				onConfirm={confirm}
			>
				{showsPreview && (
					<DeleteMyAccountPreview
						preview={preview}
						loading={previewLoading}
						error={previewError}
						onRetry={retryPreview}
					/>
				)}
			</ConfirmDestructiveDialog>
		</SettingsSection>
	);
}
