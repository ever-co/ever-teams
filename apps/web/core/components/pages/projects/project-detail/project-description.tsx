'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EditableRichText } from '@/core/components/common/rich-editor/editable-rich-text';
import { LazyRichEditor } from '@/core/components/common/rich-editor/lazy-rich-editor';
import { Button } from '@/core/components/duplicated-components/_button';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { useTeamMentionCandidates } from '@/core/hooks/organizations/teams/use-team-mention-candidates';

interface DescribedProject {
	id: string;
	name?: string | null;
	description?: string | null;
}

function ProjectDescriptionEditor({ project, onDone }: Readonly<{ project: DescribedProject; onDone: () => void }>) {
	const t = useTranslations();
	const mentions = useTeamMentionCandidates();
	const { editOrganizationProject, editOrganizationProjectLoading } = useEditOrganizationProject();
	const [draft, setDraft] = useState<string | null>(null);
	const shownValue = draft ?? project.description ?? '';

	const save = async () => {
		if (draft === null) {
			onDone();
			return;
		}
		// useEditOrganizationProject swallows the error: the global mutation fallback reports it, the draft stays open
		const savedProject = await editOrganizationProject(project.id, { description: draft });
		if (!savedProject) {
			return;
		}
		onDone();
	};

	const cancelWhenUnchanged = () => {
		if (draft !== null) {
			return false;
		}
		onDone();
		return true;
	};

	return (
		<div className="flex flex-col">
			<LazyRichEditor
				value={shownValue}
				onChange={(html) => setDraft(html)}
				chrome="bare"
				ai={{ context: 'project', title: project.name ?? undefined }}
				mentions={mentions}
				autoFocus
				disabled={editOrganizationProjectLoading}
				onModEnter={() => void save()}
				onEscape={cancelWhenUnchanged}
				aria-label={t('common.DESCRIPTION')}
				contentClassName="min-h-32"
			/>
			<div className="flex items-center justify-end gap-2 hairline-t border-border px-2 pt-2 pb-1">
				<Button type="button" variant="outline" disabled={editOrganizationProjectLoading} onClick={onDone}>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" disabled={editOrganizationProjectLoading} onClick={() => void save()}>
					{t('common.SAVE')}
				</Button>
			</div>
		</div>
	);
}

/**
 * The project page's description, edited in place like the task's: only the description is sent, as the archive
 * action sends only its fields, through the same project edit request.
 */
export function ProjectDescription({ project, canEdit }: Readonly<{ project: DescribedProject; canEdit: boolean }>) {
	const t = useTranslations();
	const hasDescription = Boolean(project.description?.trim());
	const isShown = canEdit || hasDescription;
	if (!isShown) {
		return null;
	}
	const label = <h3 className="flex-1 text-sm font-semibold text-foreground">{t('common.DESCRIPTION')}</h3>;
	return (
		<EditableRichText
			label={label}
			value={project.description}
			canEdit={canEdit}
			renderEditor={(close) => <ProjectDescriptionEditor project={project} onDone={close} />}
		/>
	);
}
