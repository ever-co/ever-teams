import stc from 'string-to-color';
import { isPaintableColor } from '@/core/components/tasks/task-data-color';
import { parseGeneratedAvatar } from '@/core/lib/utils/generated-avatar';
import type { BudgetProject } from '@/core/lib/utils/dashboards/project-budget';

/** The hue `EntityTile` draws the project in, so a portfolio segment and the project's card share one colour. */
export function projectToneOf(project: BudgetProject): string {
	if (isPaintableColor(project.color)) {
		return project.color;
	}
	const placeholder = parseGeneratedAvatar(project.imageUrl);
	const placeholderColor = placeholder?.color;
	if (placeholderColor) {
		return placeholderColor;
	}
	return stc(project.name);
}
