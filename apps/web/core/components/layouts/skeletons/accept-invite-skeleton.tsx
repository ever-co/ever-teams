import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const FORM_FIELDS = 3;

/** The invitation form: the centred heading, then the card with its fields and the terms row. */
export function AcceptInviteSkeleton() {
	const fieldKeys = Array.from({ length: FORM_FIELDS }, (_, index) => index);
	return (
		<div className="mx-auto flex w-full max-w-sm flex-col gap-6">
			<div className="flex w-full flex-col items-center gap-2">
				<div className={cn(BAR, 'h-6 w-3/4')} />
				<div className={cn(BAR, 'h-4 w-full')} />
			</div>
			<div className="w-full rounded-xl bg-card p-5 hairline-ring ring-border shadow-sm shadow-black/6.5 md:p-6">
				<div className="flex flex-col items-center gap-4">
					<div className="flex w-full flex-col items-center gap-5">
						<div className={cn(BAR, 'h-4 w-24')} />
						<div className="flex w-full flex-col gap-4">
							{fieldKeys.map((key) => (
								<div key={key} className={cn(BAR, 'h-9 w-full')} />
							))}
						</div>
					</div>
					<div className="flex w-full items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<div className={cn(BAR, 'size-4 rounded-sm')} />
							<div className={cn(BAR, 'h-4 w-40')} />
						</div>
						<div className={cn(BAR, 'h-9 w-28 shrink-0')} />
					</div>
				</div>
			</div>
		</div>
	);
}
