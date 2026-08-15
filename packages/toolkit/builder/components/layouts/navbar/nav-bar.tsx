import { cn, Dialog, ThemedButton } from '@ever-teams/toolkit-ui';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import NavLink from './nav-link';
import { TeamsLoginDialog, TeamsLoginForm, TeamsUserAvatar, useAccessToken, useAuthUser } from '@ever-teams/atoms';
import { TeamsLogo } from '../../icons/teams-logo';

interface NavItem {
	title: string;
	url?: string;
	isExternal?: boolean;
	hasSublinks?: boolean;
}

const NAV_ITEMS: NavItem[] = [];

export function Navbar({ className }: { className?: string }) {
	const [hidden, setHidden] = useState(false);
	const [isBlurred, setIsBlurred] = useState(false);
	const [selectedTab, setSelectedTab] = useState<number | null>(null);
	const { scrollY } = useScroll();
	const { accessToken: token } = useAccessToken();
	const { data: user } = useAuthUser(token);

	useMotionValueEvent(scrollY, 'change', (latest) => {
		const previous = scrollY.getPrevious();
		if (latest <= 50) {
			setIsBlurred(false);
		} else if (previous && latest > previous && latest > 180) {
			setHidden(true);
			setIsBlurred(true);
		} else {
			setHidden(false);
			setIsBlurred(true);
		}
	});

	return (
		<motion.header
			animate={hidden ? 'hidden' : 'visible'}
			variants={{
				visible: { opacity: 1, y: 0 },
				hidden: { opacity: 0, y: '-100%' }
			}}
			transition={{ duration: 0.45, ease: 'easeInOut' }}
			className={cn(
				'fixed top-0 left-0 right-0 z-50',
				isBlurred && 'backdrop-blur-lg border-b border-gray-200 dark:border-gray-800',
				className
			)}
		>
			{/* Gradient line */}
			<div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

			<div className="flex justify-center w-full px-6 py-4">
				<nav className="w-[85%] rounded-3xl backdrop-blur-md bg-white/80 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
					<div className="px-8 mx-auto">
						<div className="flex justify-between items-center h-16">
							<motion.div
								initial={{ opacity: 0, y: -20 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex items-center gap-8"
							>
								<div className="text-slate-900 dark:text-white">
									<TeamsLogo />
								</div>
								<div className="flex items-center gap-2">
									{NAV_ITEMS.map((item, index) => (
										<NavLink
											key={item.title}
											{...item}
											isSelected={selectedTab === index}
											onMouseEnter={() => setSelectedTab(index)}
										/>
									))}
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								className="flex items-center gap-4"
							>
								<TeamsLoginDialog />
							</motion.div>
						</div>
					</div>
				</nav>
			</div>
		</motion.header>
	);
}
