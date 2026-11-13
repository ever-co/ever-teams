'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	Calendar,
	Check,
	CircleCheck,
	Copy,
	ExternalLink,
	Globe,
	Link as LinkIcon,
	Tag,
	UserCheck,
	Users,
	UsersGroup,
	Wallet,
	Briefcase
} from '@/core/components/icons';
import {
	MUTED_VALUE,
	PersonFace,
	ProjectDatesCell,
	ProjectStatusChip,
	ProjectTagChips,
	formatProjectDay,
	teamImageOf,
	useProjectBudget
} from '@/core/components/projects/project-cells';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { useClientNames } from '@/core/hooks/clients/use-client-names';
import { cn } from '@/core/lib/helpers';
import { isBillableByDefault } from '@/core/lib/utils/project-billable';
import {
	clientNameOf,
	contributorsOf,
	managersOf,
	personFromProjectMember,
	realDateOf,
	type ProjectPerson
} from '@/core/lib/utils/project-list';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';

const COPY_FEEDBACK_MS = 1500;

export const PROJECT_SECTION_LABEL = 'text-xs font-medium text-muted-foreground';

export function PropertyRow({
	icon,
	label,
	hint,
	className,
	children
}: Readonly<{ icon: ReactNode; label: string; hint?: ReactNode; className?: string; children: ReactNode }>) {
	const hasHint = Boolean(hint);
	return (
		<div
			className={cn(
				'grid min-h-9 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[9rem_minmax(0,1fr)]',
				// Keeps the first line level with the rows that have no hint
				hasHint && 'pt-1',
				className
			)}
		>
			<span className="flex items-center gap-2 text-[13px] text-muted-foreground [&_svg]:size-4">
				{icon}
				{label}
			</span>
			<div className="flex min-w-0 flex-wrap items-center gap-1.5 py-1">{children}</div>
			{hasHint && <div className="col-start-2 pb-2">{hint}</div>}
		</div>
	);
}

function PeopleChips({ people, max }: Readonly<{ people: ProjectPerson[]; max: number }>) {
	const t = useTranslations();
	if (people.length === 0) {
		return <span className={MUTED_VALUE}>{t('pages.projects.detail.NOBODY')}</span>;
	}
	const shown = people.slice(0, max);
	const remaining = people.length - shown.length;
	const hasRemaining = remaining > 0;
	return (
		<>
			{shown.map((person) => (
				<span
					key={person.id}
					className="inline-flex h-6 max-w-48 items-center gap-1.5 rounded-full bg-foreground/[0.04] pr-2.5 pl-1 text-xs font-medium text-foreground"
				>
					<PersonFace person={person} className="size-4.5" />
					<span className="truncate">{person.name}</span>
				</span>
			))}
			{hasRemaining && <AvatarStack people={people.slice(max)} max={4} />}
		</>
	);
}

type ProjectTeam = NonNullable<TOrganizationProject['teams']>[number];

function TeamChips({ teams }: Readonly<{ teams: ProjectTeam[] }>) {
	const t = useTranslations();
	if (teams.length === 0) {
		return <span className={MUTED_VALUE}>{t('pages.projects.detail.NO_TEAM')}</span>;
	}
	return (
		<>
			{teams.map((team) => (
				<span
					key={team?.id ?? team?.name}
					className="inline-flex h-6 max-w-48 items-center gap-1.5 rounded-md bg-foreground/[0.04] pr-2 pl-1 text-xs font-medium text-foreground"
				>
					<EntityTile
						name={team?.name}
						color={team?.color}
						imageUrl={teamImageOf(team)}
						className="size-4 text-[7px]"
					/>
					<span className="truncate">{team?.name}</span>
				</span>
			))}
		</>
	);
}

function BudgetValue({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const budget = useProjectBudget(project);
	if (!budget) {
		return <span className={MUTED_VALUE}>{t('pages.projects.list.NOT_SET')}</span>;
	}
	const isHours = project.budgetType === EProjectBudgetType.HOURS;
	let typeLabel = t('common.COST_BASED');
	if (isHours) {
		typeLabel = t('common.HOURS_BASED');
	}
	return (
		<span className="inline-flex items-baseline gap-2 text-[13px] tabular-nums">
			<span className="font-medium text-foreground">
				{budget.amount}
				{budget.unit && <span className="ml-0.5 font-normal text-muted-foreground">{budget.unit}</span>}
			</span>
			<span className="text-xs text-muted-foreground">{typeLabel}</span>
		</span>
	);
}

export function ProjectProperties({
	project,
	statuses
}: Readonly<{ project: TOrganizationProject; statuses: TTaskStatus[] }>) {
	const t = useTranslations();
	const managers = managersOf(project).map(personFromProjectMember);
	const members = contributorsOf(project).map(personFromProjectMember);
	const clientNames = useClientNames();
	const client = clientNameOf(project, clientNames);
	const tags = project.tags ?? [];
	const hasTags = tags.length > 0;
	return (
		<section className="flex flex-col">
			<h2 className={PROJECT_SECTION_LABEL}>{t('pages.projects.detail.PROPERTIES')}</h2>
			<div className="mt-1 flex flex-col">
				<PropertyRow icon={<CircleCheck />} label={t('common.STATUS')}>
					<ProjectStatusChip statusName={project.status} statuses={statuses} />
				</PropertyRow>
				<PropertyRow icon={<UserCheck />} label={t('common.MANAGERS')}>
					<PeopleChips people={managers} max={3} />
				</PropertyRow>
				<PropertyRow icon={<Users />} label={t('common.MEMBERS')}>
					<PeopleChips people={members} max={3} />
				</PropertyRow>
				<PropertyRow icon={<Calendar />} label={t('pages.projects.list.COLUMN_DATES')}>
					<ProjectDatesCell startDate={project.startDate} endDate={project.endDate} />
				</PropertyRow>
				<PropertyRow icon={<UsersGroup />} label={t('common.TEAMS')}>
					<TeamChips teams={project.teams ?? []} />
				</PropertyRow>
				<PropertyRow icon={<Wallet />} label={t('pages.projects.list.COLUMN_BUDGET')}>
					<BudgetValue project={project} />
				</PropertyRow>
				{client && (
					<PropertyRow icon={<Briefcase />} label={t('common.CLIENT')}>
						<span className="truncate text-[13px] text-foreground">{client}</span>
					</PropertyRow>
				)}
				{hasTags && (
					<PropertyRow icon={<Tag />} label={t('pages.projects.categorizationForm.formFields.tags')}>
						<ProjectTagChips tags={tags} />
					</PropertyRow>
				)}
			</div>
		</section>
	);
}

function CopyLinkButton({ url }: Readonly<{ url: string }>) {
	const t = useTranslations();
	const [isCopied, setIsCopied] = useState(false);
	const label = t('pages.projects.detail.COPY_LINK');
	const copy = async () => {
		await navigator.clipboard.writeText(url);
		setIsCopied(true);
		window.setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS);
	};
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			onClick={() => void copy()}
			aria-label={label}
			title={label}
			className="text-muted-foreground"
		>
			{isCopied && <Check />}
			{!isCopied && <Copy />}
		</Button>
	);
}

interface ProjectLink {
	key: string;
	label: string;
	url: string;
	icon: ReactNode;
}

function linksOf(project: TOrganizationProject, labels: { website: string; openSource: string }) {
	const links: ProjectLink[] = [];
	if (project.projectUrl) {
		links.push({ key: 'website', label: labels.website, url: project.projectUrl, icon: <Globe /> });
	}
	if (project.openSourceProjectUrl) {
		links.push({
			key: 'open-source',
			label: labels.openSource,
			url: project.openSourceProjectUrl,
			icon: <LinkIcon />
		});
	}
	return links;
}

export function ProjectLinks({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const links = linksOf(project, {
		website: t('pages.projects.basicInformationForm.formFields.websiteUrl'),
		openSource: t('pages.projects.detail.OPEN_SOURCE_URL')
	});
	const repository = project.repository?.fullName;
	const hasLinks = links.length > 0;
	const hasRepository = Boolean(repository);
	const isEmpty = !hasLinks && !hasRepository;
	if (isEmpty) {
		return null;
	}
	return (
		<section className="flex flex-col gap-2">
			<h2 className={PROJECT_SECTION_LABEL}>{t('pages.projects.detail.RESOURCES')}</h2>
			<ul className="flex flex-col rounded-lg hairline-ring ring-border hairline-divide-y divide-border">
				{links.map((link) => (
					<li key={link.key} className="flex h-11 items-center gap-3 pr-1.5 pl-3">
						<span className="flex size-6 shrink-0 items-center justify-center rounded-md keycap-3d text-muted-foreground [&_svg]:size-3.5">
							{link.icon}
						</span>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="text-xs text-muted-foreground">{link.label}</span>
							<a
								href={link.url}
								target="_blank"
								rel="noopener noreferrer"
								className="truncate rounded-sm text-[13px] text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								{link.url}
							</a>
						</span>
						<CopyLinkButton url={link.url} />
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={t('pages.projects.detail.OPEN_LINK')}
							className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground [&_svg]:size-4"
						>
							<ExternalLink />
						</a>
					</li>
				))}
				{hasRepository && (
					<li className="flex h-11 items-center gap-3 pr-3 pl-3">
						<span className="flex size-6 shrink-0 items-center justify-center rounded-md keycap-3d text-muted-foreground [&_svg]:size-3.5">
							<LinkIcon />
						</span>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="text-xs text-muted-foreground">
								{t('pages.projects.detail.REPOSITORY')}
							</span>
							<span className="truncate font-mono text-[13px] text-foreground">{repository}</span>
						</span>
					</li>
				)}
			</ul>
		</section>
	);
}

function FactRow({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	return (
		<div className="flex min-h-9 items-center justify-between gap-4 py-1.5">
			<span className="shrink-0 text-xs text-muted-foreground">{label}</span>
			<span className="min-w-0 truncate text-right text-[13px] font-medium tabular-nums text-foreground">
				{children}
			</span>
		</div>
	);
}

function billingLabelOf(billing: string | null | undefined, labels: Record<EProjectBilling, string>) {
	if (!billing) {
		return null;
	}
	return labels[billing as EProjectBilling] ?? billing;
}

export function ProjectFacts({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const locale = useLocale();
	const createdAt = realDateOf(project.createdAt);
	const archivedAt = realDateOf(project.archivedAt);
	const billing = billingLabelOf(project.billing, {
		[EProjectBilling.RATE]: t('common.RATE'),
		[EProjectBilling.FLAT_FEE]: t('common.FLAT_FEE'),
		[EProjectBilling.MILESTONES]: t('common.MILESTONES')
	});
	const isBillable = isBillableByDefault(project);
	let billableLabel = t('common.NO');
	if (isBillable) {
		billableLabel = t('common.YES');
	}
	return (
		<section className="flex flex-col p-4">
			<h2 className="pb-1 text-[13px] font-semibold text-foreground">{t('common.DETAILS')}</h2>
			<div className="hairline-divide-y divide-dashed divide-border">
				{project.code && (
					<FactRow label={t('pages.projects.detail.CODE')}>
						<span className="font-mono">{project.code}</span>
					</FactRow>
				)}
				{createdAt && (
					<FactRow label={t('pages.projects.detail.CREATED')}>{formatProjectDay(createdAt, locale)}</FactRow>
				)}
				{archivedAt && <FactRow label={t('common.ARCHIVE_AT')}>{formatProjectDay(archivedAt, locale)}</FactRow>}
				{billing && (
					<FactRow label={t('pages.projects.financialSettingsForm.formFields.billing')}>{billing}</FactRow>
				)}
				{project.currency && (
					<FactRow label={t('pages.projects.financialSettingsForm.formFields.currency')}>
						{project.currency}
					</FactRow>
				)}
				<FactRow label={t('pages.projects.billable.LABEL')}>{billableLabel}</FactRow>
			</div>
		</section>
	);
}
