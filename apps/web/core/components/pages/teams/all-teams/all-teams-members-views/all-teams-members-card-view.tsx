import UserTeamCard from './users-teams-card/user-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/core/components/common/accordion';
import { HorizontalSeparator } from '@/core/components/duplicated-components/separator';
import { TOrganizationTeam } from '@/core/types/schemas/team/team.schema';

export default function TeamsMembersCardView({ teams }: { teams: TOrganizationTeam[] }) {
	return (
		<div className="flex flex-col w-full gap-5">
			<Accordion type="multiple" className="flex flex-col gap-5 text-sm" defaultValue={teams.map((t) => t.name)}>
				{teams.map((team) => {
					return (
						<AccordionItem key={team.id} value={team.name} className="dark:border-slate-600 !border-none">
							<AccordionTrigger className="!min-w-full text-start hover:no-underline">
								<div className="flex items-center justify-between w-full gap-3">
									<span className="font-medium min-w-max">
										{team.name} ({team.members?.length})
									</span>
									<HorizontalSeparator />
									{/* <MinusCircledIcon /> */}
								</div>
							</AccordionTrigger>

							<AccordionContent className="flex flex-col gap-2 mt-4 border-none bg-light--theme dark:bg-dark--theme">
								{(team.members?.length || 0) > 0 ? (
									<ul className="w-full">
										{team.members?.map((member) => {
											return (
												<li key={member.id} className="w-full mb-4">
													<UserTeamCard key={`${member.id}${team.id}`} member={member} />
												</li>
											);
										})}
									</ul>
								) : (
									<div className="font-medium text-center">
										There is no member for filtered value in the team{' '}
										<span className="font-semibold text-primary dark:text-primary-light">
											{' '}
											{team.name}
										</span>
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
