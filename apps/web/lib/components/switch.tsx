import { useCallback, useEffect, useState } from 'react';
import { Switch } from '@headlessui/react';
import { Text } from './typography';
import { OT_Member } from '@app/interfaces';
import { useOrganizationEmployeeTeams } from '@app/hooks/features/useOrganizatioTeamsEmployee';
import { useOrganizationTeams } from '@app/hooks';

export default function TimeTrackingToggle({
	activeManager,
}: {
	activeManager: OT_Member | undefined;
}) {
	const [enabled, setEnabled] = useState(activeManager?.isTrackingEnabled);

	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { activeTeam } = useOrganizationTeams();

	const handleChange = useCallback(() => {
		if (activeManager && activeTeam) {
			updateOrganizationTeamEmployee(activeManager.id, {
				organizationId: activeManager.organizationId,
				organizationTeamId: activeTeam.id,
				isTrackingEnabled: !enabled,
			});
		}
		setEnabled(!enabled);
	}, [updateOrganizationTeamEmployee, enabled, activeManager, activeTeam]);

	useEffect(() => {
		setEnabled(activeManager?.isTrackingEnabled);
	}, [activeManager]);

	return (
		<div className="py-16 flex items-center gap-x-[10px]">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span className="sr-only">Use setting</span>
				<span
					aria-hidden="true"
					className={`${
						enabled ? 'translate-x-9 bg-[#3826A6]' : 'translate-x-1'
					}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 ">
				{enabled ? 'Activated' : 'Deactivated'}
			</Text>
		</div>
	);
}
