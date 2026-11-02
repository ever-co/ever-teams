import { clsxm } from '@/core/lib/utils';

/** The email notice while its chunk loads: the `Notice` card with its mark, two lines, the link and the button. */
const UnverifiedEmailSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			aria-hidden="true"
			className={clsxm(
				'my-3 flex w-full items-center gap-3 rounded-xl bg-card px-3.5 py-3 hairline-ring ring-border shadow-sm shadow-black/6.5',
				className
			)}
		>
			<span className="size-[18px] shrink-0 animate-pulse rounded-full bg-foreground/[0.06]" />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<span className="h-2.5 w-48 max-w-full animate-pulse rounded-full bg-foreground/[0.07]" />
				<span className="h-2 w-64 max-w-full animate-pulse rounded-full bg-foreground/[0.05]" />
			</div>
			<span className="h-2 w-20 shrink-0 animate-pulse rounded-full bg-foreground/[0.05]" />
			<span className="h-7 w-24 shrink-0 animate-pulse rounded-full bg-foreground/[0.05]" />
		</div>
	);
};

export default UnverifiedEmailSkeleton;
