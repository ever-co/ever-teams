import { Modal, Card, Text } from '@/core/components';
import { Button } from '@/core/components/ui/button';
import { useCallback, useMemo } from 'react';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL
} from '@/core/constants/config/constants';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuthenticateUser, useTeamTasks, useTimer } from '@/core/hooks';
import { usePathname } from 'next/navigation';

interface ISuggestDailyPlanModalProps {
	closeModal: () => void;
	isOpen: boolean;
}

export function SuggestDailyPlanModal(props: ISuggestDailyPlanModalProps) {
	const { isOpen, closeModal } = props;
	const { hasPlan } = useTimer();
	const { activeTeam } = useTeamTasks();
	const { user } = useAuthenticateUser();
	const name = useMemo(
		() => user?.name || user?.firstName || user?.lastName || user?.username || '',
		[user?.firstName, user?.lastName, user?.name, user?.username]
	);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const path = usePathname();
	const t = useTranslations();

	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);

	const handleCloseModal = useCallback(() => {
		if (!requirePlan || (requirePlan && hasPlan)) {
			localStorage.setItem(HAS_SEEN_DAILY_PLAN_SUGGESTION_MODAL, currentDate);
		}
		if (path.split('/')[1] == 'profile') {
			if (!requirePlan || (requirePlan && hasPlan)) {
				localStorage.setItem(DAILY_PLAN_SUGGESTION_MODAL_DATE, currentDate);
			}
		}
		closeModal();
	}, [closeModal, currentDate, hasPlan, path, requirePlan]);

	return (
		<Modal
			closeOnOutsideClick={requirePlan}
			isOpen={isOpen}
			closeModal={handleCloseModal}
			showCloseIcon={requirePlan}
		>
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 text-center">
							{t('dailyPlan.CREATE_A_PLAN_FOR_TODAY')}
						</Text.Heading>

						<Text className="text-sm text-center text-gray-500">{t('dailyPlan.TODAY_PLAN_SUB_TITLE')}</Text>
						<Text className="text-sm text-center text-gray-500">
							{t('dailyPlan.DAILY_PLAN_DESCRIPTION')}
						</Text>
					</div>
					<Link href={`/profile/${user?.id}?name=${name || ''}`} className="flex flex-col w-full gap-3">
						<Button
							variant="default"
							className="p-7 font-normal rounded-xl text-md"
							onClick={handleCloseModal}
						>
							OK
						</Button>
					</Link>
				</div>
			</Card>
		</Modal>
	);
}
