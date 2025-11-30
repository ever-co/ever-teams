import { Modal, Text } from '@/core/components';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { organizationProjectsState } from '@/core/stores';
import { Calendar, ExternalLink, Users, Banknote, Tag, Building2, Archive, CircleDot } from 'lucide-react';
import moment from 'moment';
import Image from 'next/image';
import { cn } from '@/core/lib/helpers';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';

interface IViewProjectInfoModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}

/**
 * A comprehensive modal to view all project information (read-only)
 */
export function ViewProjectInfoModal(props: Readonly<IViewProjectInfoModalProps>) {
	const t = useTranslations();
	const { open, closeModal, projectId } = props;
	const organizationProjects = useAtomValue(organizationProjectsState);

	const project = useMemo(
		() => organizationProjects.find((p) => p.id === projectId),
		[organizationProjects, projectId]
	);

	const managers = useMemo(() => project?.members?.filter((el) => el.isManager) || [], [project?.members]);

	const members = useMemo(() => project?.members?.filter((el) => !el.isManager) || [], [project?.members]);

	const teams = useMemo(() => project?.teams || [], [project?.teams]);
	const tags = useMemo(() => project?.tags || [], [project?.tags]);

	if (!project) {
		return null;
	}

	// Use existing locale keys for billing types
	const billingLabels: Record<EProjectBilling, string> = {
		[EProjectBilling.RATE]: t('common.RATE'),
		[EProjectBilling.FLAT_FEE]: t('common.FLAT_FEE'),
		[EProjectBilling.MILESTONES]: t('common.MILESTONES')
	};

	// Use existing locale keys for budget types
	const budgetTypeLabels: Record<EProjectBudgetType, string> = {
		[EProjectBudgetType.HOURS]: t('common.HOURS_BASED'),
		[EProjectBudgetType.COST]: t('common.COST_BASED')
	};

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			className="sm:w-3xl min-w-88 min-h-96 bg-light--theme-light dark:bg-dark--theme-light rounded-2xl px-3 py-6 md:px-6 shadow-lg card dark:shadow-none h-[800px]"
			alignCloseIcon
		>
			<ScrollArea className="min-h-96">
				<div className="flex flex-col gap-6 py-4 h-[750px]">
					{/* ===== HEADER ===== */}
					<div className="flex gap-5 items-start pb-4 border-b dark:border-gray-700">
						{/* Project Image */}
						<div
							className={cn(
								'w-20 h-20 shrink-0 overflow-hidden flex items-center justify-center text-2xl font-bold uppercase rounded-xl shadow-sm',
								!project.imageUrl && 'bg-linear-to-br from-primary/20 to-primary/5 text-primary'
							)}
						>
							{project.imageUrl ? (
								<Image
									src={project.imageUrl}
									alt={project.name || ''}
									width={80}
									height={80}
									className="object-cover w-full h-full"
								/>
							) : (
								project.name?.substring(0, 2)
							)}
						</div>

						{/* Project Title & Status */}
						<div className="flex flex-col flex-1 gap-2 min-w-0">
							<div className="flex flex-col gap-3 items-start max-w-full">
								<Text.Heading
									as="h2"
									className="items-start max-w-full text-xl font-semibold truncate text-wrap"
								>
									{project.name}
								</Text.Heading>
								<StatusBadge isArchived={project.isArchived} isActive={project.isActive} />
							</div>

							{/* Quick Info Row */}
							<div className="flex flex-wrap gap-4 items-center text-sm text-gray-500 dark:text-gray-400">
								{project.code && (
									<span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
										{project.code}
									</span>
								)}
								{project.status && (
									<span className="flex gap-1 items-center">
										<CircleDot size={12} />
										{project.status}
									</span>
								)}
								{project.membersCount !== undefined && project.membersCount > 0 && (
									<span className="flex gap-1 items-center">
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
									className="flex gap-1 items-center text-sm text-primary hover:underline w-fit"
								>
									<ExternalLink size={14} />
									{project.projectUrl.length > 50
										? `${project.projectUrl.substring(0, 50)}...`
										: project.projectUrl}
								</a>
							)}
						</div>
					</div>

					{/* ===== DATES SECTION ===== */}
					<Section title={t('common.DATE')} icon={<Calendar size={16} />}>
						<div className="flex flex-wrap gap-8">
							<InfoItem
								label={t('common.START_DATE')}
								value={project.startDate ? moment(project.startDate).format('MMM DD, YYYY') : '-'}
							/>
							<VerticalSeparator />
							<InfoItem
								label={t('common.END_DATE')}
								value={project.endDate ? moment(project.endDate).format('MMM DD, YYYY') : '-'}
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
							<div className="p-3 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg dark:bg-dark--theme dark:text-gray-300">
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
								{project.budget !== undefined && (
									<>
										<VerticalSeparator />
										<InfoItem
											label={t('pages.projects.financialSettingsForm.formFields.budgetAmount')}
											value={new Intl.NumberFormat('en-US', {
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

					<div className="flex flex-wrap gap-6 items-start w-full">
						{/* ===== TAGS & COLOR ===== */}
						{(tags.length > 0 || project.color) && (
							<Section
								title={t('pages.projects.addOrEditModal.steps.categorization')}
								icon={<Tag size={16} />}
							>
								<div className="flex flex-col gap-8 items-start">
									{tags.length > 0 && (
										<div className="flex flex-col gap-2">
											<span className="text-xs font-medium text-gray-500">
												{t('pages.projects.categorizationForm.formFields.tags')}
											</span>
											<div className="flex flex-wrap gap-2">
												{tags.map((tag) => (
													<span
														key={tag.id || tag.name}
														className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full border"
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
											<div className="flex gap-2 items-center">
												<span
													className="w-6 h-6 rounded-md border shadow-sm"
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
												<div className="flex justify-center items-center w-5 h-5 text-xs font-medium rounded-full bg-primary/20 text-primary">
													{team.name?.charAt(0)}
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
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											{managers.map((member) => (
												<MemberCard key={member.id} member={member} isManager />
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
										<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
											{members.map((member) => (
												<MemberCard key={member.id} member={member} />
											))}
										</div>
									</div>
								)}
							</div>
						</Section>
					)}
				</div>
				<ScrollBar />
			</ScrollArea>
		</Modal>
	);
}

/* ===== HELPER COMPONENTS ===== */

function Section({
	title,
	icon,
	children
}: Readonly<{
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col gap-3">
			<h3 className="flex gap-2 items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
				{icon}
				{title}
			</h3>
			{children}
		</div>
	);
}

function InfoItem({
	label,
	value
}: Readonly<{
	label: string;
	value: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col gap-1 min-w-24">
			<span className="text-xs text-gray-500">{label}</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);
}

function StatusBadge({ isArchived, isActive }: Readonly<{ isArchived?: boolean; isActive?: boolean }>) {
	const t = useTranslations();
	if (isArchived) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
				<Archive size={10} />
				{t('timer.ARCHIVED')}
			</span>
		);
	}
	if (isActive) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
				<span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
				{t('timer.ACTIVE')}
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
			{t('timer.INACTIVE')}
		</span>
	);
}

function MemberCard({
	member,
	isManager = false
}: Readonly<{
	member: {
		id?: string;
		employee?: {
			fullName?: string;
			user?: { imageUrl?: string; email?: string };
		};
	};
	isManager?: boolean;
}>) {
	const t = useTranslations();
	const name = member.employee?.fullName || t('common.UNKNOWN');
	const imageUrl = member.employee?.user?.imageUrl;
	const email = member.employee?.user?.email;

	return (
		<div className="flex gap-3 items-center p-2 bg-gray-50 rounded-lg border dark:bg-gray-800/50 dark:border-gray-700">
			<div
				className={cn(
					'w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium shrink-0',
					!imageUrl && 'bg-primary/10 text-primary'
				)}
			>
				{imageUrl ? (
					<Image src={imageUrl} alt={name} width={40} height={40} className="object-cover w-full h-full" />
				) : (
					name.substring(0, 2).toUpperCase()
				)}
			</div>
			<div className="flex flex-col min-w-0">
				<span className="text-sm font-medium truncate">{name}</span>
				{email && <span className="text-xs text-gray-500 truncate">{email}</span>}
			</div>
			{isManager && (
				<span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
					{t('common.MANAGER')}
				</span>
			)}
		</div>
	);
}
