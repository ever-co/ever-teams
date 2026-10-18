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
				'fixed left-3 top-3 z-[55] !flex size-8 items-center justify-center rounded-md border border-border bg-background md:!hidden',
				isMobile && !openMobile ? '!flex' : '!hidden',
				className
			)}
		/>
	);
};

export default MainSidebarTrigger;
