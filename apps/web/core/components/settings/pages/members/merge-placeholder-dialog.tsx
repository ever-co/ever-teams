'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { toastMoment } from '@/core/components/common/toast-moment';
import { Button } from '@/core/components/duplicated-components/_button';
import { Alert, Clock, Spinner, Task, UserRemove, Users } from '@/core/components/icons';
import { ConfirmDestructiveDialog, type DangerConsequence } from '@/core/components/settings/kit/danger';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { placeholderFailureOf, type PlaceholderFailure } from '@/core/lib/utils/member-placeholder';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import type { IEmployeePlaceholderMergePreview } from '@/core/types/interfaces/organization/employee-placeholder';
import { MemberAvatar, PersonLines } from './people-parts';

type Translate = ReturnType<typeof useTranslations>;

type PreviewState =
	| { kind: 'none' }
	| { kind: 'loading'; targetId: string }
	| { kind: 'ready'; targetId: string; preview: IEmployeePlaceholderMergePreview }
	| { kind: 'failed'; targetId: string; failure: PlaceholderFailure };

const NO_PREVIEW: PreviewState = { kind: 'none' };

function consequencesOf(
	preview: IEmployeePlaceholderMergePreview,
	name: string,
	targetName: string,
	t: Translate
): DangerConsequence[] {
	const consequences: DangerConsequence[] = [
		{
			key: 'time',
			icon: <Clock />,
			text: t('settings.members.placeholder.MERGE_MOVES_TIME', {
				count: preview.timeLogs,
				duration: formatDurationShort(preview.duration),
				target: targetName
			})
		},
		{
			key: 'work',
			icon: <Task />,
			text: t('settings.members.placeholder.MERGE_MOVES_WORK', {
				timesheets: preview.timesheets,
				tasks: preview.taskAssignments
			})
		}
	];
	const teams = preview.teams.map((team) => team.name).filter(Boolean);
	if (teams.length > 0) {
		consequences.push({
			key: 'teams',
			icon: <Users />,
			text: t('settings.members.placeholder.MERGE_MOVES_TEAMS', { teams: teams.join(', '), target: targetName })
		});
	}
	if (preview.overlappingTimeLogs > 0) {
		consequences.push({
			key: 'overlaps',
			icon: <Alert />,
			text: t('settings.members.placeholder.MERGE_OVERLAPS', {
				count: preview.overlappingTimeLogs,
				target: targetName
			})
		});
	}
	consequences.push({
		key: 'removed',
		icon: <UserRemove />,
		text: t('settings.members.placeholder.MERGE_REMOVES', { name })
	});
	return consequences;
}

/**
 * Merges a member without an account into a member who has one: pick the member, read what moves (entries, hours,
 * timesheets, assignments, teams, and entries that overlap the member's own), then confirm in the app's confirmation
 * dialog. A refusal (two time off balances of the same policy and year) says what to settle first.
 */
export function MergePlaceholderDialog({
	member,
	targets,
	onClose,
	onPreview,
	onMerge
}: Readonly<{
	member: MemberRowModel | null;
	targets: ReadonlyArray<MemberRowModel>;
	onClose: () => void;
	onPreview: (employeeId: string, targetEmployeeId: string) => Promise<IEmployeePlaceholderMergePreview>;
	onMerge: (employeeId: string, targetEmployeeId: string) => Promise<unknown>;
}>) {
	const t = useTranslations();
	const selectId = useId();
	const [shown, setShown] = useState<MemberRowModel | null>(member);
	const [targetId, setTargetId] = useState('');
	const [preview, setPreview] = useState<PreviewState>(NO_PREVIEW);
	const [failure, setFailure] = useState<PlaceholderFailure | null>(null);
	const [isMerging, setIsMerging] = useState(false);
	// The answer of a preview asked for another member, or before the dialog closed, is dropped
	const requestRef = useRef(0);

	if (member && member !== shown) {
		setShown(member);
		setTargetId('');
		setPreview(NO_PREVIEW);
		setFailure(null);
	}
	const name = shown?.name ?? '';
	const employeeId = shown?.employeeId ?? null;
	const target = targets.find((candidate) => candidate.employeeId === targetId) ?? null;
	const targetName = target?.name ?? '';

	useEffect(() => {
		return () => {
			requestRef.current += 1;
		};
	}, []);

	const readPreview = async (nextTargetId: string) => {
		if (!employeeId || !nextTargetId) {
			return;
		}
		requestRef.current += 1;
		const request = requestRef.current;
		setPreview({ kind: 'loading', targetId: nextTargetId });
		try {
			const read = await onPreview(employeeId, nextTargetId);
			if (requestRef.current === request) {
				setPreview({ kind: 'ready', targetId: nextTargetId, preview: read });
			}
		} catch (error) {
			if (requestRef.current === request) {
				setPreview({ kind: 'failed', targetId: nextTargetId, failure: placeholderFailureOf(error, 'merge') });
			}
		}
	};

	const chooseTarget = (next: string | null) => {
		const nextTargetId = next ?? '';
		setTargetId(nextTargetId);
		setFailure(null);
		void readPreview(nextTargetId);
	};

	// The dialog stays mounted: the next opening, of this member too, starts from no choice and no preview
	const resetAndClose = () => {
		requestRef.current += 1;
		setTargetId('');
		setPreview(NO_PREVIEW);
		setFailure(null);
		onClose();
	};

	const close = () => {
		if (isMerging) {
			return;
		}
		resetAndClose();
	};

	const confirm = async () => {
		const isReady = preview.kind === 'ready' && preview.targetId === targetId;
		if (!employeeId || !isReady) {
			return;
		}
		setIsMerging(true);
		setFailure(null);
		try {
			await onMerge(employeeId, targetId);
			toastMoment(t('settings.members.placeholder.MERGED', { name, target: targetName }), <Users />);
			resetAndClose();
		} catch (error) {
			setFailure(placeholderFailureOf(error, 'merge'));
		} finally {
			setIsMerging(false);
		}
	};

	let consequences: DangerConsequence[] = [];
	if (preview.kind === 'ready') {
		consequences = consequencesOf(preview.preview, name, targetName, t);
	}
	const isPreviewReady = preview.kind === 'ready';
	let error: string | null = null;
	if (failure) {
		error = `${t('settings.members.placeholder.MERGE_FAILED')} ${t(failure.key as DottedLanguageObjectStringPaths, failure.values)}`;
	}
	const hasTargets = targets.length > 0;

	const subject = shown && (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3 rounded-xl px-1">
				<MemberAvatar name={shown.name} imageUrl={shown.imageUrl} />
				<PersonLines name={shown.name} detail={shown.email || t('settings.members.placeholder.NO_ACCOUNT')} />
			</div>
			<div className="flex flex-col">
				<DialogFieldLabel htmlFor={selectId}>{t('settings.members.placeholder.MERGE_INTO')}</DialogFieldLabel>
				{hasTargets && (
					<Select value={targetId} onValueChange={chooseTarget} disabled={isMerging}>
						<SelectTrigger id={selectId} className="h-9 w-full text-[13px]">
							<SelectValue placeholder={t('settings.members.placeholder.MERGE_PICK')} />
						</SelectTrigger>
						<SelectContent align="start" className="max-h-72">
							<SelectGroup>
								{targets.map((candidate) => (
									<SelectItem
										key={candidate.employeeId ?? candidate.id}
										value={candidate.employeeId ?? ''}
										className="text-[13px]"
									>
										<span className="min-w-0 truncate">{candidate.name}</span>
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				)}
				{!hasTargets && (
					<p className="text-[13px] text-pretty text-muted-foreground">
						{t('settings.members.placeholder.MERGE_NO_TARGET')}
					</p>
				)}
			</div>
			{preview.kind === 'loading' && (
				<p className="flex items-center gap-2 text-[13px] text-muted-foreground" role="status">
					<Spinner aria-hidden="true" className="size-3.5 animate-spin" />
					{t('settings.members.placeholder.MERGE_READING')}
				</p>
			)}
			{preview.kind === 'failed' && (
				<div className="flex flex-wrap items-center justify-between gap-2" role="alert">
					<p className="min-w-0 text-[13px] text-pretty text-destructive-ink">
						{t('settings.members.placeholder.MERGE_PREVIEW_FAILED')}{' '}
						{t(preview.failure.key as DottedLanguageObjectStringPaths, preview.failure.values)}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void readPreview(preview.targetId)}
					>
						{t('settings.members.placeholder.RETRY')}
					</Button>
				</div>
			)}
		</div>
	);

	return (
		<ConfirmDestructiveDialog
			open={Boolean(member)}
			onClose={close}
			title={t('settings.members.placeholder.MERGE_TITLE', { name })}
			description={t('settings.members.placeholder.MERGE_DESCRIPTION')}
			subject={subject}
			consequences={consequences}
			confirmLabel={t('settings.members.placeholder.MERGE_CONFIRM')}
			isPending={isMerging}
			confirmDisabled={!isPreviewReady}
			error={error}
			onConfirm={() => {
				void confirm();
			}}
		/>
	);
}
