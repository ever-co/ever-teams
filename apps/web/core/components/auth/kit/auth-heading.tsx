import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

export function AuthMark({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'keycap-3d flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground [&_svg]:size-5',
				className
			)}
		>
			{children}
		</span>
	);
}

export function AuthHeading({
	mark,
	title,
	description,
	switchLine,
	className
}: Readonly<{
	mark?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	switchLine?: ReactNode;
	className?: string;
}>) {
	return (
		<header className={cn('flex flex-col', className)}>
			{mark && <div className="mb-5 flex">{mark}</div>}
			<h1 className="text-xl font-semibold text-balance text-foreground">{title}</h1>
			{description && <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</p>}
			{switchLine && <p className="mt-3 text-[13px] text-muted-foreground">{switchLine}</p>}
		</header>
	);
}
