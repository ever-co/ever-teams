import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

type SettingsFrameProps = PropsWithChildren<{
	navigation: ReactNode;
	className?: string;
}>;

export function SettingsFrame({ navigation, children, className }: SettingsFrameProps) {
	return (
		<div
			data-testid="settings-frame"
			className={cn(
				'grid w-full grid-cols-1 items-start gap-6 py-6 @3xl/page:grid-cols-[14rem_minmax(0,1fr)] @3xl/page:gap-8',
				className
			)}
		>
			<aside className="@3xl/page:sticky @3xl/page:top-6">{navigation}</aside>
			<section className="min-w-0 pb-8">{children}</section>
		</div>
	);
}
