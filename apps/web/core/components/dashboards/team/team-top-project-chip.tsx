import { useTranslations } from 'next-intl';
import { HiddenProjectMark } from '@/core/components/projects/hidden-project-mark';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { cn } from '@/core/lib/helpers';
import { formatPercent, percentOf } from '@/core/lib/utils/dashboard-figures';
import type { ProjectShareItem } from '@/core/lib/utils/dashboards/team';
import { ProjectMark } from './team-marks';

type Translate = ReturnType<typeof useTranslations>;

function projectNameOf(project: ProjectShareItem, t: Translate) {
	if (project.isNoProject) {
		return t('dashboard.team.projects.NONE');
	}
	return project.name || t('dashboard.team.projects.NONE');
}

function projectChipStyleOf(project: ProjectShareItem) {
	if (project.isNoProject) {
		return undefined;
	}
	if (!isPaintableColor(project.color)) {
		return undefined;
	}
	return dataColorChipStyle(project.color);
}

function projectChipToneOf(project: ProjectShareItem) {
	const hasColor = isPaintableColor(project.color);
	const isNeutral = project.isNoProject || !hasColor;
	if (isNeutral) {
		return '[--chip:hsl(var(--muted-foreground))]';
	}
	return undefined;
}

/**
 * The member's top project. Assistive technology reads it once, from the hidden sentence; the visible name and share
 * are kept from it. The lock of a hidden project stays outside that, reachable by keyboard with its hint, and above the
 * card's link so that it tells its hint on hover too.
 */
export function TopProjectChip({
	project,
	memberSeconds
}: Readonly<{ project: ProjectShareItem; memberSeconds: number }>) {
	const t = useTranslations();
	const name = projectNameOf(project, t);
	const share = percentOf(project.seconds, memberSeconds);
	return (
		<span className="flex min-w-0">
			<span className="sr-only">{t('dashboard.team.figures.TOP_PROJECT', { name })}</span>
			<span
				className={cn(
					'chip-3d inline-flex h-6 min-w-0 max-w-full items-center gap-1.5 rounded-md px-2 text-xs font-medium',
					projectChipToneOf(project)
				)}
				style={projectChipStyleOf(project)}
			>
				{project.isProjectHidden && <HiddenProjectMark className="relative z-[1]" />}
				{!project.isProjectHidden && (
					<ProjectMark imageUrl={project.imageUrl} color={project.color} isNoProject={project.isNoProject} />
				)}
				<span aria-hidden="true" className="truncate">
					{name}
				</span>
				<span aria-hidden="true" className="shrink-0 tabular-nums opacity-70">
					{formatPercent(share)}
				</span>
			</span>
		</span>
	);
}
