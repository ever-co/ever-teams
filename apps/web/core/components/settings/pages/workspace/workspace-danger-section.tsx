'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowRight, Download, Folder, Invoice, Spinner, Users, UsersGroup } from '@/core/components/icons';
import { ConfirmDestructiveDialog, DangerRow, type DangerConsequence } from '@/core/components/settings/kit/danger';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useOrganizationDeletion, type OrganizationDeletion } from '@/core/hooks/settings/use-organization-deletion';
import { ACCOUNT_DELETION_PATH } from '@/core/lib/auth/account-deletion';
import { deletionErrorKeyOf, trackedHoursOf, type DeletableOrganization } from '@/core/lib/utils/organization-deletion';

type Translate = ReturnType<typeof useTranslations>;

/** The workspace export (#5240), offered in the confirmation to a person who may run it. */
interface WorkspaceExportOffer {
	isExporting: boolean;
	onExport: () => void;
}

function consequencesOf(deletion: OrganizationDeletion, t: Translate): DangerConsequence[] {
	const { counts, landing } = deletion;
	if (!counts) {
		return [];
	}
	const landingConsequence: DangerConsequence = landing
		? {
				key: 'landing',
				icon: <ArrowRight />,
				text: t('settings.workspace.deletion.CONSEQUENCE_LANDING', { organization: landing.name })
			}
		: { key: 'landing', icon: <ArrowRight />, text: t('settings.workspace.deletion.CONSEQUENCE_PICKER') };
	return [
		{
			key: 'teams',
			icon: <UsersGroup />,
			text: t('settings.workspace.deletion.CONSEQUENCE_TEAMS', { count: counts.teams })
		},
		{
			key: 'members',
			icon: <Users />,
			text: t('settings.workspace.deletion.CONSEQUENCE_MEMBERS', { count: counts.members })
		},
		{
			key: 'work',
			icon: <Folder />,
			text: t('settings.workspace.deletion.CONSEQUENCE_WORK', {
				projects: counts.projects,
				hours: trackedHoursOf(counts.trackedSeconds)
			})
		},
		{
			key: 'invoices',
			icon: <Invoice />,
			text: t('settings.workspace.deletion.CONSEQUENCE_INVOICES', { count: counts.invoices })
		},
		landingConsequence
	];
}

function CountsLoading() {
	const t = useTranslations();
	return (
		<div aria-busy="true" className="flex flex-col gap-2.5 rounded-xl bg-foreground/[0.03] px-3.5 py-3">
			<p className="text-[13px] leading-5 text-muted-foreground">
				{t('settings.workspace.deletion.COUNTS_LOADING')}
			</p>
			{['w-3/5', 'w-1/2', 'w-4/5', 'w-2/5'].map((width) => (
				<span key={width} className={`h-3.5 animate-pulse rounded bg-foreground/[0.06] ${width}`} />
			))}
		</div>
	);
}

/** What the confirmation says instead of the counts: why the delete stays off, and what the person can do. */
function DeletionNotice({ deletion }: Readonly<{ deletion: OrganizationDeletion }>) {
	const t = useTranslations();
	if (deletion.status === 'loading') {
		return <CountsLoading />;
	}
	if (deletion.status === 'unsupported') {
		return (
			<Notice
				tone="warning"
				title={t('settings.workspace.deletion.UNSUPPORTED')}
				description={t('settings.workspace.deletion.UNSUPPORTED_DESCRIPTION')}
			/>
		);
	}
	if (deletion.status === 'failed') {
		return (
			<Notice
				tone="error"
				title={t('settings.workspace.deletion.COUNTS_FAILED')}
				description={t('settings.workspace.deletion.COUNTS_FAILED_DESCRIPTION')}
				actions={
					<Button type="button" variant="outline" onClick={deletion.retry}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		);
	}
	if (deletion.block === 'timerRunning') {
		return (
			<Notice
				tone="warning"
				title={t('settings.workspace.deletion.TIMER_RUNNING')}
				description={t('settings.workspace.deletion.TIMER_RUNNING_DESCRIPTION')}
			/>
		);
	}
	if (deletion.block === 'lastOrganization') {
		return (
			<Notice
				tone="info"
				title={t('settings.workspace.deletion.LAST_ORGANIZATION')}
				description={t('settings.workspace.deletion.LAST_ORGANIZATION_DESCRIPTION')}
				actions={
					<Button variant="outline" asChild>
						<Link href={ACCOUNT_DELETION_PATH}>
							{t('settings.workspace.deletion.LAST_ORGANIZATION_ACTION')}
						</Link>
					</Button>
				}
			/>
		);
	}
	return null;
}

/** The export, offered before anything goes: once deleted, the organization's data no longer comes with it. */
function ExportFirst({ dataExport }: Readonly<{ dataExport: WorkspaceExportOffer }>) {
	const t = useTranslations();
	let actionIcon = <Download />;
	let actionLabel = t('settings.workspace.EXPORT_ACTION');
	if (dataExport.isExporting) {
		actionIcon = <Spinner className="size-3.5 animate-spin" />;
		actionLabel = t('settings.workspace.EXPORTING');
	}
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl bg-foreground/[0.03] px-3.5 py-3">
			<p className="text-[13px] leading-5 text-muted-foreground">
				{t('settings.workspace.deletion.EXPORT_FIRST')}
			</p>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={dataExport.onExport}
				disabled={dataExport.isExporting}
				aria-busy={dataExport.isExporting || undefined}
				className="shrink-0"
			>
				{actionIcon}
				{actionLabel}
			</Button>
		</div>
	);
}

function DeleteOrganizationDialog({
	open,
	onClose,
	organization,
	deletion,
	dataExport
}: Readonly<{
	open: boolean;
	onClose: () => void;
	organization: DeletableOrganization;
	deletion: OrganizationDeletion;
	dataExport?: WorkspaceExportOffer;
}>) {
	const t = useTranslations();
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const isReady = deletion.status === 'ready' && !deletion.block;

	const close = () => {
		setError(null);
		onClose();
	};

	const confirm = async () => {
		setIsPending(true);
		setError(null);
		try {
			// On success the app opens the next organization: the pending state holds until the page is replaced
			await deletion.deleteOrganization();
		} catch (error_) {
			setError(t(deletionErrorKeyOf(error_) as DottedLanguageObjectStringPaths));
			setIsPending(false);
		}
	};

	return (
		<ConfirmDestructiveDialog
			open={open}
			onClose={close}
			title={t('settings.workspace.deletion.DELETE_TITLE', { organization: organization.name })}
			description={t('settings.workspace.deletion.DELETE_DESCRIPTION')}
			consequences={isReady ? consequencesOf(deletion, t) : []}
			confirmationText={isReady ? organization.name : undefined}
			confirmLabel={t('settings.workspace.deletion.DELETE_ACTION')}
			isPending={isPending}
			confirmDisabled={!isReady}
			error={error}
			onConfirm={() => {
				void confirm();
			}}
		>
			{dataExport && <ExportFirst dataExport={dataExport} />}
			<DeletionNotice deletion={deletion} />
		</ConfirmDestructiveDialog>
	);
}

/**
 * The end of Settings > Workspace: deleting the current organization (ever-co/ever-teams#5207), shown to the roles
 * Gauzy lets delete it (ALL_ORG_EDIT). The confirmation lists what goes with Gauzy's own counts, and offers the
 * workspace export first when the person may run it.
 */
export function WorkspaceDangerSection({
	organization,
	dataExport
}: Readonly<{ organization: DeletableOrganization; dataExport?: WorkspaceExportOffer }>) {
	const t = useTranslations();
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const deletion = useOrganizationDeletion(organization, isConfirmOpen);
	const mountsDialog = useHasBeenOpen(isConfirmOpen);

	if (!deletion.canDelete) {
		return null;
	}

	return (
		<SettingsSection id="danger-zone" title={t('settings.workspace.deletion.DANGER_SECTION')} tone="danger">
			<SettingsSurface>
				<DangerRow
					label={t('settings.workspace.deletion.DELETE_LABEL')}
					consequence={t('settings.workspace.deletion.DELETE_CONSEQUENCE')}
					actionLabel={t('settings.workspace.deletion.DELETE_ACTION')}
					onAction={() => setIsConfirmOpen(true)}
					data-testid="workspace-delete-organization"
				/>
			</SettingsSurface>
			{mountsDialog && (
				<DeleteOrganizationDialog
					open={isConfirmOpen}
					onClose={() => setIsConfirmOpen(false)}
					organization={organization}
					deletion={deletion}
					dataExport={dataExport}
				/>
			)}
		</SettingsSection>
	);
}
