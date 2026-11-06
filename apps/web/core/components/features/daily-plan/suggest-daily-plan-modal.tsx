import { useCallback, useMemo } from 'react';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL
} from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useTimerPlanStatus } from '@/core/hooks/timer';
import { usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import {
	APP_DIALOG_BODY,
	APP_DIALOG_FOOTER,
	AppDialog,
	AppDialogDescription,
	AppDialogHeader
} from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { HueIconTile } from '@/core/components/common/value-glyphs';
import { TaskDaily } from '@/core/components/icons';
import { teamImageOf } from '@/core/components/projects/project-cells';
import { cn } from '@/core/lib/helpers';
import { activeTeamState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

interface ISuggestDailyPlanModalProps {
	closeModal: () => void;
	isOpen: boolean;
	/** Plans the timer's task for today in place; without it the button opens the profile's plans. */
	onPlanDay?: () => void;
}

export function SuggestDailyPlanModal(props: ISuggestDailyPlanModalProps) {
	const { isOpen, closeModal, onPlanDay } = props;
	const { hasPlan } = useTimerPlanStatus();

	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const name = useMemo(
		() => user?.name || user?.firstName || user?.lastName || user?.username || '',
		[user?.firstName, user?.lastName, user?.name, user?.username]
	);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const path = usePathname();
	const t = useTranslations();

	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);

	const handleCloseModal = useCallback(() => {
		const isPlanOptional = !requirePlan;
		const hasRequiredPlan = Boolean(requirePlan) && Boolean(hasPlan);
		const canStopSuggesting = isPlanOptional || hasRequiredPlan;
		if (canStopSuggesting) {
			localStorage.setItem(HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL, currentDate);
		}
		const firstPathSegment = path.split('/')[1];
		const isOnProfilePage = firstPathSegment === 'profile';
		if (isOnProfilePage) {
			if (canStopSuggesting) {
				localStorage.setItem(DAILY_PLAN_SUGGESTION_MODAL_DATE, currentDate);
			}
		}
		closeModal();
	}, [closeModal, currentDate, hasPlan, path, requirePlan]);

	const planDayHere = useCallback(() => {
		handleCloseModal();
		onPlanDay?.();
	}, [handleCloseModal, onPlanDay]);

	const isDismissible = Boolean(requirePlan);
	let closeFromHeader: (() => void) | undefined;
	if (isDismissible) {
		closeFromHeader = handleCloseModal;
	}

	const teamContext = activeTeam && (
		<>
			<EntityTile
				name={activeTeam.name}
				color={activeTeam.color}
				imageUrl={teamImageOf(activeTeam)}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{activeTeam.name}</span>
		</>
	);

	return (
		<AppDialog open={isOpen} onClose={handleCloseModal} width="sm" dismissible={isDismissible}>
			<AppDialogHeader
				title={t('dailyPlan.CREATE_A_PLAN_FOR_TODAY')}
				context={teamContext}
				onClose={closeFromHeader}
			/>
			<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
				<div className="flex items-start gap-3 pt-1">
					<HueIconTile hue="primary">
						<TaskDaily />
					</HueIconTile>
					<div className="flex min-w-0 flex-col gap-0.5">
						<AppDialogDescription className="text-[13px] font-medium text-foreground">
							{t('dailyPlan.TODAY_PLAN_SUB_TITLE')}
						</AppDialogDescription>
						<p className="text-[13px] text-muted-foreground">{t('dailyPlan.DAILY_PLAN_DESCRIPTION')}</p>
					</div>
				</div>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				{onPlanDay && (
					<Button
						type="button"
						size="default"
						className="ml-auto"
						onClick={planDayHere}
						data-initial-focus=""
					>
						{t('modals.dailyPlan.planMyDay')}
					</Button>
				)}
				{!onPlanDay && (
					<Button asChild size="default" className="ml-auto">
						<Link
							href={`/profile/${user?.id}?name=${name || ''}`}
							onClick={handleCloseModal}
							data-initial-focus=""
						>
							{t('modals.dailyPlan.planMyDay')}
						</Link>
					</Button>
				)}
			</div>
		</AppDialog>
	);
}
