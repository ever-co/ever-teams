import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown } from 'lib/components';
import { mapTeamItems, TeamItem } from './team-item';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useModal, useOrganizationTeams } from '@app/hooks';
import { clsxm } from '@app/utils';
import { CreateTeamModal } from './create-team-modal';

export const TeamsDropDown = () => {
	const { teams, activeTeam, setActiveTeam, teamsFetching } =
		useOrganizationTeams();

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
				className="min-w-[230px] max-w-sm"
				optionsClassName="min-w-[230px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium',
					items.length === 0 && ['py-2']
				)}
				value={teamItem}
				onChange={onChangeActiveTeam}
				items={items}
				loading={teamsFetching}
			>
				<Button
					className="w-full text-xs mt-3 dark:text-white dark:border-white"
					variant="outline"
					onClick={openModal}
				>
					<PlusIcon className="w-[16px] h-[16px]" /> Create new teams
				</Button>
			</Dropdown>

			<CreateTeamModal open={isOpen} closeModal={closeModal} />
		</>
	);
};
