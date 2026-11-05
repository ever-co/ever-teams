import { Switch } from '@headlessui/react';
import { useCallback, useEffect, useState } from 'react';
import { Text } from './typography';
import { useTranslations } from 'next-intl';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@/core/constants/config/constants';
import { useOrganizationEmployeeTeams, useEditOrganizationTeam } from '../../hooks/organizations';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { isTeamManagerMember } from '@/core/stores/teams/organization-team';
import { teamRosterOf } from '@/core/lib/utils/settings-team';
import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from './switch-recipes';

export { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE };

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
			const roster = teamRosterOf(activeTeam.members ?? [], isTeamManagerMember);
			await editOrganizationTeam({
				...activeTeam,
				shareProfileView: !enabled,
				memberIds: roster.memberIds,
				managerIds: roster.managerIds
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
			const roster = teamRosterOf(activeTeam.members ?? [], isTeamManagerMember);
			await editOrganizationTeam({
				...activeTeam,
				requirePlanToTrack: !enabled,
				memberIds: roster.memberIds,
				managerIds: roster.managerIds
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
