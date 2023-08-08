import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Tooltip } from 'lib/components';
import { mapTeamItems, TeamItem } from './team-item';
import { PlusIcon } from '@heroicons/react/24/solid';
import {
	useAuthenticateUser,
	useModal,
	useOrganizationTeams,
} from '@app/hooks';
import { clsxm } from '@app/utils';
import { CreateTeamModal } from './create-team-modal';
import { useTranslation } from 'lib/i18n';

export const TeamsDropDown = ({ publicTeam }: { publicTeam?: boolean }) => {
	const { user } = useAuthenticateUser();
	const { teams, activeTeam, setActiveTeam } = useOrganizationTeams();

	const { trans } = useTranslation();

	const items = useMemo(() => mapTeamItems(teams), [teams]);

	const [teamItem, setTeamItem] = useState<TeamItem | null>(null);

	const { isOpen, closeModal, openModal } = useModal();

	useEffect(() => {
		setTeamItem(items.find((t) => t.key === activeTeam?.id) || null);
	}, [activeTeam, items]);

	const onChangeActiveTeam = useCallback(
		(item: TeamItem) => {
			if (item.data) {
				setActiveTeam(item.data);
			}
		},
		[setActiveTeam]
	);

	return (
		<>
			<Dropdown
				className="md:w-[223px] outline-none"
				optionsClassName="md:w-[223px] outline-none"
				buttonClassName={clsxm(
					'py-0 font-medium outline-none h-[3.125rem] dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]',
					items.length === 0 && ['py-2']
				)}
				value={teamItem}
				onChange={onChangeActiveTeam}
				items={items}
				// loading={teamsFetching} // TODO: Enable loading in future when we implement better data fetching library like TanStack
				publicTeam={publicTeam}
			>
				{!publicTeam && (
					<Tooltip
						enabled={!user?.isEmailVerified}
						label={trans.common.VERIFY_ACCOUNT_MSG}
						placement="top-start"
					>
						<Button
							className="w-full text-xs mt-3 dark:text-white rounded-xl border-[0.0938rem]"
							variant="outline"
							onClick={openModal}
							disabled={!user?.isEmailVerified}
						>
							<PlusIcon className="w-4 h-4" />
							{trans.common.CREATE_TEAM}
						</Button>
					</Tooltip>
				)}
			</Dropdown>

			{!publicTeam && (
				<CreateTeamModal
					open={isOpen && !!user?.isEmailVerified}
					closeModal={closeModal}
				/>
			)}
		</>
	);
};
