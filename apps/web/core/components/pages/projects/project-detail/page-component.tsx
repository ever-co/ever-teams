'use client';

import { Menu, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import {
	Archive,
	ArrowLeftIcon,
	Banknote,
	Building2,
	Calendar,
	CircleDot,
	ExternalLink,
	MoreVertical,
	Pencil,
	RotateCcw,
	ShieldAlert,
	Tag,
	Trash,
	Users
} from 'lucide-react';
import moment from 'moment';
import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { Container } from '@/core/components';
import { ProjectDetailSkeleton } from '@/core/components/common/skeleton/projects';
import { Button } from '@/core/components/duplicated-components/_button';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { HorizontalSeparator, VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { cn } from '@/core/lib/helpers';
import { projectBelongsToTeam, projectHasNoTeams } from '@/core/lib/helpers/type-guards';
import { queryKeys } from '@/core/query/keys';
import { organizationProjectService } from '@/core/services/client/api/organizations';
import { isTrackingEnabledState } from '@/core/stores';
import { fullWidthState } from '@/core/stores/common/full-width';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';
import { InfoItem, MemberCard, Section, StatusBadge } from './components';
import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';

export default function ProjectDetailPageComponent() {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const params = useParams<{ id: string; locale: string }>();
	const projectId = params?.id;
	const currentLocale = params?.locale;

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const activeTeam = useCurrentTeam();
	const fullWidth = useAtomValue(fullWidthState);

	// Fetch project by ID
	const {
		data: project,
		isLoading,
		isError,
		error
	} = useQuery({
		queryKey: [queryKeys.organizationProjects.all, projectId],
		queryFn: () =>
			projectId
				? organizationProjectService.getOrganizationProject(projectId)
				: Promise.reject(new Error('Project ID is required')),
		enabled: !!projectId,
		retry: 1,
		staleTime: 1000 * 60 * 5 // 5 minutes
	});

	const handleBack = useCallback(() => router.back(), [router]);

	const breadcrumbPath = useMemo(
		() => [
			{
				title: (() => {
					try {
						return JSON.parse(t('pages.home.BREADCRUMB'));
					} catch {
						return t('pages.home.BREADCRUMB');
					}
				})(),
				href: '/'
			},
			{ title: activeTeam?.name || '', href: '/' },
			{ title: t('pages.projects.projectTitle.PLURAL'), href: `/${currentLocale}/projects` },
			{ title: project?.name || t('common.LOADING'), href: '#' }
		],
		[currentLocale, t, activeTeam?.name, project?.name]
	);

	// Memoized data
	const managers = useMemo(() => project?.members?.filter((el) => el.isManager) || [], [project?.members]);
	const members = useMemo(() => project?.members?.filter((el) => !el.isManager) || [], [project?.members]);
	const teams = useMemo(() => project?.teams || [], [project?.teams]);
	const tags = useMemo(() => project?.tags || [], [project?.tags]);

	// Check if project is accessible:
	// - "All Teams" mode (no active team): allow access to ALL projects
	// - Specific team: allow access to team projects + global projects
	const projectBelongsToActiveTeam = useMemo(() => {
		if (!project) return false;
		// "All Teams" selected (no active team) → allow access to ALL projects
		if (!activeTeam?.id) return true;
		// Global projects (no teams assigned) are accessible to everyone
		if (projectHasNoTeams(project)) return true;
		// Check if project belongs to the active team
		return projectBelongsToTeam(project, activeTeam.id);
	}, [project, activeTeam?.id]);

	// Billing labels
	const billingLabels: Record<EProjectBilling, string> = useMemo(
		() => ({
			[EProjectBilling.RATE]: t('common.RATE'),
			[EProjectBilling.FLAT_FEE]: t('common.FLAT_FEE'),
			[EProjectBilling.MILESTONES]: t('common.MILESTONES')
		}),
		[t]
	);

	// Budget type labels
	const budgetTypeLabels: Record<EProjectBudgetType, string> = useMemo(
		() => ({
			[EProjectBudgetType.HOURS]: t('common.HOURS_BASED'),
			[EProjectBudgetType.COST]: t('common.COST_BASED')
		}),
		[t]
	);

	// Error state
	if (isError) {
		const errorMessage = error instanceof Error ? error.message : t('pages.error.HEADING_TITLE');

		return (
			<MainLayout showTimer={isTrackingEnabled} className="p-0! pb-1 overflow-hidden! w-full">
				<Container fullWidth={fullWidth} className="flex flex-col items-center justify-center h-full gap-4 p-8">
					<div className="text-center">
						<h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
							{t('manualTime.reasons.ERROR')}
						</h2>
						<p className="mb-4 text-gray-500 dark:text-gray-400">{errorMessage}</p>
						<Button onClick={handleBack} variant="outline">
							<ArrowLeftIcon className="w-4 h-4 mr-2" />
						</Button>
					</div>
				</Container>
			</MainLayout>
		);
	}

	// Access denied - Project doesn't belong to active team
	if (project && !projectBelongsToActiveTeam) {
		return (
			<MainLayout showTimer={isTrackingEnabled} className="p-0! pb-1 overflow-hidden! w-full">
				<Container fullWidth={fullWidth} className="flex flex-col items-center justify-center h-full gap-4 p-8">
					<div className="text-center">
						<div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
							<ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
						</div>
						<h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
							{t('pages.projects.accessDenied.title')}
						</h2>
						<p className="max-w-md mb-6 text-gray-500 dark:text-gray-400">
							{t('pages.projects.accessDenied.description', { teamName: activeTeam?.name || '' })}
						</p>
						<div className="flex items-center justify-center gap-3">
							<Button onClick={handleBack} variant="outline">
								<ArrowLeftIcon className="w-4 h-4 mr-2" />
								{t('common.BACK')}
							</Button>
							<Button onClick={() => router.push(`/${currentLocale}/projects`)} variant="default">
								{t('pages.projects.accessDenied.viewAllProjects')}
							</Button>
						</div>
					</div>
				</Container>
			</MainLayout>
		);
	}

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="p-0! pb-1 overflow-hidden! w-full"
			childrenClassName="w-full h-full overflow-y-auto"
			mainHeaderSlot={
				<Container fullWidth={fullWidth} className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex items-center w-full">
						<button
							onClick={handleBack}
							className="p-1 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
						>
							<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
						</button>
						<Breadcrumb paths={breadcrumbPath} className="text-sm" />
					</div>
				</Container>
			}
		>
			{isLoading ? (
				<ProjectDetailSkeleton />
			) : project ? (
				<ProjectDetailContent
					project={project}
					managers={managers}
					members={members}
					teams={teams}
					tags={tags}
					billingLabels={billingLabels}
					budgetTypeLabels={budgetTypeLabels}
					locale={locale}
					t={t}
					fullWidth={fullWidth}
				/>
			) : null}
		</MainLayout>
	);
}

// Separate component for the detail content to keep the main component clean
interface ProjectDetailContentProps {
	project: NonNullable<
		ReturnType<typeof organizationProjectService.getOrganizationProject> extends Promise<infer T> ? T : never
	>;
	managers: Array<{
		id?: string;
		isManager?: boolean;
		employee?: { fullName?: string; user?: { imageUrl?: string; email?: string } };
	}>;
	members: Array<{
		id?: string;
		isManager?: boolean;
		employee?: { fullName?: string; user?: { imageUrl?: string; email?: string } };
	}>;
	teams: Array<{ id: string; name?: string; image?: { thumbUrl?: string } }>;
	tags: Array<{ id?: string; name?: string; color?: string }>;
	billingLabels: Record<EProjectBilling, string>;
	budgetTypeLabels: Record<EProjectBudgetType, string>;
	locale: string;
	t: ReturnType<typeof useTranslations>;
	fullWidth: boolean;
}

function ProjectDetailContent({
	project,
	managers,
	members,
	teams,
	tags,
	billingLabels,
	budgetTypeLabels,
	locale,
	t,
	fullWidth
}: ProjectDetailContentProps) {
	const { openEditModal, openArchiveModal, openDeleteModal, openRestoreModal } = useProjectActionModal();
	const { canEdit, canArchive, canDelete, hasAnyPermission } = useProjectPermissions({ members: project.members });

	const isArchived = project.isArchived;
	const showSeparator = canDelete && (canEdit || canArchive);

	return (
		<Container fullWidth={fullWidth} className="p-4 md:p-6 lg:p-8">
			<div className="flex flex-col max-w-5xl gap-8 mx-auto">
				{/* ===== HERO SECTION ===== */}
				<div className="flex flex-col items-start gap-6 p-6 bg-white border shadow-sm md:flex-row dark:bg-dark--theme-light rounded-xl dark:border-gray-800">
					{/* Project Image */}
					<div
						className={cn(
							'w-24 h-24 md:w-32 md:h-32 shrink-0 overflow-hidden flex items-center justify-center text-3xl font-bold uppercase rounded-xl shadow-sm',
							!project.imageUrl && 'bg-linear-to-br from-primary/20 to-primary/5 text-primary'
						)}
						style={project.color ? { backgroundColor: `${project.color}20` } : undefined}
					>
						{project.imageUrl ? (
							<Image
								src={project.imageUrl}
								alt={project.name || ''}
								width={128}
								height={128}
								className="object-cover w-full h-full"
							/>
						) : (
							<span style={project.color ? { color: project.color } : undefined}>
								{project.name?.substring(0, 2) || '??'}
							</span>
						)}
					</div>

					{/* Project Info */}
					<div className="flex flex-col flex-1 min-w-0 gap-3">
						<div className="flex items-start justify-between gap-4">
							<div className="flex flex-col items-start gap-3">
								<h1 className="text-2xl font-bold text-gray-900 md:text-3xl dark:text-white">
									{project.name}
								</h1>
								<StatusBadge isArchived={project.isArchived} isActive={project.isActive} />
							</div>

							{/* Actions Dropdown - Only for Admins or Project Managers */}
							{(hasAnyPermission || isArchived) && (
								<Menu as="div" className="relative shrink-0">
									<Menu.Button className="flex items-center justify-center w-10 h-10 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
										<MoreVertical size={20} className="text-gray-500" />
									</Menu.Button>
									<Transition
										as="div"
										enter="transition ease-out duration-100"
										enterFrom="transform opacity-0 scale-95"
										enterTo="transform opacity-100 scale-100"
										leave="transition ease-in duration-75"
										leaveFrom="transform opacity-100 scale-100"
										leaveTo="transform opacity-0 scale-95"
									>
										<Menu.Items className="absolute z-[999] right-0 mt-2 w-48 origin-top-right rounded-lg bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none">
											<div className="flex flex-col gap-1 p-2">
												{/* Restore - Only for archived projects */}
												{isArchived && (canEdit || canArchive) && (
													<Menu.Item>
														{({ active }) => (
															<button
																onClick={() => openRestoreModal(project.id)}
																className={cn(
																	'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
																	active && 'bg-primary/10'
																)}
															>
																<RotateCcw size={16} className="text-primary" />
																<span>{t('common.RESTORE')}</span>
															</button>
														)}
													</Menu.Item>
												)}

												{/* Edit - Only for Admins or Project Managers */}
												{canEdit && !isArchived && (
													<Menu.Item>
														{({ active }) => (
															<button
																onClick={() => openEditModal(project.id)}
																className={cn(
																	'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
																	active && 'bg-primary/10'
																)}
															>
																<Pencil size={16} className="text-gray-500" />
																<span>{t('common.EDIT')}</span>
															</button>
														)}
													</Menu.Item>
												)}

												{/* Archive - Only for Admins or Project Managers */}
												{canArchive && !isArchived && (
													<Menu.Item>
														{({ active }) => (
															<button
																onClick={() => openArchiveModal(project.id)}
																className={cn(
																	'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
																	active && 'bg-primary/10'
																)}
															>
																<Archive size={16} className="text-gray-500" />
																<span>{t('common.ARCHIVE')}</span>
															</button>
														)}
													</Menu.Item>
												)}

												{/* Separator before delete */}
												{showSeparator && !isArchived && (
													<HorizontalSeparator className="my-1" />
												)}

												{/* Delete - Only for Admins or Project Managers */}
												{canDelete && (
													<Menu.Item>
														{({ active }) => (
															<button
																onClick={() => openDeleteModal(project.id)}
																className={cn(
																	'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors',
																	active && 'bg-red-50 dark:bg-red-900/20'
																)}
															>
																<Trash size={16} />
																<span>{t('common.DELETE')}</span>
															</button>
														)}
													</Menu.Item>
												)}
											</div>
										</Menu.Items>
									</Transition>
								</Menu>
							)}
						</div>

						{/* Quick Info Row */}
						<div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
							{project.code && (
								<span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
									{project.code}
								</span>
							)}
							{project.status && (
								<span className="flex items-center gap-1">
									<CircleDot size={12} />
									{project.status}
								</span>
							)}
							{(project.membersCount ?? 0) > 0 && (
								<span className="flex items-center gap-1">
									<Users size={12} />
									{project.membersCount} {t('common.MEMBERS').toLowerCase()}
								</span>
							)}
						</div>

						{/* Project URL */}
						{project.projectUrl && (
							<a
								href={project.projectUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 text-sm text-primary hover:underline w-fit"
							>
								<ExternalLink size={14} />
								{project.projectUrl.length > 60
									? `${project.projectUrl.substring(0, 60)}...`
									: project.projectUrl}
							</a>
						)}

						{/* Description preview */}
						{project.description && (
							<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
								{project.description}
							</p>
						)}
					</div>
				</div>

				{/* ===== DATES SECTION ===== */}
				<Section title={t('common.DATE')} icon={<Calendar size={16} />}>
					<div className="flex flex-wrap gap-8">
						<InfoItem
							label={t('common.START_DATE')}
							value={
								project.startDate && new Date(project.startDate).getFullYear() !== 1970
									? moment(project.startDate).format('MMM DD, YYYY')
									: '-'
							}
						/>
						<VerticalSeparator />
						<InfoItem
							label={t('common.END_DATE')}
							value={
								project.endDate && new Date(project.endDate).getFullYear() !== 1970
									? moment(project.endDate).format('MMM DD, YYYY')
									: '-'
							}
						/>
						{project.archivedAt && (
							<>
								<VerticalSeparator />
								<InfoItem
									label={t('common.ARCHIVE_AT')}
									value={moment(project.archivedAt).format('MMM DD, YYYY')}
								/>
							</>
						)}
					</div>
				</Section>

				{/* ===== DESCRIPTION ===== */}
				{project.description && (
					<Section title={t('common.DESCRIPTION')}>
						<div className="p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-dark--theme dark:text-gray-300">
							{project.description}
						</div>
					</Section>
				)}

				{/* ===== FINANCIAL SETTINGS ===== */}
				{(project.budget || project.billing || project.currency) && (
					<Section
						title={t('pages.projects.addOrEditModal.steps.financialSettings')}
						icon={<Banknote size={16} />}
					>
						<div className="flex flex-wrap gap-8">
							{project.budgetType && (
								<InfoItem
									label={t('pages.projects.financialSettingsForm.formFields.budgetType')}
									value={budgetTypeLabels[project.budgetType] || project.budgetType}
								/>
							)}
							{project.budget !== undefined && project.budget !== null && (
								<>
									<VerticalSeparator />
									<InfoItem
										label={t('pages.projects.financialSettingsForm.formFields.budgetAmount')}
										value={new Intl.NumberFormat(locale, {
											style: project.currency ? 'currency' : 'decimal',
											currency: project.currency || undefined
										}).format(project.budget)}
									/>
								</>
							)}
							{project.billing && (
								<>
									<VerticalSeparator />
									<InfoItem
										label={t('pages.projects.financialSettingsForm.formFields.billing')}
										value={billingLabels[project.billing] || project.billing}
									/>
								</>
							)}
							{project.currency && (
								<>
									<VerticalSeparator />
									<InfoItem
										label={t('pages.projects.financialSettingsForm.formFields.currency')}
										value={project.currency}
									/>
								</>
							)}
						</div>
					</Section>
				)}

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{/* ===== TAGS & COLOR ===== */}
					{(tags.length > 0 || project.color) && (
						<Section
							title={t('pages.projects.addOrEditModal.steps.categorization')}
							icon={<Tag size={16} />}
						>
							<div className="flex flex-col gap-4">
								{tags.length > 0 && (
									<div className="flex flex-col gap-2">
										<span className="text-xs font-medium text-gray-500">
											{t('pages.projects.categorizationForm.formFields.tags')}
										</span>
										<div className="flex flex-wrap gap-2">
											{tags.map((tag) => (
												<span
													key={tag.id || tag.name}
													className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full border dark:border-gray-700"
												>
													<span
														className="w-2 h-2 rounded-full"
														style={{ backgroundColor: tag.color || '#6B7280' }}
													/>
													{tag.name}
												</span>
											))}
										</div>
									</div>
								)}
								{project.color && (
									<div className="flex flex-col gap-2">
										<span className="text-xs font-medium text-gray-500">
											{t('pages.projects.categorizationForm.formFields.colorCode')}
										</span>
										<div className="flex items-center gap-2">
											<span
												className="w-6 h-6 border rounded-md shadow-sm"
												style={{ backgroundColor: project.color }}
											/>
											<span className="font-mono text-sm">{project.color}</span>
										</div>
									</div>
								)}
							</div>
						</Section>
					)}

					{/* ===== TEAMS ===== */}
					{teams.length > 0 && (
						<Section title={t('common.TEAMS')} icon={<Building2 size={16} />}>
							<div className="flex flex-wrap gap-2">
								{teams.map((team) => (
									<span
										key={team.id}
										className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800"
									>
										{team.image?.thumbUrl ? (
											<Image
												src={team.image.thumbUrl}
												alt={team.name || ''}
												width={20}
												height={20}
												className="rounded-full"
											/>
										) : (
											<div className="flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-primary/20 text-primary">
												{team.name?.charAt(0) || '?'}
											</div>
										)}
										{team.name}
									</span>
								))}
							</div>
						</Section>
					)}
				</div>

				{/* ===== TEAM MEMBERS ===== */}
				{(managers.length > 0 || members.length > 0) && (
					<Section
						title={t('pages.projects.addOrEditModal.steps.teamAndRelations')}
						icon={<Users size={16} />}
					>
						<div className="flex flex-col gap-6">
							{/* Managers */}
							{managers.length > 0 && (
								<div className="flex flex-col gap-3">
									<span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
										{t('common.MANAGERS')} ({managers.length})
									</span>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{managers.map((member) => (
											<MemberCard key={member.id || Math.random()} member={member} isManager />
										))}
									</div>
								</div>
							)}

							{/* Members */}
							{members.length > 0 && (
								<div className="flex flex-col gap-3">
									<span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
										{t('common.MEMBERS')} ({members.length})
									</span>
									<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{members.map((member) => (
											<MemberCard key={member.id || Math.random()} member={member} />
										))}
									</div>
								</div>
							)}
						</div>
					</Section>
				)}
			</div>
		</Container>
	);
}
