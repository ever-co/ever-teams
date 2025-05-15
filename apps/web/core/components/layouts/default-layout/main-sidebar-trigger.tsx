import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { SidebarTrigger, useSidebar } from '@/core/components/common/sidebar';
interface MainSidebarTriggerProps {
	className?: string;
}
const MainSidebarTrigger: FC<MainSidebarTriggerProps> = ({ className }) => {
	const { isMobile, openMobile } = useSidebar();
	return (
		<SidebarTrigger
			className={cn(
				'size-7 !bg-[#1C75FD] fixed left-[4%] top-[11%] !flex md:!hidden items-center justify-center !rounded-full transition-all duration-300 filter drop-shadow-[0px_0px_6px_rgba(28,117,253,0.30)] z-[55]',
				isMobile && !openMobile ? '!flex' : '!hidden',
				className
			)}
		/>
	);
};

export default MainSidebarTrigger;
