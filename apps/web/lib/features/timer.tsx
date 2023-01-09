import clsxm from '@app/utils/clsxm';
import { Button, Text } from 'lib/components';
import { TimerPlayIcon } from 'lib/components/svgs';

export function Timer({ className }: { className?: string }) {
	return (
		<div className={clsxm('flex flex-row', className)}>
			<div className="border-r-[2px] dark:border-r-[#28292F] pr-5">
				<div className="w-[186px]">
					<Text.Heading as="h3" className="text-4xl tracking-wide font-normal">
						00:00:00<span className="text-sm">:00</span>
					</Text.Heading>
					<div className="bg-[#F0F0F0] dark:bg-[#2B303B] h-2 mt-2 rounded-md w-full" />
				</div>
			</div>

			<div className="ml-5">
				<Button
					className={clsxm(
						'bg-primary dark:bg-[#1E2430] w-14 h-14 rounded-full inline-block min-w-[14px] !px-0 !py-0',
						'flex justify-center items-center dark:border-[#28292F] dark:border',
						'shadow-primary/40 shadow-xl drop-shadow-2xl dark:shadow-none'
					)}
				>
					<TimerPlayIcon />
				</Button>
			</div>
		</div>
	);
}
