import { useEffect, useState } from 'react';
import { AddWorkTimeAndEstimatesToPlan } from 'lib/features/daily-plan/plans-work-time-and-estimate';
import {
	useDailyPlan,
	useUserProfilePage,
	useModal,
	useTimerView
} from '@app/hooks';

export function CheckPlans() {
	// const { user } = useAuthenticateUser();
	const prof = useUserProfilePage();
	const { isOpen, openModal, closeModal } = useModal();
	const { getEmployeeDayPlans, todayPlan } = useDailyPlan();
	// const modes = ['noPlan', 'noEstimation', 'idle'];
	// const [modeKey, setModeKey] = React.useState(0);
	// const { createDailyPlan, createDailyPlanLoading } = useDailyPlan();
	// const { activeTeam } = useTeamTasks();
	// const member = activeTeam?.members.find((member) => member.employee.userId === user?.id);
	const [canShowModal, setCanShowModal] = useState(false);

	const {
		startTimer, hasPlan
	} = useTimerView();

	useEffect(() => {
		const timer = setTimeout(() => {
			setCanShowModal(true);
		}, 10000);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		getEmployeeDayPlans(prof.member?.employeeId ?? '');
	}, [getEmployeeDayPlans, prof.member?.employeeId]);

	useEffect(() => {
		const today = new Date().toISOString().split('T')[0];
		const lastActionDate = localStorage.getItem('lastActionDate');
		const lastPlanedTimeDate = localStorage.getItem('lastPlanedTimeDate');

		if (canShowModal) {
			if (lastActionDate !== today && todayPlan?.length === 0) {
				localStorage.setItem('lastActionDate', today);
				openModal();
				// setModeKey(0);
			} else if (todayPlan?.length > 0 && lastPlanedTimeDate !== today) {
				localStorage.setItem('lastPlanedTimeDate', today);
				openModal();
				// setModeKey(1);
			}
		}

	}, [todayPlan, canShowModal, openModal]);

	// const createPlanRedirect = useCallback(
	// 	async (values: any) => {
	// 		hook.setTab("assigned");
	// 		const toDay = new Date();
	// 		createDailyPlan({
	// 			workTimePlanned: parseInt(values.workTimePlanned) || 0,
	// 			date: toDay,
	// 			status: DailyPlanStatusEnum.OPEN,
	// 			tenantId: user?.tenantId ?? '',
	// 			employeeId: member?.employeeId,
	// 			organizationId: member?.organizationId
	// 		}).then(() => {
	// 			closeModal();
	// 		});
	// 	},
	// 	[closeModal, createDailyPlan, member?.employeeId, member?.organizationId, user?.tenantId]
	// );

	return (
		<>
			<AddWorkTimeAndEstimatesToPlan
				closeModal={closeModal}
				open={isOpen}
				plan={todayPlan[0]}
				startTimer={startTimer}
				hasPlan={!!hasPlan}
				cancelBtn={true}
			/>
			{/* {
				modes[modeKey] === 'noPlan' ?
					(
						<Modal
							isOpen={isOpen}
							closeModal={closeModal}
							title={''}
							className="bg-light--theme-light flex top-[-100px] items-center dark:bg-dark--theme-light py-5 rounded-xl w-[70vw] h-[auto] justify-start"
							titleClass="text-[16px] font-bold"
						>
							<Card className="w-full" shadow="custom">
								<div className="flex items-center justify-between">
									<Text.Heading as="h3" className="mb-3 text-center">
										Please create a Plan for Today
									</Text.Heading>
									<ButtonPlan
										variant="default"
										className="p-7 font-normal rounded-xl text-md"
										disabled={createDailyPlanLoading}
										onClick={createPlanRedirect}
									>
										{createDailyPlanLoading && <ReloadIcon className="animate-spin mr-2 h-4 w-4" />}
										Create the Plan
									</ButtonPlan>
								</div>
							</Card>
						</Modal>
					)
					: modes[modeKey] === 'noEstimation' ? (
						<AddWorkTimeAndEstimatesToPlan
							closeModal={closeModal}
							open={isOpen}
							plan={todayPlan[0]}
							startTimer={startTimer}
							hasPlan={true}
							// cancelBtn={true}
						/>
					) : <></>
			} */}
		</>

	)
}