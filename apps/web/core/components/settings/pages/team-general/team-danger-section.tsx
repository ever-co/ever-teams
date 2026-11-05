'use client';

import { ReactNode, useId, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { LogOut, ShieldUser, User, UserAdd, Users } from '@/core/components/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { TeamDangerBlock } from '@/core/lib/utils/settings-team';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useTeamDangerZone, type TransferCandidate } from '@/core/hooks/settings/use-team-danger-zone';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { ConfirmDestructiveDialog, DangerRow } from '@/core/components/settings/kit/danger';

type DangerAction = 'transfer' | 'remove' | 'quit';

const BLOCK_REASON_KEYS: Record<TeamDangerBlock, DottedLanguageObjectStringPaths> = {
	notManager: 'settings.teamGeneral.BLOCKED_NOT_MANAGER',
	needsSecondManager: 'settings.teamGeneral.BLOCKED_NEEDS_SECOND_MANAGER',
	otherManagers: 'settings.teamGeneral.BLOCKED_OTHER_MANAGERS',
	onlyManager: 'settings.teamGeneral.BLOCKED_ONLY_MANAGER',
	notMember: 'settings.teamGeneral.BLOCKED_NOT_MEMBER'
};

type Translate = ReturnType<typeof useTranslations>;

function reasonOf(error: unknown, t: Translate): string {
	const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
	return t(reasonKey);
}

function Consequence({ text, block }: Readonly<{ text: string; block: TeamDangerBlock | null }>) {
	const t = useTranslations();
	return (
		<>
			{text}
			{block && <span className="mt-0.5 block text-foreground/70">{t(BLOCK_REASON_KEYS[block])}</span>}
		</>
	);
}

function useConfirmedAction(action: () => Promise<void>, onDone: () => void) {
	const t = useTranslations();
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const run = async () => {
		setIsPending(true);
		setError(null);
		try {
			await action();
			onDone();
		} catch (failure) {
			setError(reasonOf(failure, t));
		} finally {
			setIsPending(false);
		}
	};

	const reset = () => setError(null);

	return { isPending, error, setError, run, reset };
}

interface DialogProps {
	open: boolean;
	onClose: () => void;
	teamName: string;
}

function TransferTeamDialog({
	open,
	onClose,
	teamName,
	candidates,
	onTransfer
}: Readonly<
	DialogProps & { candidates: TransferCandidate[]; onTransfer: (newManagerEmployeeId: string) => Promise<void> }
>) {
	const t = useTranslations();
	const pickerId = useId();
	const [employeeId, setEmployeeId] = useState('');
	const close = () => {
		setEmployeeId('');
		onClose();
	};
	const confirmed = useConfirmedAction(() => onTransfer(employeeId), close);
	const picked = candidates.find((candidate) => candidate.employeeId === employeeId);
	const hasPicked = Boolean(picked);

	const confirm = () => {
		if (!picked) {
			confirmed.setError(t('settings.teamGeneral.TRANSFER_PICK_REQUIRED'));
			return;
		}
		void confirmed.run();
	};

	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={() => {
				confirmed.reset();
				close();
			}}
			title={t('settings.teamGeneral.TRANSFER_TITLE', { team: teamName })}
			description={t('settings.teamGeneral.TRANSFER_DESCRIPTION')}
			consequences={[
				{
					key: 'new-manager',
					icon: <ShieldUser />,
					text: t('settings.teamGeneral.TRANSFER_CONSEQUENCE_NEW')
				},
				{ key: 'you', icon: <User />, text: t('settings.teamGeneral.TRANSFER_CONSEQUENCE_YOU') }
			]}
			confirmLabel={t('settings.teamGeneral.TRANSFER_ACTION')}
			isPending={confirmed.isPending}
			confirmDisabled={!hasPicked}
			error={confirmed.error}
			onConfirm={confirm}
		>
			<div className="flex flex-col gap-1.5">
				<label htmlFor={pickerId} className="text-xs text-muted-foreground">
					{t('settings.teamGeneral.TRANSFER_PICK_LABEL')}
				</label>
				<Select
					value={employeeId}
					onValueChange={(next) => {
						setEmployeeId(next);
						confirmed.reset();
					}}
				>
					<SelectTrigger id={pickerId} className="h-8 text-[13px]">
						<SelectValue placeholder={t('settings.teamGeneral.TRANSFER_PICK_PLACEHOLDER')}>
							{picked?.name}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{candidates.map((candidate) => (
							<SelectItem key={candidate.employeeId} value={candidate.employeeId} className="text-[13px]">
								{candidate.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</ConfirmDestructiveDialog>
	);
}

function DeleteTeamDialog({
	open,
	onClose,
	teamName,
	onDelete
}: Readonly<DialogProps & { onDelete: () => Promise<void> }>) {
	const t = useTranslations();
	const confirmed = useConfirmedAction(onDelete, onClose);
	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={() => {
				confirmed.reset();
				onClose();
			}}
			title={t('settings.teamGeneral.DELETE_TITLE', { team: teamName })}
			description={t('settings.teamGeneral.DELETE_DESCRIPTION')}
			consequences={[
				{ key: 'members', icon: <Users />, text: t('settings.teamGeneral.DELETE_CONSEQUENCE_MEMBERS') },
				{ key: 'sign-out', icon: <LogOut />, text: t('settings.teamGeneral.DELETE_CONSEQUENCE_SIGN_OUT') }
			]}
			confirmationText={teamName}
			confirmLabel={t('settings.teamGeneral.DELETE_ACTION')}
			isPending={confirmed.isPending}
			error={confirmed.error}
			onConfirm={() => {
				void confirmed.run();
			}}
		/>
	);
}

function QuitTeamDialog({ open, onClose, teamName, onQuit }: Readonly<DialogProps & { onQuit: () => Promise<void> }>) {
	const t = useTranslations();
	const confirmed = useConfirmedAction(onQuit, onClose);
	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={() => {
				confirmed.reset();
				onClose();
			}}
			title={t('settings.teamGeneral.QUIT_TITLE', { team: teamName })}
			consequences={[
				{ key: 'list', icon: <LogOut />, text: t('settings.teamGeneral.QUIT_CONSEQUENCE_LIST') },
				{ key: 'back', icon: <UserAdd />, text: t('settings.teamGeneral.QUIT_CONSEQUENCE_BACK') }
			]}
			confirmLabel={t('settings.teamGeneral.QUIT_ACTION')}
			isPending={confirmed.isPending}
			error={confirmed.error}
			onConfirm={() => {
				void confirmed.run();
			}}
		/>
	);
}

function DangerDialogs({
	openAction,
	onClose,
	danger
}: Readonly<{ openAction: DangerAction | null; onClose: () => void; danger: ReturnType<typeof useTeamDangerZone> }>) {
	const isTransferOpen = openAction === 'transfer';
	const isRemoveOpen = openAction === 'remove';
	const isQuitOpen = openAction === 'quit';
	const mountsTransfer = useHasBeenOpen(isTransferOpen);
	const mountsRemove = useHasBeenOpen(isRemoveOpen);
	const mountsQuit = useHasBeenOpen(isQuitOpen);

	return (
		<>
			{mountsTransfer && (
				<TransferTeamDialog
					open={isTransferOpen}
					onClose={onClose}
					teamName={danger.teamName}
					candidates={danger.transferCandidates}
					onTransfer={danger.transferTeam}
				/>
			)}
			{mountsRemove && (
				<DeleteTeamDialog
					open={isRemoveOpen}
					onClose={onClose}
					teamName={danger.teamName}
					onDelete={danger.deleteTeam}
				/>
			)}
			{mountsQuit && (
				<QuitTeamDialog
					open={isQuitOpen}
					onClose={onClose}
					teamName={danger.teamName}
					onQuit={danger.quitTeam}
				/>
			)}
		</>
	);
}

export function TeamDangerSection() {
	const t = useTranslations();
	const danger = useTeamDangerZone();
	const [openAction, setOpenAction] = useState<DangerAction | null>(null);
	const { rules } = danger;

	const consequenceOf = (textKey: DottedLanguageObjectStringPaths, block: TeamDangerBlock | null): ReactNode => (
		<Consequence text={t(textKey)} block={block} />
	);

	return (
		<SettingsSection id="danger-zone" title={t('settings.teamGeneral.DANGER_SECTION')} tone="danger">
			<SettingsSurface>
				<DangerRow
					label={t('settings.teamGeneral.TRANSFER_LABEL')}
					consequence={consequenceOf('settings.teamGeneral.TRANSFER_CONSEQUENCE', rules.transfer)}
					actionLabel={t('settings.teamGeneral.TRANSFER_ACTION')}
					onAction={() => setOpenAction('transfer')}
					disabled={Boolean(rules.transfer)}
				/>
				<DangerRow
					label={t('settings.teamGeneral.QUIT_LABEL')}
					consequence={consequenceOf('settings.teamGeneral.QUIT_CONSEQUENCE', rules.quit)}
					actionLabel={t('settings.teamGeneral.QUIT_ACTION')}
					onAction={() => setOpenAction('quit')}
					disabled={Boolean(rules.quit)}
				/>
				<DangerRow
					label={t('settings.teamGeneral.DELETE_LABEL')}
					consequence={consequenceOf('settings.teamGeneral.DELETE_CONSEQUENCE', rules.remove)}
					actionLabel={t('settings.teamGeneral.DELETE_ACTION')}
					onAction={() => setOpenAction('remove')}
					disabled={Boolean(rules.remove)}
				/>
			</SettingsSurface>
			<DangerDialogs openAction={openAction} onClose={() => setOpenAction(null)} danger={danger} />
		</SettingsSection>
	);
}
