import { 
    //useCallback,
    //useEffect,
    //useMemo,
    // useState,
 } from 'react';
import {
	// Button,
	// Card,
	Dropdown,
	// InputField,
	// Modal,
	// Text,
} from 'lib/components';
// import { mapTeamItems, TeamItem } from './team-item';
// import { PlusIcon } from '@heroicons/react/24/solid';
// import { useModal, useOrganizationTeams } from '@app/hooks';
// import { clsxm } from '@app/utils';

export const LanguageDropDown = () => {
	// const { teams, activeTeam, setActiveTeam, teamsFetching } =
		// useOrganizationTeams();

	// const items = useMemo(() => mapTeamItems(teams), [teams]);

	// const [teamItem, setTeamItem] = useState<TeamItem | null>(null);

	// const { isOpen, closeModal, openModal } = useModal();

	// useEffect(() => {
	// 	setTeamItem(items.find((t) => t.key === activeTeam?.id) || null);
	// }, [activeTeam, items]);

	// const onChangeActiveTeam = useCallback(
	// 	(item: TeamItem) => {
	// 		if (item.data) {
	// 			setActiveTeam(item.data);
	// 		}
	// 	},
	// 	[setActiveTeam]
	// );

	return (
		<>
			<Dropdown
                className="md:w-[231px]" items={[]}
                // buttonClassName={clsxm(
				// 	'py-0 font-medium',
				// 	items.length === 0 && ['py-2']
				// )}
				// value={teamItem}
				// onChange={onChangeActiveTeam}
				// items={items}
				// loading={teamsFetching}
			>
			</Dropdown>
		</>
	);
};
