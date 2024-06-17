import { pad } from '@app/helpers/number';
import { useModal } from '@app/hooks';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { useTimer } from '@app/hooks/features/useTimer';
import { ProgressBar } from '@components/ui/progress-bar';
import { PauseIcon } from '@components/ui/svgs/pause-icon';
import { PlayIcon } from '@components/ui/svgs/play-icon';
import { AddWorkTimeAndEstimatesToPlan } from 'lib/features/daily-plan/plans-work-time-and-estimate';
import { useTranslations } from 'next-intl';

const Timer = () => {
	const t = useTranslations();
	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus,
		timerStatusFetching,
		startTimer,
		stopTimer,
		canRunTimer,
		isPlanVerified,
		hasPlan,
		timerSeconds
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const { closeModal, isOpen, openModal } = useModal();

	const timerHanlder = () => {
		if (timerStatusFetching || !canRunTimer) return;
		if (timerStatus?.running) {
			stopTimer();
		} else {
			if (!isPlanVerified) {
				openModal();
			} else {
				startTimer();
			}
		}
	};

	return (
		<>
			<div className="flex flex-col min-w-[300px]">
				<h1 className="text-[53px] text-primary dark:text-[#FFFFFF]">
					{pad(hours)} : {pad(minutes)} : {pad(seconds)}:
					<span className="text-[35px] w-7 inline-block">{pad(ms_p)}</span>
				</h1>
				<ProgressBar width={284} progress={`${activeTaskEstimation}%`} />
			</div>
			<div
				title={timerStatusFetching || !canRunTimer ? t('timer.START_TIMER') : undefined}
				className={`cursor-pointer ${timerStatusFetching || !canRunTimer ? 'opacity-30' : ''}`}
				onClick={!timerStatusFetching ? timerHanlder : undefined}
			>
				{timerStatus?.running ? <PauseIcon width={68} height={68} /> : <PlayIcon width={68} height={68} />}
			</div>
			<AddWorkTimeAndEstimatesToPlan closeModal={closeModal} open={isOpen} plan={hasPlan} />
		</>
	);
};

export default Timer;
