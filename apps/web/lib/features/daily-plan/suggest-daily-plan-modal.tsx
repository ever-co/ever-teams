import { Modal, Card, Text } from 'lib/components';
import { Button } from '@components/ui/button';
import { useCallback, useMemo } from 'react';
import { DAILY_PLAN_SUGGESTION_MODAL_DATE } from '@app/constants';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuthenticateUser } from '@app/hooks';

interface ISuggestDailyPlanModalProps {
	closeModal: () => void;
	isOpen: boolean;
}

export function SuggestDailyPlanModal(props: ISuggestDailyPlanModalProps) {
	const { isOpen, closeModal } = props;

	const { user } = useAuthenticateUser();
	const name = useMemo(
		() => user?.name || user?.firstName || user?.lastName || user?.username || '',
		[user?.firstName, user?.lastName, user?.name, user?.username]
	);

	const t = useTranslations();

	const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);

	const handleCloseModal = useCallback(() => {
		localStorage.setItem(DAILY_PLAN_SUGGESTION_MODAL_DATE, currentDate);
		closeModal();
	}, [closeModal, currentDate]);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} showCloseIcon={false}>
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
