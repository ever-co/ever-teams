import { clsxm } from '@app/utils';
import { Button, Card, Text } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import {
	CloseIcon,
	CloseCircleIcon,
	TickCircleIcon,
} from 'lib/components/svgs';
import { useTeamInvitations } from '@app/hooks';
import { useEffect } from 'react';

export function TeamInvitations() {
	const { trans } = useTranslation('home');
	const { myInvitationsList, myInvitations } = useTeamInvitations();

	useEffect(() => {
		myInvitations();
	}, []);

	return (
		<>
			{myInvitationsList.map((invitation) => (
				<Card
					shadow="bigger"
					className={clsxm(
						'w-full mt-6 flex justify-between',
						'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]',
						'pt-2 pb-2'
					)}
				>
					<Text className="mt-auto mb-auto">
						{trans.INVITATIONS}{' '}
						<span className="font-semibold">{invitation.teams[0].name}</span>
					</Text>

					<div className="flex flex-row gap-3 justify-items-end ml-auto mr-5">
						<Button className="rounded-xl pt-2 pb-2">
							<TickCircleIcon className="stroke-white" />
							Accept
						</Button>
						<Button
							className="rounded-xl text-primary dark:text-white pt-2 pb-2"
							variant="outline-dark"
						>
							<CloseCircleIcon className="stroke-primary dark:stroke-white" />
							Reject
						</Button>
					</div>

					<button>
						<CloseIcon />
					</button>
				</Card>
			))}
		</>
	);
}
