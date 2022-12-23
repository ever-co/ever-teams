import { secondsToTime } from '@app/helpers/date';
import { useTimer } from '@app/hooks/features/useTimer';

export function Worked24Hours({ isAuthUser }: { isAuthUser: boolean }) {
	const { timerStatus } = useTimer();
	const { h, m } = secondsToTime(timerStatus?.duration || 0);
	if (!isAuthUser) {
		return (
			<div className="w-[177px] text-center">
				{0}h:{0}m
			</div>
		);
	}

	return (
		<div className="w-[177px] text-center ">
			{h}h:{m}m
		</div>
	);
}
