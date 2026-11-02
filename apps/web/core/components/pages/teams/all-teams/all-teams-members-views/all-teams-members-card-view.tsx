import UserTeamCard from './users-teams-card/user-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { COUNT_CHIP_CLASS_NAME } from '@/core/components/tasks/daily-plan/day-group';
import { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';

const TEAM_LIST_SURFACE_CLASS_NAME =
	'w-full hairline-divide-y divide-border overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5';

export default function TeamsMembersCardView({ teams }: { teams: TOrganizationTeam[] }) {
	return (
		<div className="flex w-full flex-col gap-4">
			<Accordion type="multiple" className="flex flex-col gap-4 text-sm" defaultValue={teams.map((t) => t.name)}>
				{teams.map((team) => {
					const memberCount = team.members?.length || 0;
					const hasMembers = memberCount > 0;
					return (
						<AccordionItem key={team.id} value={team.name} className="border-none">
							<AccordionTrigger className="h-10 py-0 text-start hover:no-underline">
								<div className="flex min-w-0 flex-1 items-center gap-2">
									<span className="truncate text-sm font-semibold">{team.name}</span>
									<span className={COUNT_CHIP_CLASS_NAME}>{team.members?.length}</span>
								</div>
							</AccordionTrigger>

							<AccordionContent className="p-0 pt-2">
								{hasMembers && (
									<ul className={TEAM_LIST_SURFACE_CLASS_NAME}>
										{team.members?.map((member) => {
											return (
												<li
													key={member.id}
													className="w-full transition-colors hover:bg-foreground/[0.025]"
												>
													<UserTeamCard key={`${member.id}${team.id}`} member={member} />
												</li>
											);
										})}
									</ul>
								)}
								{!hasMembers && (
									<div className="rounded-xl bg-card py-10 text-center text-sm text-muted-foreground hairline-ring ring-border shadow-sm shadow-black/6.5">
										There is no member for filtered value in the team{' '}
										<span className="font-semibold text-primary-ink"> {team.name}</span>
									</div>
								)}
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}
