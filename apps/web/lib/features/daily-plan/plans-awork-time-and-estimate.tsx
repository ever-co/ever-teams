import { IDailyPlan, OT_Member } from '@app/interfaces';
import { Card, InputField, Modal, Text } from 'lib/components';
import { useState } from 'react';
import { useTranslations } from 'use-intl';

export function AddWorkTimeAndEstimatesToPlan({
	open,
	closeModal,
	plan,
	employee
}: {
	open: boolean;
	closeModal: () => void;
	plan?: IDailyPlan;
	employee?: OT_Member;
}) {
	const [workTimePlanned, setworkTimePlanned] = useState<number>(0);
	const t = useTranslations();

	return (
		<Modal isOpen={open} closeModal={closeModal} className="w-[98%] md:w-[530px] relative">
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<div className="mb-7">
						<Text.Heading as="h3" className="mb-3 text-center">
							{t('timer.todayPlanSettings.TITLE')}
						</Text.Heading>
					</div>
					<div className="mb-5 w-full flex flex-col gap-4">
						<span>{t('timer.todayPlanSettings.WORK_TIME_PLANNED')}</span>
						<InputField
							type="number"
							placeholder={t('timer.todayPlanSettings.WORK_TIME_PLANNED_PLACEHOLDER')}
							className="mb-0 min-w-[350px]"
							wrapperClassName="mb-0 rounded-lg"
							onChange={(e) => setworkTimePlanned(parseFloat(e.target.value))}
							required
						/>
					</div>
				</div>
			</Card>
		</Modal>
	);
}
