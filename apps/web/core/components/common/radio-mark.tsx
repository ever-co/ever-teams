import { cn } from '@/core/lib/helpers';

/** A round radio mark: a choice among several, never a checkbox. */
export function RadioMark({ isChecked }: Readonly<{ isChecked: boolean }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'flex size-4 shrink-0 items-center justify-center rounded-full transition-colors',
				isChecked && 'bg-primary shadow-sm shadow-black/15',
				!isChecked && 'bg-card hairline-ring ring-foreground/25'
			)}
		>
			{isChecked && <span className="size-1.5 rounded-full bg-primary-foreground" />}
		</span>
	);
}
