'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Lock } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { isPrivateProject } from '@/core/lib/utils/project-visibility';
import type { TOrganizationProject } from '@/core/types/schemas';

const TOOLTIP_DELAY_MS = 300;

/**
 * The lock beside the name of a project kept to its members and managers (CORE-08). It tells why on hover and on
 * focus, and assistive technology reads the same sentence. Nothing is shown for a project everyone sees.
 *
 * Inside a link (a list row, a card) it takes no focus of its own: the link holds it, and its name carries the
 * sentence. Elsewhere (the project page title) it can be focused to show the sentence.
 */
export function PrivateProjectMark({
	project,
	isFocusable = true,
	className
}: Readonly<{
	project: Pick<TOrganizationProject, 'public'> | null | undefined;
	isFocusable?: boolean;
	className?: string;
}>) {
	const t = useTranslations();
	if (!isPrivateProject(project)) {
		return null;
	}
	const hint = t('pages.projects.visibility.PRIVATE_HINT');
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<span
					tabIndex={isFocusable ? 0 : undefined}
					role="img"
					aria-label={hint}
					className={cn(
						'inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5',
						className
					)}
				>
					<Lock aria-hidden />
				</span>
			</TooltipTrigger>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	);
}
