'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Users } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { teamImageOf } from '@/core/components/projects/project-cells';
import { contributorsOf, managersOf, personFromProjectMember, type ProjectPerson } from '@/core/lib/utils/project-list';
import type { TOrganizationProject } from '@/core/types/schemas';

const GROUP_SURFACE =
	'overflow-clip rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 hairline-divide-y divide-border';

function GroupHeading({ label, count }: Readonly<{ label: string; count: number }>) {
	return (
		<h2 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
			{label}
			<span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
				{count}
			</span>
		</h2>
	);
}

function PersonRow({ person, role }: Readonly<{ person: ProjectPerson; role: ReactNode }>) {
	return (
		<li className="flex min-h-14 items-center gap-3 px-4 py-2">
			<PersonAvatar person={person} size="md" className="size-8 ring-0" />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-[13px] font-medium text-foreground">{person.name}</span>
				{person.email && <span className="truncate text-xs text-muted-foreground">{person.email}</span>}
			</span>
			{role}
		</li>
	);
}

function PeopleGroup({ label, people, role }: Readonly<{ label: string; people: ProjectPerson[]; role: ReactNode }>) {
	if (people.length === 0) {
		return null;
	}
	return (
		<section className="flex flex-col gap-2">
			<GroupHeading label={label} count={people.length} />
			<ul className={GROUP_SURFACE}>
				{people.map((person) => (
					<PersonRow key={person.id} person={person} role={role} />
				))}
			</ul>
		</section>
	);
}

type ProjectTeam = NonNullable<TOrganizationProject['teams']>[number];

function memberCountOf(team: ProjectTeam): number | null {
	const members = team?.members;
	if (!Array.isArray(members)) {
		return null;
	}
	return members.length;
}

function TeamRow({ team }: Readonly<{ team: ProjectTeam }>) {
	const t = useTranslations();
	const memberCount = memberCountOf(team);
	const hasCount = memberCount !== null;
	return (
		<li className="flex min-h-12 items-center gap-3 px-4 py-2">
			<EntityTile
				name={team?.name}
				color={team?.color}
				imageUrl={teamImageOf(team)}
				className="size-7 text-[10px]"
			/>
			<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{team?.name}</span>
			{hasCount && (
				<span className="text-xs tabular-nums text-muted-foreground">
					{t('pages.projects.detail.MEMBER_COUNT', { count: memberCount })}
				</span>
			)}
		</li>
	);
}

export function ProjectPeopleTab({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const managers = managersOf(project).map(personFromProjectMember);
	const members = contributorsOf(project).map(personFromProjectMember);
	const teams = project.teams ?? [];
	const hasPeople = managers.length > 0 || members.length > 0;
	const hasTeams = teams.length > 0;
	const isEmpty = !hasPeople && !hasTeams;

	if (isEmpty) {
		return (
			<AnimatedEmptyState
				title={t('pages.projects.detail.NO_PEOPLE_TITLE')}
				message={t('pages.projects.detail.NO_PEOPLE_MESSAGE')}
				icon={<Users />}
				minHeight="360px"
			/>
		);
	}

	const managerRole = (
		<span className="inline-flex h-6 items-center rounded-md bg-primary/10 px-2 text-xs font-medium text-primary-ink">
			{t('common.MANAGER')}
		</span>
	);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
			<PeopleGroup label={t('common.MANAGERS')} people={managers} role={managerRole} />
			<PeopleGroup label={t('common.MEMBERS')} people={members} role={null} />
			{hasTeams && (
				<section className="flex flex-col gap-2">
					<GroupHeading label={t('common.TEAMS')} count={teams.length} />
					<ul className={GROUP_SURFACE}>
						{teams.map((team) => (
							<TeamRow key={team?.id ?? team?.name} team={team} />
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
