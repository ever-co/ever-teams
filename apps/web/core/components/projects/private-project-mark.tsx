'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Lock } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { isPrivateProject } from '@/core/lib/utils/project-visibility';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganizationProject } from '@/core/types/schemas';

const TOOLTIP_DELAY_MS = 300;

interface PrivateProjectMarkProps {
	project: Pick<TOrganizationProject, 'public'> | null | undefined;
	/** Whether the mark takes focus of its own; inside a link it does not, the link holds it. */
	isFocusable?: boolean;
	/** Opens the sentence from outside, for the link that holds the focus in place of the mark. */
	isHintOpen?: boolean;
	className?: string;
}

/**
 * The lock beside the name of a project kept to its members and managers (CORE-08). It tells why on hover and on
 * focus, and assistive technology reads the same sentence.
 *
 * It is shown only while the workspace keeps private projects private (`enforcePrivateProjects`): a project marked
 * private in a workspace where the setting is off, or on a Gauzy without it, is seen by everyone, and a lock would
 * promise what nothing applies.
 *
 * Inside a link (a list row) it takes no focus of its own: the link holds it, opens the sentence through
 * `isHintOpen` when the keyboard focuses it, and carries the sentence in its name. Elsewhere it can be focused.
 */
export function PrivateProjectMark({
	project,
	isFocusable = true,
	isHintOpen = false,
	className
}: Readonly<PrivateProjectMarkProps>) {
	const t = useTranslations();
	const organization = useAtomValue(currentOrganizationState);
	const [isOpenedHere, setIsOpenedHere] = useState(false);
	const isEnforced = organization?.enforcePrivateProjects === true;
	if (!isEnforced || !isPrivateProject(project)) {
		return null;
	}
	const hint = t('pages.projects.visibility.PRIVATE_HINT');
	return (
		<Tooltip open={isOpenedHere || isHintOpen} onOpenChange={(isOpen) => setIsOpenedHere(isOpen)}>
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
