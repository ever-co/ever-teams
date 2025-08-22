import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';

export function Worked24Hours({ isAuthUser }: { isAuthUser: boolean }) {
	const timerStatus = useAtomValue(timerStatusState);
	const { hours: h, minutes: m } = secondsToTime(timerStatus?.duration || 0);
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
