import type { DottedLanguageObjectStringPaths } from 'next-intl';
import { Edit, FlagPriority, ListView, Task, type IconComponent } from '@/core/components/icons';

export type AssistantExample = {
	id: string;
	icon: IconComponent;
	labelKey: DottedLanguageObjectStringPaths;
	promptKey: DottedLanguageObjectStringPaths;
};

export const ASSISTANT_EXAMPLES: AssistantExample[] = [
	{ id: 'task', icon: Task, labelKey: 'chatView.EXAMPLE_TASK_LABEL', promptKey: 'chatView.EXAMPLE_TASK_PROMPT' },
	{
		id: 'breakdown',
		icon: ListView,
		labelKey: 'chatView.EXAMPLE_BREAKDOWN_LABEL',
		promptKey: 'chatView.EXAMPLE_BREAKDOWN_PROMPT'
	},
	{
		id: 'update',
		icon: Edit,
		labelKey: 'chatView.EXAMPLE_UPDATE_LABEL',
		promptKey: 'chatView.EXAMPLE_UPDATE_PROMPT'
	},
	{
		id: 'priorities',
		icon: FlagPriority,
		labelKey: 'chatView.EXAMPLE_PRIORITIES_LABEL',
		promptKey: 'chatView.EXAMPLE_PRIORITIES_PROMPT'
	}
];
