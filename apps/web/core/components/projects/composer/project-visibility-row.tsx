'use client';

import { useTranslations } from 'next-intl';
import { Eye, Globe, Lock } from '@/core/components/icons';
import { ChoiceCards, type ChoiceCardOption } from '@/core/components/settings/kit/choice-cards';
import { PropertyRow } from '@/core/components/projects/project-properties';
import { shownVisibilityOf, type ProjectVisibility } from '@/core/lib/utils/project-visibility';

interface ProjectVisibilityRowProps {
	/** The draft's choice: null while nobody chose, which reads as Everyone. */
	visibility: ProjectVisibility | null;
	/** Whether the workspace keeps private projects to their people; off, the choice is stored and applies once on. */
	isEnforced: boolean;
	disabled?: boolean;
	onChange: (visibility: ProjectVisibility) => void;
}

/**
 * Who sees the project (CORE-08): everyone in the organization, or only its members and managers. The choice uses the
 * control of the team's "Who can see the team". While the workspace does not keep private projects private, a line
 * under it says the choice applies once an admin turns that on.
 */
export function ProjectVisibilityRow({
	visibility,
	isEnforced,
	disabled = false,
	onChange
}: Readonly<ProjectVisibilityRowProps>) {
	const t = useTranslations();
	const options: ReadonlyArray<ChoiceCardOption<ProjectVisibility>> = [
		{
			value: 'everyone',
			title: t('pages.projects.visibility.EVERYONE_TITLE'),
			detail: t('pages.projects.visibility.EVERYONE_DETAIL'),
			glyph: <Globe />
		},
		{
			value: 'private',
			title: t('pages.projects.visibility.PRIVATE_TITLE'),
			detail: t('pages.projects.visibility.PRIVATE_DETAIL'),
			glyph: <Lock />
		}
	];
	let hint = null;
	if (!isEnforced) {
		hint = (
			<p className="text-xs text-pretty text-muted-foreground">{t('pages.projects.visibility.NOT_ENFORCED')}</p>
		);
	}

	return (
		<PropertyRow icon={<Eye />} label={t('pages.projects.visibility.LABEL')} hint={hint} className="items-start">
			<div className="w-full py-0.5">
				<ChoiceCards
					legend={t('pages.projects.visibility.LABEL')}
					options={options}
					value={shownVisibilityOf(visibility)}
					onChange={onChange}
					disabled={disabled}
				/>
			</div>
		</PropertyRow>
	);
}
