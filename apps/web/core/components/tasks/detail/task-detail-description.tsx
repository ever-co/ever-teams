'use client';

import { useTranslations } from 'next-intl';
import {
	EditableRichText,
	type EditableRichTextSurface
} from '@/core/components/common/rich-editor/editable-rich-text';
import { LazyRichTextEditor } from '@/core/components/optimized-components/tasks';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { DETAIL_SECTION_TITLE } from './task-detail-recipes';

/** The editor saves the detailed task, so editing waits until the full task is there. */
export function TaskDetailDescription({
	task,
	isReady = true,
	surface = 'card'
}: Readonly<{ task: TTask; isReady?: boolean; surface?: EditableRichTextSurface }>) {
	const t = useTranslations();
	const label = <h2 className={DETAIL_SECTION_TITLE}>{t('common.DESCRIPTION')}</h2>;
	return (
		<EditableRichText
			label={label}
			value={task.description}
			isReady={isReady}
			surface={surface}
			renderEditor={(close) => <LazyRichTextEditor onDone={close} />}
		/>
	);
}
