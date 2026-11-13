import type { CSSProperties } from 'react';

import { cn } from '@/core/lib/helpers';
import styles from './shine-border.module.css';

type ShineBorderProps = Readonly<{
	active: boolean;
	thicknessPx?: number;
	className?: string;
}>;

/**
 * A brand gradient ring turning slowly around the edge of its parent, which must be positioned. Nothing is drawn while
 * it is not `active`, and the ring stays still when the person asks for reduced motion.
 */
export function ShineBorder({ active, thicknessPx = 1.5, className }: ShineBorderProps) {
	if (!active) {
		return null;
	}

	const style = { '--shine-border-thickness': `${thicknessPx}px` } as CSSProperties;

	return (
		<span aria-hidden="true" data-shine-border="" className={cn(styles.ring, className)} style={style}>
			<span className={styles.sweep} />
		</span>
	);
}
