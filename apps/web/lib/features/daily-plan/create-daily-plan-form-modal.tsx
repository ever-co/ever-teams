import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useRecoilState } from 'recoil';
import { DailyPlanStatusEnum, IDailyPlanMode } from '@app/interfaces';
import { useDailyPlan, useRefetchData } from '@app/hooks';
import { userState } from '@app/stores';
import { Button, Card, InputField, Modal, Text } from 'lib/components';

export function CreateDailyPlanFormModal({
	open,
	closeModal,
	taskId,
	planMode
}: {
	open: boolean;
	closeModal: () => void;
	taskId: string;
	planMode: IDailyPlanMode;
}) {
	const [user] = useRecoilState(userState);
	const { handleSubmit, reset, register } = useForm();
	const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();
	const { refetch } = useRefetchData();

	const onSubmit = useCallback(
		async (values: any) => {
			const toDay = new Date();
			createDailyPlan({
				workTimePlanned: parseInt(values.workTimePlanned),
				taskId,
				date: planMode == 'today' ? toDay : new Date(toDay.getDate() + 1),
				status: DailyPlanStatusEnum.OPEN,
				tenantId: user?.tenantId,
				employeeId: user?.employee.id,
				organizationId: user?.employee.organizationId
			}).then(() => {
				refetch();
				reset();
				closeModal();
			});
		},
		[
			createDailyPlan,
			taskId,
			planMode,
			user?.tenantId,
			user?.employee.id,
			user?.employee.organizationId,
			refetch,
			reset,
			closeModal
		]
	);
	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px] relative" autoComplete="off" onClick={handleSubmit(onSubmit)}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						{/* Form header */}
						<div className="mb-7">
							<Text.Heading as="h3" className="mb-3 text-center">
								CREATE DAILY PLAN
							</Text.Heading>

							<Text className="text-sm text-center text-gray-500">You are creating a new plan</Text>
						</div>

						{/* Form Fields */}
						<div className="flex flex-col w-full gap-3">
							<InputField
								type="number"
								placeholder="Working time to plan"
								className="mb-0 min-w-[350px]"
								wrapperClassName="mb-0 rounded-lg"
								required
								// {...register('workTimePlanned')}
							/>
							<Button
								variant="primary"
								type="submit"
								className="p-4 font-normal rounded-xl text-md"
								disabled={createDailyPlanLoading}
								loading={createDailyPlanLoading}
							>
								Create Plan
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
