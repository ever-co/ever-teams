import { useModal, useUpdateTask } from '@/core/hooks';
import { activeTeamState, isTeamManagerState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ERoleName } from '@/core/types/generics/enums/role';
import { Plus, Trash } from '@/core/components/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { clsxm } from '@/core/lib/utils';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isValidProjectForDisplay, projectBelongsToTeam, projectHasNoTeams } from '@/core/lib/helpers/type-guards';
import Image from 'next/image';
import { QuickCreateProjectModal } from '@/core/components/features/projects/quick-create-project-modal';
import { TOrganizationProject } from '@/core/types/schemas';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { cn } from '@/core/lib/helpers';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	TaskPropertyMenu,
	TaskPropertyMenuAction,
	TaskPropertyMenuOption
} from '@/core/components/tasks/task-property-menu';
import {
	TASK_PROPERTY_PILL_RECIPE,
	TaskPropertyPill,
	TaskPropertyTriggerEnd
} from '@/core/components/tasks/task-property-trigger';

interface ITaskProjectDropdownProps {
	task?: TTask;
	controlled?: boolean;
	onChange?: (project: TOrganizationProject) => void;
	styles?: {
		container?: string; // The dropdown element
		value?: string;
		listCard?: string; // The listbox
	};
}

/**
 * TaskProject dropdown
 *
 * @param {Object} props - The props object
 * @param {TTask} props.task - The TTask object which
 * @param {boolean} props.controlled - If [true], changes are managed by external handlers (i.e :props.onChange)
 * @param {(project: 	IOrganizationProject) => void} props.onChange - The function called when user selects a value (external handler)
 *
 * @returns {JSX.Element} - The Dropdown element
 */
export function ProjectDropDown(props: ITaskProjectDropdownProps) {
	const { task, controlled = false, onChange, styles } = props;
	const { openModal, isOpen, closeModal } = useModal();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const { updateTask, updateLoading } = useUpdateTask();
	const t = useTranslations();

	// Get current user and manager status
	const { data: user } = useUserQuery();
	const isTeamManager = useAtomValue(isTeamManagerState);

	// Check if user can create projects (admin or manager)
	const canCreateProject = useMemo(() => {
		// Check if user has global admin role
		const userRole = user?.role?.name;
		const isGlobalAdmin = userRole === ERoleName.ADMIN || userRole === ERoleName.SUPER_ADMIN;

		// User can create project if they are a global admin or team manager
		return isGlobalAdmin || isTeamManager;
	}, [user?.role?.name, isTeamManager]);

	// Filter valid projects based on active team context:
	// - "All Teams" mode (no active team): show ALL projects
	// - Specific team: show team projects + global projects (no team assigned)
	const validProjects = useMemo(() => {
		return organizationProjects.filter((project) => {
			// First check if it's a valid project
			if (!isValidProjectForDisplay(project)) return false;
			// "All Teams" selected (no active team) → show ALL projects (team-specific + global)
			if (!activeTeam?.id) return true;
			// Show projects that either:
			// 1. Belong to the active team
			// 2. Have no teams assigned ("Global" projects - accessible to everyone)
			const belongsToTeam = projectBelongsToTeam(project, activeTeam.id);
			const isGlobalProject = projectHasNoTeams(project);
			return belongsToTeam || isGlobalProject;
		});
	}, [organizationProjects, activeTeam?.id]);

	const [selected, setSelected] = useState<TOrganizationProject | null>(null);

	const projectMatch = useMemo(() => {
		return validProjects.find((project) => project.id === task?.projectId);
	}, [validProjects, task?.projectId]);

	// Additional sync for controlled mode
	useEffect(() => {
		setSelected(projectMatch || null);
	}, [controlled, validProjects, task, task?.projectId]);

	const showProjectSaveError = useCallback(
		(error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.tasks.PROJECT_UPDATE_FAILED'), { description: t(reasonKey) });
		},
		[t]
	);

	// Update the project
	const handleUpdateProject = useCallback(
		async (project: TOrganizationProject) => {
			try {
				if (task) {
					if (task?.projectId === project.id) return;
					await updateTask({ ...task, projectId: project.id });
					// Update local selected state immediately for optimistic UI
					setSelected(project);
				}
			} catch (error) {
				console.error(error);
				showProjectSaveError(error);
			}
		},
		[task, updateTask, showProjectSaveError]
	);

	// Remove the project
	const handleRemoveProject = useCallback(async () => {
		try {
			if (task) {
				if (!task?.projectId) return;
				await updateTask({ ...task, projectId: null });
				setSelected(null);
			}
		} catch (error) {
			console.error(error);
			showProjectSaveError(error);
		}
	}, [task, updateTask, showProjectSaveError]);

	const handleProjectSelect = useCallback(
		(project: TOrganizationProject) => {
			setSelected(project);
			if (controlled && onChange) {
				onChange(project);
			} else {
				handleUpdateProject(project);
			}
		},
		[controlled, onChange, handleUpdateProject]
	);

	const isProjectSelected = useCallback(
		(project: TOrganizationProject) => selected?.id === project.id,
		[selected?.id]
	);

	const sharedGroupLabel = t('taskMenus.projectGroups.shared');
	const projectOptions = useMemo(
		() => projectMenuOptions(validProjects, activeTeam, sharedGroupLabel),
		[validProjects, activeTeam, sharedGroupLabel]
	);

	const triggerLabel = projectTriggerLabel(t, selected);
	const canRemoveProject = !controlled;
	const hasFooter = canRemoveProject || canCreateProject;

	return (
		<>
			<div className={clsxm('relative text-xs font-medium w-fit h-fit max-w-32 min-w-24', styles?.container)}>
				<TaskPropertyMenu
					options={projectOptions}
					isSelected={isProjectSelected}
					onSelect={handleProjectSelect}
					searchPlaceholder={t('taskMenus.search.project')}
					triggerLabel={triggerLabel}
					triggerClassName={clsxm('flex w-full max-w-full', projectTriggerRadius(selected), styles?.value)}
					align="end"
					footer={
						hasFooter && (
							<>
								{canRemoveProject && (
									<TaskPropertyMenuAction icon={<Trash />} onClick={handleRemoveProject}>
										{t('common.REMOVE')}
									</TaskPropertyMenuAction>
								)}
								{canCreateProject && (
									<TaskPropertyMenuAction icon={<Plus />} onClick={openModal}>
										{t('common.CREATE_NEW')}
									</TaskPropertyMenuAction>
								)}
							</>
						)
					}
				>
					<ProjectTriggerContent
						project={selected}
						emptyLabel={t('pages.projects.projectTitle.SINGULAR')}
						isLoading={updateLoading}
					/>
				</TaskPropertyMenu>
			</div>
			<QuickCreateProjectModal
				onSuccess={(project) => {
					setSelected(project);
					onChange?.(project);
					if (!controlled) {
						handleUpdateProject(project);
					}
				}}
				open={isOpen}
				closeModal={closeModal}
			/>
		</>
	);
}

function projectGroupName(
	project: TOrganizationProject,
	activeTeam: TOrganizationTeam | null,
	sharedGroupLabel: string
): string | undefined {
	if (!activeTeam?.id) {
		return undefined;
	}
	const belongsToTeam = projectBelongsToTeam(project, activeTeam.id);
	if (belongsToTeam) {
		return activeTeam.name;
	}
	return sharedGroupLabel;
}

function projectMenuOptions(
	projects: TOrganizationProject[],
	activeTeam: TOrganizationTeam | null,
	sharedGroupLabel: string
): TaskPropertyMenuOption<TOrganizationProject>[] {
	const options = projects.map((project) => ({
		key: project.id,
		value: project,
		label: project.name || '',
		icon: <ProjectGlyph project={project} />,
		group: projectGroupName(project, activeTeam, sharedGroupLabel)
	}));
	const teamOptions = options.filter((option) => option.group !== sharedGroupLabel);
	const sharedOptions = options.filter((option) => option.group === sharedGroupLabel);
	return [...teamOptions, ...sharedOptions];
}

function projectTriggerLabel(t: ReturnType<typeof useTranslations>, project: TOrganizationProject | null) {
	if (!project) {
		return t('taskMenus.projectTrigger.empty');
	}
	return t('taskMenus.projectTrigger.current', { name: project.name || '' });
}

function projectTriggerRadius(project: TOrganizationProject | null) {
	const isPainted = isPaintableColor(project?.color);
	if (isPainted) {
		return 'rounded-md';
	}
	return 'rounded-full';
}

function projectChipStyle(project: TOrganizationProject) {
	if (!isPaintableColor(project.color)) {
		return undefined;
	}
	return dataColorChipStyle(project.color);
}

function ProjectGlyph({ project, className }: Readonly<{ project: TOrganizationProject; className?: string }>) {
	if (project.imageUrl) {
		return (
			<Image
				className={cn('size-4 shrink-0 rounded-full object-cover', className)}
				src={project.imageUrl}
				alt=""
				width={16}
				height={16}
			/>
		);
	}
	return <TaskPropertyIcon kind="project" color={project.color} className={className} />;
}

function ProjectTriggerContent({
	project,
	emptyLabel,
	isLoading
}: Readonly<{
	project: TOrganizationProject | null;
	emptyLabel: string;
	isLoading: boolean;
}>) {
	if (!project) {
		return <TaskPropertyPill kind="project" label={emptyLabel} isLoading={isLoading} className="w-full" />;
	}
	const isPainted = isPaintableColor(project.color);
	return (
		<span
			style={projectChipStyle(project)}
			className={cn(
				'inline-flex h-7 w-full min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium',
				isPainted && 'chip-3d',
				!isPainted && TASK_PROPERTY_PILL_RECIPE,
				!isPainted && 'text-xs font-medium text-foreground'
			)}
		>
			<ProjectGlyph project={project} className="size-3.5" />
			<span className="min-w-0 flex-1 truncate text-left">{project.name}</span>
			<TaskPropertyTriggerEnd isLoading={isLoading} />
		</span>
	);
}
