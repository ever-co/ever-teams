'use client';

import { useCallback, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import {
	VOICE_FILL_FIELD_TRANSITION,
	VOICE_FILLED_FIELD,
	VoiceFillPanel,
	VoiceFillTrigger,
	useVoiceFillErrorToast
} from '@/core/components/common/voice-fill/voice-fill-controls';
import { LazyRichEditor } from '@/core/components/common/rich-editor/lazy-rich-editor';
import type { RichEditorStats } from '@/core/components/common/rich-editor/rich-editor';
import { Button } from '@/core/components/common/button';
import {
	Calendar,
	CircleCheck,
	FolderOpen,
	Globe,
	Key,
	Tag,
	UserCheck,
	Users,
	UsersGroup,
	Wallet
} from '@/core/components/icons';
import {
	PROJECT_DIALOG_BODY,
	PROJECT_DIALOG_FOOTER,
	ProjectDialogHeader,
	ProjectDialogShortcut
} from '@/core/components/projects/dialogs/project-dialog';
import { PropertyRow } from '@/core/components/projects/project-properties';
import { useProjectComposer, type ProjectComposerMode } from '@/core/hooks/projects/use-project-composer';
import { useProjectVoiceFill } from '@/core/hooks/projects/use-project-voice-fill';
import type { VoiceFill } from '@/core/hooks/ai/use-voice-fill';
import { useTeamMentionCandidates } from '@/core/hooks/organizations/teams/use-team-mention-candidates';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { cn } from '@/core/lib/helpers';
import { PROJECT_NAME_MAX_LENGTH, proposedTaskKey } from '@/core/lib/utils/project-composer';
import type { TOrganizationProject } from '@/core/types/schemas';
import { FIELD_ERROR, INLINE_FIELD } from './composer-recipes';
import { ProjectBillableRow } from './project-billable-row';
import { ProjectBudgetField } from './project-budget-field';
import { ProjectDateRange } from './project-date-range';
import {
	ProjectPeoplePicker,
	ProjectStatusPicker,
	ProjectTagsPicker,
	ProjectTeamsPicker
} from './project-property-pickers';
import { ProjectTilePicker } from './project-tile-picker';
import { toastMoment } from '@/core/components/common/toast-moment';
import { useFocusOnMount } from '@/core/hooks/common/use-focus-on-mount';

const DESCRIPTION_WORD_LIMIT = 5000;

const NAME_FIELD =
	'w-full min-w-0 border-0 bg-transparent p-0 text-xl font-semibold text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50';

const DESCRIPTION_FIELD =
	'max-h-56 min-h-14 overflow-y-auto px-0 py-0 text-sm text-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/60';

function isSubmitShortcut(event: KeyboardEvent<HTMLElement>) {
	const hasModifier = event.metaKey || event.ctrlKey;
	return event.key === 'Enter' && hasModifier;
}

/** A field the voice just filled takes a short tint; the negative margin keeps its text aligned with the rest. */
function voiceFieldClass(voice: VoiceFill, keys: string[]) {
	const isFilled = keys.some((key) => voice.isHighlighted(key));
	return cn('-mx-2 rounded-md px-2', VOICE_FILL_FIELD_TRANSITION, isFilled && VOICE_FILLED_FIELD);
}

function FieldError({ message }: Readonly<{ message: DottedLanguageObjectStringPaths | undefined }>) {
	const t = useTranslations();
	if (!message) {
		return null;
	}
	return (
		<p role="alert" className={FIELD_ERROR}>
			{t(message)}
		</p>
	);
}

function submitErrorKeyOf(
	submitError: ReturnType<typeof useProjectComposer>['submitError']
): DottedLanguageObjectStringPaths | null {
	if (submitError === 'upload') {
		return 'pages.projects.modals.errors.upload';
	}
	if (submitError === 'save') {
		return 'pages.projects.modals.errors.save';
	}
	return null;
}

interface ProjectComposerProps {
	mode: ProjectComposerMode;
	project?: TOrganizationProject | null;
	context?: ReactNode;
	onClose: () => void;
}

export function ProjectComposer({ mode, project, context, onClose }: Readonly<ProjectComposerProps>) {
	const t = useTranslations();
	const focusOnMount = useFocusOnMount<HTMLInputElement>();
	const router = useRouter();
	const mentions = useTeamMentionCandidates();
	const { taskStatuses } = useTaskStatusesQuery();
	const isEdit = mode === 'edit';

	const handleDone = useCallback(
		(savedProject: TOrganizationProject) => {
			onClose();
			if (isEdit) {
				toast.success(t('pages.projects.modals.saved', { name: savedProject.name ?? '' }));
				return;
			}
			toastMoment(t('pages.projects.modals.created', { name: savedProject.name ?? '' }), <FolderOpen />, {
				action: {
					label: t('pages.projects.modals.openProject'),
					onClick: () => router.push(`/projects/${savedProject.id}`)
				}
			});
		},
		[isEdit, onClose, router, t]
	);

	const composer = useProjectComposer({ mode, project, onDone: handleDone });
	const { draft, errors } = composer;
	const showVoiceError = useVoiceFillErrorToast();
	const { voice, fieldLabels: voiceFieldLabels, hint: voiceHint } = useProjectVoiceFill(composer, showVoiceError);
	const submitErrorKey = submitErrorKeyOf(composer.submitError);

	let title = t('modals.project.createTitle');
	let submitLabel = t('pages.projects.list.CREATE_PROJECT');
	if (isEdit) {
		title = t('modals.project.editTitle');
		submitLabel = t('common.SAVE_CHANGES');
	}

	const submit = () => {
		void composer.submit();
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		submit();
	};

	const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
		if (!isSubmitShortcut(event)) {
			return;
		}
		event.preventDefault();
		submit();
	};

	const keepPlainEnterInField = (event: KeyboardEvent<HTMLInputElement>) => {
		const isPlainEnter = event.key === 'Enter' && !isSubmitShortcut(event);
		if (isPlainEnter) {
			event.preventDefault();
		}
	};

	const handleDescriptionChange = (html: string, stats: RichEditorStats) => {
		composer.setDescription(html);
		composer.setIsDescriptionValid(stats.words <= DESCRIPTION_WORD_LIMIT);
	};

	return (
		<form noValidate onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex min-h-0 flex-1 flex-col">
			<ProjectDialogHeader title={title} context={context} onClose={onClose} />

			<div className={cn(PROJECT_DIALOG_BODY, 'pb-5')}>
				<div className="flex items-start gap-3 pt-1">
					<ProjectTilePicker
						name={draft.name}
						color={draft.color}
						imageUrl={composer.tileImageUrl}
						onColorChange={composer.setColor}
						onImagePick={composer.pickImage}
						onImageRemove={composer.removeImage}
					/>
					<div
						className={cn(
							'flex min-h-11 min-w-0 flex-1 items-center gap-1',
							voiceFieldClass(voice, ['name'])
						)}
					>
						<input
							id="project_title"
							ref={focusOnMount}
							data-initial-focus=""
							value={draft.name}
							onChange={(event) => composer.setName(event.target.value)}
							onKeyDown={keepPlainEnterInField}
							maxLength={PROJECT_NAME_MAX_LENGTH}
							placeholder={t('modals.project.namePlaceholder')}
							aria-label={t('pages.projects.basicInformationForm.formFields.title')}
							aria-invalid={Boolean(errors.name)}
							className={NAME_FIELD}
						/>
						<VoiceFillTrigger voice={voice} disabled={composer.isSubmitting} />
					</div>
				</div>
				<VoiceFillPanel voice={voice} hint={voiceHint} fieldLabels={voiceFieldLabels} className="mt-2" />
				<div className="flex flex-col gap-1 pt-1.5">
					<FieldError message={errors.image} />
					<FieldError message={errors.name} />
				</div>

				<div className={cn('mt-2', voiceFieldClass(voice, ['description']))}>
					<LazyRichEditor
						value={draft.description}
						onChange={handleDescriptionChange}
						chrome="bare"
						toolbar={false}
						placeholder={t('pages.projects.modals.descriptionPlaceholder')}
						ai={{ context: 'project', title: draft.name }}
						mentions={mentions}
						onModEnter={submit}
						aria-label={t('common.DESCRIPTION')}
						contentClassName={DESCRIPTION_FIELD}
					/>
					<FieldError message={errors.description} />
				</div>

				<section
					aria-label={t('pages.projects.detail.PROPERTIES')}
					className="mt-4 hairline-t border-border pt-2"
				>
					<PropertyRow
						icon={<CircleCheck />}
						label={t('common.STATUS')}
						className={voiceFieldClass(voice, ['status'])}
					>
						<ProjectStatusPicker
							status={draft.status}
							statuses={taskStatuses}
							onChange={composer.setStatus}
						/>
					</PropertyRow>
					<PropertyRow
						icon={<Calendar />}
						label={t('pages.projects.list.COLUMN_DATES')}
						className={voiceFieldClass(voice, ['startDate', 'endDate'])}
					>
						<ProjectDateRange
							startDate={draft.startDate}
							endDate={draft.endDate}
							onStartChange={composer.setStartDate}
							onEndChange={composer.setEndDate}
						/>
						<FieldError message={errors.dates} />
					</PropertyRow>
					<PropertyRow
						icon={<UsersGroup />}
						label={t('common.TEAMS')}
						className={voiceFieldClass(voice, ['teams'])}
					>
						<ProjectTeamsPicker
							teams={composer.teams}
							selectedTeamIds={draft.teamIds}
							canDeselect={composer.canDeselectTeam}
							onToggle={composer.toggleTeam}
						/>
						<FieldError message={errors.teams} />
					</PropertyRow>
					<PropertyRow
						icon={<UserCheck />}
						label={t('common.MANAGERS')}
						className={voiceFieldClass(voice, ['managers'])}
					>
						<ProjectPeoplePicker
							people={composer.people}
							selectedIds={draft.managerIds}
							addLabel={t('pages.projects.modals.people.addManagers')}
							searchPlaceholder={t('pages.projects.modals.people.search')}
							onToggle={(employeeId) => composer.togglePerson(employeeId, 'manager')}
						/>
					</PropertyRow>
					<PropertyRow
						icon={<Users />}
						label={t('common.MEMBERS')}
						className={voiceFieldClass(voice, ['members'])}
					>
						<ProjectPeoplePicker
							people={composer.people}
							selectedIds={draft.memberIds}
							addLabel={t('pages.projects.modals.people.addMembers')}
							searchPlaceholder={t('pages.projects.modals.people.search')}
							onToggle={(employeeId) => composer.togglePerson(employeeId, 'member')}
						/>
					</PropertyRow>
					<PropertyRow
						icon={<Wallet />}
						label={t('pages.projects.list.COLUMN_BUDGET')}
						className={voiceFieldClass(voice, ['budgetType', 'budget', 'currency', 'billing'])}
					>
						<ProjectBudgetField
							budget={draft.budget}
							budgetType={draft.budgetType}
							currency={draft.currency}
							billing={draft.billing}
							onBudgetChange={composer.setBudget}
							onBudgetTypeChange={composer.setBudgetType}
							onCurrencyChange={composer.setCurrency}
							onBillingChange={composer.setBilling}
						/>
					</PropertyRow>
					<ProjectBillableRow billable={draft.billable} onChange={composer.setBillable} />
					<PropertyRow
						icon={<Tag />}
						label={t('pages.projects.categorizationForm.formFields.tags')}
						className={voiceFieldClass(voice, ['tags'])}
					>
						<ProjectTagsPicker
							tags={composer.tags}
							selectedTagIds={draft.tagIds}
							isCreating={composer.createTagLoading}
							onToggle={composer.toggleTag}
							onCreate={composer.addTag}
						/>
					</PropertyRow>
					<PropertyRow
						icon={<Globe />}
						label={t('pages.projects.basicInformationForm.formFields.websiteUrl')}
						className={voiceFieldClass(voice, ['projectUrl'])}
					>
						<input
							type="url"
							inputMode="url"
							value={draft.projectUrl}
							onChange={(event) => composer.setProjectUrl(event.target.value)}
							onKeyDown={keepPlainEnterInField}
							placeholder={t('pages.projects.basicInformationForm.formFields.websiteUrlPlaceholder')}
							aria-label={t('pages.projects.basicInformationForm.formFields.websiteUrl')}
							aria-invalid={Boolean(errors.projectUrl)}
							className={INLINE_FIELD}
						/>
						<FieldError message={errors.projectUrl} />
					</PropertyRow>
					<PropertyRow icon={<Key />} label={t('pages.projects.basicInformationForm.formFields.taskKey')}>
						<input
							type="text"
							value={draft.taskKey}
							onChange={(event) => composer.setTaskKey(event.target.value)}
							onKeyDown={keepPlainEnterInField}
							maxLength={10}
							autoCapitalize="characters"
							spellCheck={false}
							placeholder={proposedTaskKey(draft.name) || 'WEB'}
							title={t('pages.projects.basicInformationForm.formFields.taskKeyHelp', {
								example: `${draft.taskKey.trim() || proposedTaskKey(draft.name) || 'WEB'}-42`
							})}
							aria-label={t('pages.projects.basicInformationForm.formFields.taskKey')}
							aria-invalid={Boolean(errors.taskKey)}
							className={INLINE_FIELD}
						/>
						<FieldError message={errors.taskKey} />
					</PropertyRow>
				</section>
			</div>

			<div className={PROJECT_DIALOG_FOOTER}>
				{submitErrorKey && (
					<p role="alert" className="mr-auto text-xs text-destructive-ink">
						{t(submitErrorKey)}
					</p>
				)}
				{!submitErrorKey && (
					<span className="mr-auto">
						<ProjectDialogShortcut keys={['⌘', '↵']} label={submitLabel} />
					</span>
				)}
				<Button type="button" variant="ghost" size="default" onClick={onClose} disabled={composer.isSubmitting}>
					{t('common.CANCEL')}
				</Button>
				<Button type="submit" size="default" loading={composer.isSubmitting} disabled={composer.isSubmitting}>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
}
