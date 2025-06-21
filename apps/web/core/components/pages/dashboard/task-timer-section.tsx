import dynamic from 'next/dynamic';
import TimerSkeleton from '@/core/components/common/skeleton/timer-skeleton';
import { EverCard } from '@/core/components/common/ever-card';
import { clsxm } from '@/core/lib/utils';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AuthUserTaskInputSkeleton } from '../../common/skeleton/auth-user-task-input-skeleton';

const AuthUserTaskInput = dynamic(
	() => import('@/core/components/auth/auth-user-task-input').then((mod) => ({ default: mod.AuthUserTaskInput })),
	{
		ssr: false,
		loading: () => <AuthUserTaskInputSkeleton />
	}
);
const Timer = dynamic(() => import('@/core/components/timer/timer').then((mod) => ({ default: mod.Timer })), {
	ssr: false,
	loading: () => <TimerSkeleton />
});
export function TaskTimerSection({ isTrackingEnabled }: Readonly<{ isTrackingEnabled: boolean }>) {
	const [showInput, setShowInput] = useState(false);
	return (
		<EverCard
			shadow="bigger"
			className={clsxm(
				'w-full flex lg:flex-row gap-4 lg:gap-4 xl:gap-6 max-w-full flex-col-reverse justify-center md:justify-between items-center py-4 mb-2',
				'border-[#00000008]  border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22] md:px-4'
			)}
		>
			<AuthUserTaskInput
				className={clsxm(
					'w-full lg:basis-3/4 grow max-w-[72%]',
					!showInput && '!hidden md:!flex',
					!isTrackingEnabled && 'md:w-full'
				)}
			/>
			<div
				onClick={() => setShowInput((p) => !p)}
				className="border dark:border-[#26272C] w-full rounded p-2 md:hidden flex justify-center mt-2"
			>
				<ChevronDown className={clsxm('h-12  transition-all', showInput && 'rotate-180')}>
					{showInput ? 'hide the issue input' : 'show the issue input'}
				</ChevronDown>
			</div>
			{isTrackingEnabled ? (
				<div className="w-full max-w-fit lg:basis-1/4 grow">
					<Timer />
				</div>
			) : null}
		</EverCard>
	);
}
