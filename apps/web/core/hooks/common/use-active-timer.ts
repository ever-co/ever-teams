import { useAtom } from 'jotai';
import { activeTimerState } from '@/core/stores/active-timer';

export const useActiveTimer = () => {
	const [activeTimer, setActiveTimer] = useAtom(activeTimerState);

	return { activeTimer, setActiveTimer };
};
