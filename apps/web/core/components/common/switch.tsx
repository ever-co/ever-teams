import { IOrganizationTeamMember, RoleNameEnum } from '@/core/types/interfaces/to-review';
import { Switch } from '@headlessui/react';
import { useCallback, useEffect, useState } from 'react';
import { Text } from './typography';
import { useTranslations } from 'next-intl';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@/core/constants/config/constants';
import { useOrganizationEmployeeTeams, useOrganizationTeams } from '../../hooks/organizations';

export default function TimeTrackingToggle({ activeManager }: { activeManager: IOrganizationTeamMember | undefined }) {
	const t = useTranslations();
	const [enabled, setEnabled] = useState(activeManager?.isTrackingEnabled);

	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();
	const { activeTeam } = useOrganizationTeams();

	const handleChange = useCallback(() => {
		if (activeManager && activeTeam) {
			updateOrganizationTeamEmployee(activeManager.id, {
				organizationId: activeManager.organizationId,
				organizationTeamId: activeTeam.id,
				isTrackingEnabled: !enabled
			});
		}
		setEnabled(!enabled);
	}, [updateOrganizationTeamEmployee, enabled, activeManager, activeTeam]);

	useEffect(() => {
		setEnabled(activeManager?.isTrackingEnabled);
	}, [activeManager]);

	return (
		<div className="flex items-center gap-x-[10px]">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span
					aria-hidden="true"
					className={`${enabled ? 'translate-x-9 bg-[#3826A6]' : 'bg-white translate-x-1'}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-[#3826A6] shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 ">{enabled ? t('common.ACTIVATED') : t('common.DEACTIVATED')}</Text>
		</div>
	);
}

export function ShareProfileViewsToggle() {
	const t = useTranslations();
	const { activeTeam, editOrganizationTeam } = useOrganizationTeams();
	const [enabled, setEnabled] = useState<boolean | undefined>(activeTeam?.shareProfileView);

	const handleChange = useCallback(async () => {
		if (activeTeam && typeof enabled != 'undefined') {
			await editOrganizationTeam({
				...activeTeam,
				shareProfileView: !enabled,
				memberIds: activeTeam.members
					.map((t) => t.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index),
				managerIds: activeTeam.members
					.filter(
						(m) =>
							m.role &&
							(m.role.name === RoleNameEnum.MANAGER ||
								m.role.name === RoleNameEnum.SUPER_ADMIN ||
								m.role.name === RoleNameEnum.ADMIN)
					)
					.map((t) => t.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index)
			});
			setEnabled(!enabled);
		}
	}, [activeTeam, editOrganizationTeam, enabled]);

	useEffect(() => {
		setEnabled(activeTeam?.shareProfileView);
	}, [activeTeam?.shareProfileView]);

	return (
		<div className="flex items-center gap-x-[10px]">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span
					aria-hidden="true"
					className={`${enabled ? 'translate-x-9 bg-[#3826A6]' : 'bg-white translate-x-1'}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-[#3826A6] shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 ">{enabled ? t('common.ACTIVATED') : t('common.DEACTIVATED')}</Text>
		</div>
	);
}

export function RequireDailyPlanToTrack() {
	const t = useTranslations();
	const { activeTeam, editOrganizationTeam } = useOrganizationTeams();
	const [enabled, setEnabled] = useState<boolean | undefined>(activeTeam?.requirePlanToTrack);

	const handleChange = useCallback(async () => {
		if (activeTeam && typeof enabled != 'undefined') {
			await editOrganizationTeam({
				...activeTeam,
				requirePlanToTrack: !enabled,
				memberIds: activeTeam.members
					.map((t) => t.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index),
				managerIds: activeTeam.members
					.filter(
						(m) =>
							m.role &&
							(m.role.name === RoleNameEnum.MANAGER ||
								m.role.name === RoleNameEnum.SUPER_ADMIN ||
								m.role.name === RoleNameEnum.ADMIN)
					)
					.map((t) => t.employee.id)
					.filter((value, index, array) => array.indexOf(value) === index)
			});
			setEnabled(!enabled);
			if (!enabled) {
				localStorage.removeItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
			}
		}
	}, [activeTeam, editOrganizationTeam, enabled]);

	useEffect(() => {
		setEnabled(activeTeam?.requirePlanToTrack);
	}, [activeTeam?.requirePlanToTrack]);

	return (
		<div className="flex items-center gap-x-[10px]">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={`${enabled ? 'bg-[#DBD3FA]' : 'bg-[#80808061]'}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span
					aria-hidden="true"
					className={`${enabled ? 'translate-x-9 bg-[#3826A6]' : 'bg-white translate-x-1'}
            pointer-events-none inline-block h-[30px] w-[30px] mt-[2.5px] transform rounded-full bg-[#3826A6] shadow-lg ring-0 transition duration-200 ease-in-out`}
				/>
			</Switch>
			<Text className="text-gray-400 ">{enabled ? t('common.ACTIVATED') : t('common.DEACTIVATED')}</Text>
		</div>
	);
}
