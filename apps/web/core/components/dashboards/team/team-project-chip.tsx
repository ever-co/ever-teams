import { useTranslations } from 'next-intl';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { cn } from '@/core/lib/helpers';
import type { ProjectShareItem } from '@/core/lib/utils/dashboards/team';
import { ProjectMark } from './team-marks';

function chipStyleOf(project: ProjectShareItem) {
	if (!isPaintableColor(project.color)) {
		return undefined;
	}
	return dataColorChipStyle(project.color);
}

function neutralToneOf(project: ProjectShareItem) {
	if (isPaintableColor(project.color)) {
		return undefined;
	}
	return '[--chip:hsl(var(--muted-foreground))]';
}

/** A project as a chip. `isFocusable={false}` inside a button: the lock of a hidden project then takes no focus. */
export function ProjectChip({
	project,
	className,
	isFocusable = true
}: Readonly<{ project: ProjectShareItem; className?: string; isFocusable?: boolean }>) {
	const t = useTranslations();
	const name = project.name || t('dashboard.team.projects.NONE');
	return (
		<span
			className={cn(
				'chip-3d inline-flex h-5 min-w-0 max-w-48 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium',
				neutralToneOf(project),
				className
			)}
			style={chipStyleOf(project)}
		>
			<ProjectMark
				imageUrl={project.imageUrl}
				color={project.color}
				isNoProject={project.isNoProject}
				isHidden={project.isProjectHidden}
				isFocusable={isFocusable}
			/>
			<span className="truncate">{name}</span>
		</span>
	);
}
