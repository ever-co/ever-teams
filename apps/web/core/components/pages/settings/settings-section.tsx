import { PropsWithChildren } from 'react';
import { cn } from '@/core/lib/helpers';

/** The blocks of a settings page: hairlines between them, no padding above the first nor under the last. */
export const SETTINGS_SECTIONS_CLASS =
	'flex flex-col hairline-divide-y divide-border [&>*:first-child_section]:pt-0 [&>*:last-child_section]:pb-0';

/** The rows of one block, stacked without hairlines (the hairlines separate the blocks). */
export const SETTINGS_ROWS_CLASS = 'flex flex-col gap-6';

/** One row: the label column, then the control column. */
export const SETTINGS_ROW_CLASS =
	'grid grid-cols-1 gap-2 md:grid-cols-[14rem_minmax(0,1fr)] md:items-center md:gap-x-8';

export const SETTINGS_LABEL_CLASS = 'text-sm font-medium text-foreground';

export const SETTINGS_CONTROL_CLASS = 'flex min-w-0 flex-wrap items-center gap-2 text-sm text-foreground';

type SettingsSectionProps = PropsWithChildren<{
	title: string;
	id?: string;
	isDanger?: boolean;
}>;

export function SettingsSection({ title, id, isDanger = false, children }: Readonly<SettingsSectionProps>) {
	return (
		<section id={id} className="scroll-mt-4 py-8">
			<h2
				className={cn(
					'text-base font-semibold text-balance text-foreground',
					isDanger && 'text-destructive-ink'
				)}
			>
				{title}
			</h2>
			<div className="mt-5 min-w-0">{children}</div>
		</section>
	);
}
