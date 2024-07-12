import { IOrganizationTeamList } from '@app/interfaces';
import UserTeamCard from './all-teams/users-teams-card/user-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { HorizontalSeparator } from 'lib/components';

export default function TeamsMembersCardView({ teams }: { teams: IOrganizationTeamList[] }) {
	return (
		<div className="flex flex-col gap-5 w-full">
			<Accordion type="multiple" className="text-sm flex flex-col gap-5" defaultValue={teams.map((t) => t.name)}>
				{teams.map((team) => {
					return (
						<AccordionItem key={team.id} value={team.name} className="dark:border-slate-600 !border-none">
							<AccordionTrigger className="!min-w-full text-start hover:no-underline">
								<div className="flex items-center justify-between gap-3 w-full">
									<span className="font-medium min-w-max">
										{team.name} ({team.members.length})
									</span>
									<HorizontalSeparator />
									{/* <MinusCircledIcon /> */}
								</div>
							</AccordionTrigger>

							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme flex flex-col gap-2 mt-4">
								{team.members.map((member) => {
									return <UserTeamCard key={`${member.id}${team.id}`} member={member} />;
								})}
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}
