'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Button } from '@/core/components/duplicated-components/_button';
import { BlockEmptyMessage, DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { FoldToggle } from '@/core/components/dashboards/kit/fold-toggle';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ArrowUpRight } from '@/core/components/icons';
import { ProjectTile } from '@/core/components/projects/project-cells';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import type { ListReadState } from '@/core/lib/utils/clients';
import { normalizeStatusName, personFromProjectMember } from '@/core/lib/utils/project-list';
import type { TOrganizationProject } from '@/core/types/schemas';
import { ClientSection } from './client-section';

const SHOWN_PROJECTS = 5;

const SKELETON_ROWS = ['first', 'second'];

const ROW = 'flex min-h-11 items-center gap-2.5';

function projectPathOf(projectId: string) {
	return `/projects/${encodeURIComponent(projectId)}`;
}

const ClientProjectRow = memo(function ClientProjectRow({ project }: { project: TOrganizationProject }) {
	const members = project.members ?? [];
	const people = members.map(personFromProjectMember);
	const hasPeople = people.length > 0;
	const statusName = normalizeStatusName(project.status);
	return (
		<li className="[content-visibility:auto] [contain-intrinsic-size:auto_44px]">
			<div className={ROW}>
				<ProjectTile project={project} size="md" />
				<Link
					href={projectPathOf(project.id)}
					className="min-w-0 flex-1 truncate rounded-sm text-[13px] text-foreground outline-none transition-colors hover:text-primary-ink focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{project.name}
				</Link>
				{statusName && (
					<span className="shrink-0 truncate text-xs capitalize text-muted-foreground max-sm:hidden">
						{statusName}
					</span>
				)}
				{hasPeople && <AvatarStack people={people} max={3} size="sm" />}
			</div>
		</li>
	);
});

interface ClientProjectsSectionProps {
	projects: ReadonlyArray<TOrganizationProject>;
	state: ListReadState;
	onRetry: () => void;
	allProjectsHref: string;
	framed: boolean;
}

export function ClientProjectsSection({
	projects,
	state,
	onRetry,
	allProjectsHref,
	framed
}: Readonly<ClientProjectsSectionProps>) {
	const t = useTranslations();
	const [isExpanded, setIsExpanded] = useState(false);
	const firstProjects = projects.slice(0, SHOWN_PROJECTS);
	const moreProjects = projects.slice(SHOWN_PROJECTS);
	const hiddenCount = moreProjects.length;
	const canFold = hiddenCount > 0;
	const isReady = state === 'ready';
	const hasProjects = projects.length > 0;
	const showsList = isReady && hasProjects;
	const showsEmpty = isReady && !hasProjects;

	let meta: string | undefined;
	if (isReady) {
		meta = t('clients.PROJECT_COUNT', { count: projects.length });
	}

	let foldLabel = t('pages.projects.modals.showMore', { count: hiddenCount });
	if (isExpanded) {
		foldLabel = t('pages.projects.modals.showLess');
	}

	const allProjectsLink = (
		<Button asChild variant="ghost" size="sm" className="text-muted-foreground">
			<Link href={allProjectsHref}>
				<span>{t('sidebar.ALL_PROJECTS')}</span>
				<ArrowUpRight />
			</Link>
		</Button>
	);

	return (
		<ClientSection
			title={t('clients.COLUMN_PROJECTS')}
			meta={meta}
			actions={showsList && allProjectsLink}
			framed={framed}
		>
			<div className={cn(framed && 'px-4 pb-2')}>
				{state === 'loading' && (
					<ul aria-hidden="true">
						{SKELETON_ROWS.map((key) => (
							<li key={key} className={ROW}>
								<span className={cn('size-6 rounded-[7px]', SKELETON_BAR)} />
								<span className={cn('h-3 w-40', SKELETON_BAR)} />
							</li>
						))}
					</ul>
				)}
				{state === 'failed' && (
					<DashboardErrorNotice title={t('pages.projects.list.ERROR_TITLE')} onRetry={onRetry} />
				)}
				{showsEmpty && (
					<BlockEmptyMessage
						title={t('clients.projects.EMPTY_TITLE')}
						message={t('clients.projects.EMPTY_MESSAGE')}
						className="py-6"
					/>
				)}
				{showsList && (
					<>
						<ul>
							{firstProjects.map((project) => (
								<ClientProjectRow key={project.id} project={project} />
							))}
						</ul>
						<AnimatedHeight>
							{isExpanded && (
								<ul>
									{moreProjects.map((project) => (
										<ClientProjectRow key={project.id} project={project} />
									))}
								</ul>
							)}
						</AnimatedHeight>
						{canFold && (
							<div className="py-2">
								<FoldToggle
									label={foldLabel}
									isExpanded={isExpanded}
									onToggle={() => setIsExpanded((expanded) => !expanded)}
								/>
							</div>
						)}
					</>
				)}
			</div>
		</ClientSection>
	);
}
