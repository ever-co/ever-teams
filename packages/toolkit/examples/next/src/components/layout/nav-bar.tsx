'use client';
import {
	TeamsButton,
	TeamsLanguageSwitch,
	TodayTimeDisplayer,
	useTeamsContext,
	TeamsLoginDialog,
	ThemeToggle,
	useTimer
} from '@ever-teams/atoms';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../ui/logo';

const NAV_ITEMS: {
	href: string;
	label: React.ReactNode;
	external?: boolean;
}[] = [{ href: 'https://ever.team', label: 'What is Teams ?', external: true }];

const Timer = () => {
	const { isRunning, startTimer, stopTimer, timerLoading, todayTrackedTime } = useTimer();
	return (
		<div className="flex justify-center items-center gap-1 border dark:border-slate-800 rounded-3xl  dark:shadow-white/10 shadow-md px-2 py-2">
			<TeamsButton
				timerLoading={timerLoading}
				startTimer={startTimer}
				stopTimer={stopTimer}
				isRunning={isRunning}
				variant="default"
				size="sm"
				className="w-8 h-8"
			/>

			<TodayTimeDisplayer
				todayTrackedTime={todayTrackedTime}
				className="border-l-[1px] border-gray-200 dark:border-slate-800 pl-1"
				fontSize={16}
			/>
		</div>
	);
};

const NavBar = () => {
	const pathName = usePathname();
	const { authenticatedUser: user } = useTeamsContext();

	return (
		<header className=" container bg-white/90 dark:bg-black/90 sticky mb-8 top-8 left-0 right-0 rounded-3xl  z-50 backdrop-blur-md flex h-[64px] items-center justify-between px-8  border border-slate-200 dark:border-slate-800">
			<div className="flex gap-9">
				<Link href={'/'}>
					<Logo />
				</Link>
			</div>

			<div className="flex gap-7 items-center text-sm font-normal text-black/50 dark:text-white/50 ">
				<Link
					href={'/'}
					className={`${pathName == '/' ? 'font-bold text-black dark:text-white' : ''} hover:text-black hover:dark:text-white flex gap-[2px]`}
				>
					Showcase
				</Link>

				{user && (
					<>
						<Link
							href={'/time/time-tracker'}
							className={` ${pathName.includes('/time/time-tracker') ? 'font-bold text-black dark:text-white' : ''} hover:text-black hover:dark:text-white flex gap-[2px]`}
						>
							Track time
						</Link>
						<Link
							href={'/reports/employee'}
							className={` ${pathName.includes('/reports/employee') ? 'font-bold text-black dark:text-white' : ''} hover:text-black hover:dark:text-white flex gap-[2px]`}
						>
							Employee reports
						</Link>
						<Link
							href={'/reports/manager'}
							className={` ${pathName.includes('/reports/manager') ? 'font-bold text-black dark:text-white' : ''} hover:text-black hover:dark:text-white flex gap-[2px]`}
						>
							Manager reports
						</Link>
					</>
				)}
				<Link
					href={'/replay'}
					className={` ${pathName.includes('/replay') ? 'font-bold text-black dark:text-white' : ''} hover:text-black hover:dark:text-white flex gap-[2px]`}
				>
					Replays
				</Link>
				{NAV_ITEMS.map(({ href, label, external }) => (
					<Link
						key={href}
						href={href}
						className={`${pathName.includes(href) ? 'font-bold text-black dark:text-white' : ''} hover:text-black hover:dark:text-white flex gap-[2px]`}
						{...(external && { target: '_blank', rel: 'noopener noreferrer' })}
					>
						{label}
						{external && (
							<svg aria-hidden="true" height="7" fill="currentColor" viewBox="0 0 6 6" width="7">
								<path
									d="M1.25215 5.54731L0.622742 4.9179L3.78169 1.75597H1.3834L1.38936 0.890915H5.27615V4.78069H4.40513L4.41109 2.38538L1.25215 5.54731Z"
									fill="#8a8a8a"
								></path>
							</svg>
						)}
					</Link>
				))}
			</div>
			<div>
				<div className="flex items-center gap-4">
					{/* <TeamsThemeToggle size={'sm'} /> */}
					{user && <Timer />}

					<TeamsLanguageSwitch />
					<ThemeToggle />
					<TeamsLoginDialog />
				</div>
			</div>
		</header>
	);
};

export default NavBar;
