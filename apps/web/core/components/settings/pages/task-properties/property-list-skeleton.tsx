import { cn } from '@/core/lib/helpers';
import { SETTINGS_SKELETON_BAR } from '@/core/components/settings/kit/settings-page';
import { PROPERTY_ROW, PROPERTY_SURFACE } from './property-list-recipes';

const LABEL_WIDTHS = ['w-28', 'w-20', 'w-32', 'w-24', 'w-16', 'w-28'];

export function PropertyListSkeleton({ rows }: Readonly<{ rows: number }>) {
	const rowKeys = Array.from({ length: rows }, (_, index) => index);

	return (
		<div className={PROPERTY_SURFACE} aria-busy="true">
			<ul className="hairline-divide-y divide-border" aria-hidden="true">
				{rowKeys.map((key) => (
					<li key={key} className={PROPERTY_ROW}>
						<span className="size-4 shrink-0 rounded-full bg-foreground/[0.07]" />
						<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5', LABEL_WIDTHS[key % LABEL_WIDTHS.length])} />
					</li>
				))}
			</ul>
		</div>
	);
}
