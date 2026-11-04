import { Switch } from '@headlessui/react';
import { useCallback, useEffect, useState } from 'react';
import { Text } from './typography';
import { useTranslations } from 'next-intl';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@/core/constants/config/constants';
import { useOrganizationEmployeeTeams, useEditOrganizationTeam } from '../../hooks/organizations';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { ERoleName } from '@/core/types/generics/enums/role';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';

export const SWITCH_TRACK_RECIPE =
	'group relative inline-flex h-6 w-10.5 shrink-0 cursor-pointer items-center rounded-full hairline-border border-transparent bg-foreground/10 p-0.5 shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-checked:bg-primary dark:ring-foreground/15';

export const SWITCH_THUMB_RECIPE =
	'pointer-events-none block size-4.5 rounded-full bg-white shadow-sm shadow-black/15 transition-transform duration-200 group-data-checked:translate-x-4.5';

export default function TimeTrackingToggle({ activeManager }: { activeManager: IEmployee | undefined }) {
	const t = useTranslations();
	const [enabled, setEnabled] = useState(activeManager?.isTrackingEnabled);

	const { updateOrganizationTeamEmployee } = useOrganizationEmployeeTeams();

	const activeTeam = useAtomValue(activeTeamState);

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
		<div className="flex items-center gap-x-2.5">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={SWITCH_TRACK_RECIPE}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span aria-hidden="true" className={SWITCH_THUMB_RECIPE} />
			</Switch>
			<Text className="text-sm text-muted-foreground">
				{enabled ? t('common.ACTIVATED') : t('common.DEACTIVATED')}
			</Text>
		</div>
	);
}

export function ShareProfileViewsToggle() {
	const t = useTranslations();

	const activeTeam = useAtomValue(activeTeamState);
	const { editOrganizationTeam } = useEditOrganizationTeam();
	const [enabled, setEnabled] = useState<boolean | undefined>(activeTeam?.shareProfileView);

	const handleChange = useCallback(async () => {
		if (activeTeam && typeof enabled != 'undefined') {
			await editOrganizationTeam({
				...activeTeam,
				shareProfileView: !enabled,
				memberIds: activeTeam.members
					?.map((t) => t.employee?.id || '')
					.filter((value: string, index: number, array: string[]) => array.indexOf(value) === index),
				managerIds: activeTeam.members
					?.filter(
						(m) =>
							m.role &&
							(m.role.name === ERoleName.MANAGER ||
								m.role.name === ERoleName.SUPER_ADMIN ||
								m.role.name === ERoleName.ADMIN)
					)
					.map((t) => t.employee?.id || '')
					.filter((value: string, index: number, array: string[]) => array.indexOf(value) === index)
			});
			setEnabled(!enabled);
		}
	}, [activeTeam, editOrganizationTeam, enabled]);

	useEffect(() => {
		setEnabled(activeTeam?.shareProfileView);
	}, [activeTeam?.shareProfileView]);

	return (
		<div className="flex items-center gap-x-2.5">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={SWITCH_TRACK_RECIPE}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span aria-hidden="true" className={SWITCH_THUMB_RECIPE} />
			</Switch>
			<Text className="text-sm text-muted-foreground">
				{enabled ? t('common.ACTIVATED') : t('common.DEACTIVATED')}
			</Text>
		</div>
	);
}

export function RequireDailyPlanToTrack() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const { editOrganizationTeam } = useEditOrganizationTeam();
	const [enabled, setEnabled] = useState<boolean | undefined>(activeTeam?.requirePlanToTrack);

	const handleChange = useCallback(async () => {
		if (activeTeam && typeof enabled != 'undefined') {
			await editOrganizationTeam({
				...activeTeam,
				requirePlanToTrack: !enabled,
				memberIds: activeTeam.members
					?.map((t) => t.employee?.id || '')
					.filter((value: string, index: number, array: string[]) => array.indexOf(value) === index),
				managerIds: activeTeam.members
					?.filter(
						(m) =>
							m.role &&
							(m.role.name === ERoleName.MANAGER ||
								m.role.name === ERoleName.SUPER_ADMIN ||
								m.role.name === ERoleName.ADMIN)
					)
					.map((t) => t.employee?.id || '')
					.filter((value: string, index: number, array: string[]) => array.indexOf(value) === index)
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
		<div className="flex items-center gap-x-2.5">
			<Switch
				checked={enabled}
				onChange={() => {
					handleChange();
				}}
				className={SWITCH_TRACK_RECIPE}
			>
				<span className="sr-only">{t('common.USE_SETTING')}</span>
				<span aria-hidden="true" className={SWITCH_THUMB_RECIPE} />
			</Switch>
			<Text className="text-sm text-muted-foreground">
				{enabled ? t('common.ACTIVATED') : t('common.DEACTIVATED')}
			</Text>
		</div>
	);
}
