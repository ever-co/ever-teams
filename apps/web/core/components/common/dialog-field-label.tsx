import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { modalFieldLabelClass } from '@/core/components/common/modal';

/** A dialog field's muted label, with the required mark or the optional word after it. */
export function DialogFieldLabel({
	children,
	htmlFor,
	isRequired = false,
	optionalLabel
}: Readonly<{ children: ReactNode; htmlFor?: string; isRequired?: boolean; optionalLabel?: string }>) {
	const hasOptionalLabel = Boolean(optionalLabel);

	return (
		<label htmlFor={htmlFor} className={cn(modalFieldLabelClass, 'mb-1.5 block leading-none')}>
			{children}
			{isRequired && <span className="ml-1 text-destructive-ink">*</span>}
			{hasOptionalLabel && <span className="ml-1 font-normal text-muted-foreground/75">({optionalLabel})</span>}
		</label>
	);
}
