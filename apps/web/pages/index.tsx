import { clsxm } from '@app/utils';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Button, Card, Container } from 'lib/components';
import {
	AuthUserTaskInput,
	TeamInvitations,
	TeamMembers,
	Timer,
	UnverifiedEmail,
	UserTeamCardHeader,
} from 'lib/features';
import { useTranslation } from 'lib/i18n';
import { MainHeader, MainLayout } from 'lib/layout';
import { useCollaborative, useOrganizationTeams } from '@app/hooks';
import NoTeam from '@components/pages/main/no-team';
import {
	BrushSquareLinearIcon,
	CallOutGoingLinearIcon,
	CloseIcon,
	PeopleIcon,
	Profile2UserLinearIcon,
} from 'lib/components/svgs';

function MainPage() {
	const { trans } = useTranslation('home');
	const { isTeamMember, isTrackingEnabled, activeTeam } =
		useOrganizationTeams();
	const breadcrumb = [...trans.BREADCRUMB, activeTeam?.name || ''];

	return (
		<MainLayout>
			<MainHeader className="pb-1">
				<div className="flex items-start justify-between h-5">
					<div className="flex items-center gap-8">
						<PeopleIcon className="stroke-dark dark:stroke-[#6b7280] h-6 w-6" />
						<Breadcrumb paths={breadcrumb} className="text-sm" />
					</div>

					<Collaborative />
				</div>

				<UnverifiedEmail />
				<TeamInvitations />
			</MainHeader>

			<div className="sticky top-20 z-50 bg-white dark:bg-[#191A20] pt-5">
				<Container>
					{isTeamMember ? (
						<TaskTimerSection isTrackingEnabled={isTrackingEnabled} />
					) : null}
					{/* Header user card list */}
					{isTeamMember ? <UserTeamCardHeader /> : null}
				</Container>

				{/* Divider */}
				<div className="h-0.5 bg-[#FFFFFF14]"></div>
			</div>

			<Container>{isTeamMember ? <TeamMembers /> : <NoTeam />}</Container>
		</MainLayout>
	);
}

function Collaborative() {
	const {
		collaborativeSelect,
		setCollaborativeSelect,
		setCollaborativeMembers,
		onMeetClick,
		onBoardClick,
	} = useCollaborative();

	const { trans } = useTranslation();

	return (
		<div className="pr-2">
			{!collaborativeSelect && (
				<Button
					onClick={() => setCollaborativeSelect(true)}
					className={clsxm(
						'rounded-lg py-1 text-sm font-thin',
						'gap-1 items-center'
					)}
					type="button"
					variant="outline-dark"
				>
					<Profile2UserLinearIcon className="w-4 h-4 stroke-dark dark:stroke-light--theme-light" />
					{trans.common.COLLABORATE}
				</Button>
			)}

			{collaborativeSelect && (
				<div className="flex space-x-3">
					<Button
						onClick={onMeetClick}
						className={clsxm(
							'rounded-lg flex min-w-0 py-0 px-5 text-sm font-normal text-primary dark:text-light--theme-light',
							'gap-1 items-center'
						)}
						variant="outline-dark"
					>
						<CallOutGoingLinearIcon className="w-4 h-4 stroke-primary dark:stroke-light--theme-light" />
						{trans.common.MEET}
					</Button>

					<Button
						onClick={onBoardClick}
						className={clsxm(
							'rounded-lg flex min-w-0 py-0 px-5 text-sm font-normal text-primary dark:text-light--theme-light',
							'gap-1 items-center'
						)}
						variant="outline-dark"
					>
						<BrushSquareLinearIcon className="w-4 h-4 stroke-primary dark:stroke-light--theme-light" />
						{trans.common.BOARD}
					</Button>

					<Button
						onClick={() => {
							setCollaborativeSelect(false);
							setCollaborativeMembers([]);
						}}
						className="min-w-0 rounded-lg px-1 w-7 py-1"
						variant="outline-danger"
					>
						<CloseIcon className="w-4 stroke-[#EB6961] dark:stroke-[#EB6961]" />
					</Button>
				</div>
			)}
		</div>
	);
}

function TaskTimerSection({
	isTrackingEnabled,
}: {
	isTrackingEnabled: boolean;
}) {
	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full flex md:flex-row flex-col-reverse justify-between items-center py-4',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			{/* Task inputs */}
			<AuthUserTaskInput className="w-4/5 md:w-1/2 2xl:w-full " />

			{/* Timer  */}
			{isTrackingEnabled ? <Timer /> : null}
		</Card>
	);
}

export default withAuthentication(MainPage, { displayName: 'MainPage' });
