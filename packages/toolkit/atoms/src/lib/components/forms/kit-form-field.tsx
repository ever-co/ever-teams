import { useId } from 'react';
import { cn, Input, type IInputProps } from '@ever-teams/toolkit-ui';
import { KIT_NOTICE_SURFACE, kitNoticeTone } from '@components/teams-ui-components/notice-surface';

// The field surface of the design system at the height of sign-in forms: the ring draws the edge at rest, the border
// shows on focus with a soft halo. The input keeps its own radius, padding and light background.
const FIELD_SURFACE = cn(
	'h-9 border-transparent text-sm text-foreground shadow-sm shadow-black/10',
	'ring-1 ring-foreground/10 outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/75',
	'focus-visible:border-foreground/35 focus-visible:ring-[3px] focus-visible:ring-ring/25',
	'dark:border-transparent dark:bg-foreground/5 dark:focus-visible:border-foreground/25'
);

export type KitFormFieldProps = Omit<IInputProps, 'id' | 'className'> & {
	label: string;
	className?: string;
};

/**
 * A labelled input of the kit's forms. The label names the input for screen readers and focuses it when clicked.
 */
export function KitFormField({ label, className, ...props }: Readonly<KitFormFieldProps>) {
	const id = useId();
	return (
		<div className={cn('flex flex-col gap-2', className)}>
			<label htmlFor={id} className="text-sm font-medium leading-none text-foreground">
				{label}
			</label>
			<Input id={id} className={FIELD_SURFACE} {...props} />
		</div>
	);
}

/**
 * What a form could not do, on the kit's error notice. Screen readers read it out when it appears.
 */
export function KitFormError({ message }: Readonly<{ message?: string | null }>) {
	if (!message) {
		return null;
	}
	return (
		<p role="alert" className={cn(KIT_NOTICE_SURFACE, kitNoticeTone('error'))}>
			{message}
		</p>
	);
}
