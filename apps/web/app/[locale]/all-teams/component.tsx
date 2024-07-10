'use client';

import { useRouter } from 'next/navigation';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container, HorizontalSeparator } from 'lib/components';
import { MainHeader, MainLayout } from 'lib/layout';
import { useOrganizationAndTeamManagers } from '@app/hooks/features/useOrganizationTeamManagers';
import { useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem } from '@components/ui/accordion';
import { IOrganizationTeamList, IUser } from '@app/interfaces';
import { AccordionTrigger } from '@radix-ui/react-accordion';
import { useAuthenticateUser } from '@app/hooks';
import { Transition } from '@headlessui/react';
import { UserTeamCard } from 'lib/features';
import { MinusCircledIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import TeamMemberHeader from 'lib/features/team-member-header';
import { IssuesView } from '@app/constants';

function AllTeamsPage() {
	const t = useTranslations();
	const fullWidth = useRecoilValue(fullWidthState);
	const { userManagedTeams } = useOrganizationAndTeamManagers();
	const { user } = useAuthenticateUser();

	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.ALL_TEAMS'), href: '/all-teams' }
	];

	/* If the user is not a manager in any team or if he's
        manager in only one team, then redirect him to the home page
    */
	if (userManagedTeams.length < 2) return <RedirectUser />;

	return (
		<MainLayout className="items-start">
			<MainHeader fullWidth={fullWidth} className={'pb-2 pt-10 sticky top-20 z-50'}>
				{/* Breadcrumb */}
				<div className="flex items-center gap-8 mb-5">
					<Breadcrumb paths={breadcrumb} className="text-sm" />
				</div>
				<TeamMemberHeader view={IssuesView.CARDS} />
			</MainHeader>
			<Container fullWidth={fullWidth} className="flex py-10 pt-20">
				<AllTeamsMember teams={userManagedTeams} user={user} />
			</Container>
		</MainLayout>
	);
}

function AllTeamsMember({ teams, user }: { teams: IOrganizationTeamList[]; user?: IUser }) {
	return (
		<div className="flex flex-col gap-5 w-full">
			<Accordion type="multiple" className="text-sm flex flex-col gap-5">
				{teams.map((team) => {
					return (
						<AccordionItem key={team.id} value={team.name} className="dark:border-slate-600 !border-none">
							<AccordionTrigger className="!min-w-full text-start">
								<div className="flex items-center justify-between gap-3">
									<span className="font-medium min-w-max">
										{team.name} ({team.members.length})
									</span>
									<HorizontalSeparator />
									<MinusCircledIcon />
								</div>
							</AccordionTrigger>

							<AccordionContent className="bg-light--theme border-none dark:bg-dark--theme flex flex-col gap-2 mt-4">
								{team.members.map((member) => (
									<Transition
										key={`${member.id}${team.id}`}
										show={true}
										enter="transition-opacity duration-75"
										enterFrom="opacity-0"
										enterTo="opacity-100"
										leave="transition-opacity duration-150"
										leaveFrom="opacity-100"
										leaveTo="opacity-0"
									>
										<UserTeamCard
											member={member}
											publicTeam={false}
											currentExit={true}
											draggable={true}
											onDragStart={() => {}}
											onDragEnter={() => {}}
											onDragEnd={() => {}}
											onDragOver={(e) => e.preventDefault()}
										/>
									</Transition>
								))}
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}

function RedirectUser() {
	const router = useRouter();
	useEffect(() => {
		router.push('/');
	}, [router]);
	return <></>;
}

export default withAuthentication(AllTeamsPage, { displayName: 'AllManagedTeams' });
