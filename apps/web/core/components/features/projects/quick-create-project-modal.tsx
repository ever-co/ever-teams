'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { DictationButton } from '@/core/components/common/dictation-button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/common/button';
import { PersonFace, teamImageOf } from '@/core/components/projects/project-cells';
import { ProjectTileFace } from '@/core/components/projects/composer/project-tile-picker';
import { ENTITY_CHIP, PERSON_CHIP, VALUE_CHIP } from '@/core/components/projects/composer/composer-recipes';
import {
	PROJECT_DIALOG_BODY,
	PROJECT_DIALOG_FOOTER,
	ProjectDialog,
	ProjectDialogHeader,
	ProjectDialogShortcut
} from '@/core/components/projects/dialogs/project-dialog';
import { useCreateOrganizationProject } from '@/core/hooks/organizations/projects/use-create-organization-project';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { appendDictatedText } from '@/core/hooks/ai/use-dictation';
import { cn } from '@/core/lib/helpers';
import { PROJECT_NAME_MAX_LENGTH } from '@/core/lib/utils/project-composer';
import { activeTeamState, isTeamManagerState } from '@/core/stores';
import type { TOrganizationProject } from '@/core/types/schemas';
import { useFocusOnMount } from '@/core/hooks/common/use-focus-on-mount';

interface IQuickCreateProjectModalProps {
	open: boolean;
	closeModal: () => void;
	onSuccess?: (project: TOrganizationProject) => void;
}

const NAME_FIELD =
	'w-full min-w-0 border-0 bg-transparent p-0 text-lg font-semibold text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50';

function idsWhen(isWanted: boolean, id: string | null | undefined) {
	const hasId = Boolean(id);
	const keepsId = isWanted && hasId;
	if (!keepsId) {
		return [];
	}
	return [id as string];
}

function teamsOf<T>(activeTeam: T | null | undefined): T[] {
	if (!activeTeam) {
		return [];
	}
	return [activeTeam];
}

/**
 * Quick create sets the project up on its own: the active team, the user as a member, and the user as a manager
 * when they manage the team. The dialog says so under the name, so nothing is assigned behind the user's back.
 */
function QuickCreateForm({ closeModal, onSuccess }: Readonly<Omit<IQuickCreateProjectModalProps, 'open'>>) {
	const t = useTranslations();
	const focusOnMount = useFocusOnMount<HTMLInputElement>();
	const activeTeam = useAtomValue(activeTeamState);
	const isTeamManager = useAtomValue(isTeamManagerState);
	const { data: user } = useUserQuery();
	const { createOrganizationProject, createOrganizationProjectLoading } = useCreateOrganizationProject();
	const [name, setName] = useState('');
	const [hasFailed, setHasFailed] = useState(false);

	const employeeId = user?.employee?.id ?? user?.employeeId ?? null;
	const userName = user?.employee?.fullName || user?.name || '';
	const trimmedName = name.trim();
	const hasName = trimmedName.length > 0;
	const canCreate = hasName && !createOrganizationProjectLoading;
	let roleLabel = t('pages.projects.modals.quick.asMember');
	if (isTeamManager) {
		roleLabel = t('pages.projects.modals.quick.asManager');
	}

	const appendDictatedName = useCallback((text: string) => {
		setName((current) => appendDictatedText(current, text));
	}, []);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canCreate) {
			return;
		}
		setHasFailed(false);
		const project = await createOrganizationProject({
			name: trimmedName,
			teams: teamsOf(activeTeam),
			memberIds: idsWhen(true, employeeId),
			managerIds: idsWhen(isTeamManager, employeeId)
		});
		if (!project) {
			setHasFailed(true);
			return;
		}
		onSuccess?.(project);
		closeModal();
	};

	return (
		<form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
			<ProjectDialogHeader
				title={t('modals.project.createTitle')}
				context={
					activeTeam && (
						<>
							<EntityTile
								name={activeTeam.name}
								color={activeTeam.color}
								imageUrl={teamImageOf(activeTeam)}
								className="size-4 text-[7px]"
							/>
							<span className="truncate">{activeTeam.name}</span>
						</>
					)
				}
				onClose={closeModal}
			/>
			<div className={cn(PROJECT_DIALOG_BODY, 'pb-5')}>
				<div className="flex items-center gap-3 pt-1">
					<ProjectTileFace name={name} color={null} imageUrl={null} size="md" />
					<input
						ref={focusOnMount}
						data-initial-focus=""
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={PROJECT_NAME_MAX_LENGTH}
						placeholder={t('modals.project.namePlaceholder')}
						aria-label={t('modals.project.namePlaceholder')}
						className={NAME_FIELD}
					/>
					<DictationButton onText={appendDictatedName} />
				</div>
				<div className="mt-4 flex flex-wrap items-center gap-1.5">
					<span className="mr-1 text-xs text-muted-foreground">{t('pages.projects.modals.quick.setUp')}</span>
					{activeTeam && (
						<span className={cn(VALUE_CHIP, ENTITY_CHIP, 'pr-2')}>
							<EntityTile
								name={activeTeam.name}
								color={activeTeam.color}
								imageUrl={teamImageOf(activeTeam)}
								className="size-4 text-[7px]"
							/>
							<span className="truncate">{activeTeam.name}</span>
						</span>
					)}
					{employeeId && (
						<span className={cn(VALUE_CHIP, PERSON_CHIP, 'pr-2')}>
							<PersonFace
								person={{ id: employeeId, name: userName, imageUrl: user?.imageUrl }}
								className="size-5"
							/>
							<span className="truncate">{roleLabel}</span>
						</span>
					)}
				</div>
			</div>
			<div className={PROJECT_DIALOG_FOOTER}>
				{hasFailed && (
					<p role="alert" className="mr-auto text-xs text-destructive-ink">
						{t('pages.projects.modals.errors.save')}
					</p>
				)}
				{!hasFailed && (
					<span className="mr-auto">
						<ProjectDialogShortcut keys={['↵']} label={t('pages.projects.list.CREATE_PROJECT')} />
					</span>
				)}
				<Button
					type="button"
					variant="ghost"
					size="default"
					onClick={closeModal}
					disabled={createOrganizationProjectLoading}
				>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" size="default" loading={createOrganizationProjectLoading} disabled={!canCreate}>
					{t('pages.projects.list.CREATE_PROJECT')}
				</Button>
			</div>
		</form>
	);
}

export function QuickCreateProjectModal({ open, closeModal, onSuccess }: Readonly<IQuickCreateProjectModalProps>) {
	return (
		<ProjectDialog open={open} onClose={closeModal} width="md">
			{open && <QuickCreateForm closeModal={closeModal} onSuccess={onSuccess} />}
		</ProjectDialog>
	);
}
