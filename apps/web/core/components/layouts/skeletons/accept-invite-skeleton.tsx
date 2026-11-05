import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

const FORM_FIELDS = 3;

export function AcceptInviteSkeleton() {
	const fieldKeys = Array.from({ length: FORM_FIELDS }, (_, index) => index);
	return (
		<div aria-hidden="true" className="flex w-full flex-col">
			<div className="size-11 animate-pulse rounded-xl bg-foreground/[0.06]" />
			<div className={cn(BAR, 'mt-5 h-5 w-3/4')} />
			<div className={cn(BAR, 'mt-3 h-3 w-full')} />
			<div className="mt-8 flex flex-col gap-5">
				{fieldKeys.map((key) => (
					<div key={key} className="flex flex-col gap-2">
						<div className={cn(BAR, 'h-3 w-24')} />
						<div className="h-9 animate-pulse rounded-md bg-foreground/[0.04] max-sm:h-11" />
					</div>
				))}
				<div className="h-9 animate-pulse rounded-full bg-foreground/[0.06] max-sm:h-11" />
			</div>
		</div>
	);
}
