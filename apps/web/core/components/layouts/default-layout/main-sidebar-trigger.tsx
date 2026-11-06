import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { SidebarTrigger, useSidebar } from '@/core/components/common/sidebar';

interface MainSidebarTriggerProps {
	className?: string;
}

/** Opens the sidebar sheet on phones; from md up the sidebar carries its own collapse button. */
const MainSidebarTrigger: FC<MainSidebarTriggerProps> = ({ className }) => {
	const { isMobile } = useSidebar();

	if (!isMobile) {
		return null;
	}

	return <SidebarTrigger className={cn('-ml-1 size-8 shrink-0', className)} />;
};

export default MainSidebarTrigger;
