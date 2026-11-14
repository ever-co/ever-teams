'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, Loader } from '@/core/components/icons';
import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator
} from '@/core/components/common/dropdown-menu';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Skeleton } from '@/core/components/common/skeleton';
import type { ITeamMenuOrganization } from '@/core/lib/utils/team-menu-organizations';
import type { TOrganizationTeam } from '@/core/types/schemas';

export interface ITeamMenuOrganizationsProps {
	organizations: readonly ITeamMenuOrganization[];
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	/** The timer runs, or a switch is under way: no other organization can be opened. */
	isDisabled: boolean;
	switchingOrganizationId: string | null;
	failedOrganizationId: string | null;
	onPickTeam: (organization: ITeamMenuOrganization, team: TOrganizationTeam) => void;
	onPickOrganization: (organization: ITeamMenuOrganization) => void;
	countClassName: string;
}

/**
 * The person's other organizations of the workspace, under the current organization's teams in the team menu
 * (ever-co/ever-teams#5204): one group per organization, labelled with its name like the menu's own label, with its
 * teams, or one row that opens it when the API keeps the person to the organization of their session.
 */
export function TeamMenuOrganizations(props: Readonly<ITeamMenuOrganizationsProps>) {
	const t = useTranslations();

	if (props.isLoading) {
		return (
			<>
				<DropdownMenuSeparator />
				<div
					role="status"
					aria-label={t('switchers.OTHER_ORGANIZATIONS_LOADING')}
					className="flex flex-col gap-1.5 px-2 py-1.5"
				>
					<Skeleton className="h-3 w-24 bg-foreground/[0.06]" />
					<div className="flex items-center gap-2.5">
						<Skeleton className="size-5 rounded-[28%] bg-foreground/[0.06]" />
						<Skeleton className="h-3.5 w-32 bg-foreground/[0.06]" />
					</div>
				</div>
			</>
		);
	}

	if (props.isError) {
		return (
			<>
				<DropdownMenuSeparator />
				<div role="alert" className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
					<span className="min-w-0 flex-1">{t('switchers.OTHER_ORGANIZATIONS_FAILED')}</span>
					<button
						type="button"
						onClick={props.onRetry}
						className="shrink-0 rounded-md px-1.5 py-0.5 font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						{t('switchers.TRY_AGAIN')}
					</button>
				</div>
			</>
		);
	}

	return props.organizations.map((organization) => (
		<OrganizationGroup key={organization.id} organization={organization} {...props} />
	));
}

function OrganizationGroup({
	organization,
	isDisabled,
	switchingOrganizationId,
	failedOrganizationId,
	onPickTeam,
	onPickOrganization,
	countClassName
}: Readonly<ITeamMenuOrganizationsProps & { organization: ITeamMenuOrganization }>) {
	const t = useTranslations();
	const name = organization.name || t('switchers.UNNAMED_ORGANIZATION');
	const isSwitching = switchingOrganizationId === organization.id;
	const hasFailed = failedOrganizationId === organization.id;
	const listsItsTeams = organization.teamsListed && organization.teams.length > 0;

	return (
		<>
			<DropdownMenuSeparator />
			<DropdownMenuGroup>
				<DropdownMenuLabel className="truncate" title={name}>
					{name}
				</DropdownMenuLabel>
				{listsItsTeams &&
					organization.teams.map((team) => (
						<DropdownMenuItem
							key={team.id}
							disabled={isDisabled}
							closeOnClick={false}
							onClick={() => onPickTeam(organization, team)}
							className="h-9 gap-2.5"
						>
							<EntityTile name={team.name} color={team.color} imageUrl={teamImageOf(team)} />
							<span className="min-w-0 flex-1 truncate" title={team.name}>
								{team.name}
							</span>
							<span className={countClassName}>{team.members?.length ?? 0}</span>
							<span className="flex size-4 shrink-0 items-center justify-center">
								{isSwitching && <Loader className="size-3.5 animate-spin text-muted-foreground" />}
							</span>
							{/* The width of the current organization's team settings button, so the counts line up */}
							<span className="size-6 shrink-0" aria-hidden="true" />
						</DropdownMenuItem>
					))}
				{!listsItsTeams && (
					<DropdownMenuItem
						disabled={isDisabled}
						closeOnClick={false}
						onClick={() => onPickOrganization(organization)}
						className="h-9 gap-2.5"
					>
						<EntityTile name={name} />
						<span className="min-w-0 flex-1 truncate">{t('switchers.OPEN_ORGANIZATION')}</span>
						{isSwitching && <Loader className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
						{!isSwitching && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
					</DropdownMenuItem>
				)}
				{hasFailed && (
					<p role="alert" className="px-2 pb-1.5 text-xs text-destructive">
						{t('switchers.ORGANIZATION_SWITCH_FAILED')}
					</p>
				)}
			</DropdownMenuGroup>
		</>
	);
}

/** The picture of a team, its thumbnail first. */
export function teamImageOf(team: TOrganizationTeam | null | undefined) {
	const thumbUrl = team?.image?.thumbUrl;
	if (thumbUrl) {
		return thumbUrl;
	}
	return team?.image?.fullUrl ?? '';
}
