import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { ActivityIcon } from '@/core/components/activities/activity-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { dataColorHue, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { cn } from '@/core/lib/helpers';
import type { UsagePerson, UsageProject } from '@/core/lib/utils/dashboards/apps-urls';

const CELL_TEXT = 'truncate text-[13px] text-foreground';

const MUTED_TEXT = 'truncate text-[13px] text-muted-foreground';

function initialOf(text: string) {
	const firstCharacter = Array.from(text.trim())[0] ?? '';
	return firstCharacter.toUpperCase();
}

/** An app or site with its icon (#5023): its own mark, its favicon where allowed, or a generic one. */
export const AppTitleCell = memo(function AppTitleCell({
	title,
	kind,
	url,
	className
}: Readonly<{ title: string; kind?: 'app' | 'url' | null; url?: string | null; className?: string }>) {
	const t = useTranslations();
	const hasTitle = title.length > 0;
	return (
		<span className={cn('flex min-w-0 items-center gap-2.5', className)} title={title}>
			<ActivityIcon title={title} kind={kind} url={url} />
			{hasTitle && <span className={CELL_TEXT}>{title}</span>}
			{!hasTitle && <span className={MUTED_TEXT}>{t('dashboard.appsUrls.UNTITLED')}</span>}
		</span>
	);
});

function isUsableImageUrl(imageUrl: string | null): imageUrl is string {
	if (!imageUrl) {
		return false;
	}
	const isAbsolute = imageUrl.startsWith('http');
	const isLocal = imageUrl.startsWith('/');
	return isAbsolute || isLocal;
}

function ProjectDot({ color }: Readonly<{ color: string | null }>) {
	if (!isPaintableColor(color)) {
		return <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-foreground/25" />;
	}
	return (
		<span
			aria-hidden="true"
			className="size-2 shrink-0 rounded-full"
			style={{ backgroundColor: dataColorHue(color) }}
		/>
	);
}

/** A project's own image when it has one, otherwise a dot in its colour; no project is an empty dashed ring. */
export function ProjectMark({ project }: Readonly<{ project: UsageProject }>) {
	const hasNoProject = project.id === null;
	if (hasNoProject) {
		return (
			<span
				aria-hidden="true"
				className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground/60"
			/>
		);
	}
	if (isUsableImageUrl(project.imageUrl)) {
		return (
			<Avatar className="size-4 shrink-0 rounded-[5px] bg-transparent hairline-ring ring-foreground/10">
				<AvatarImage src={project.imageUrl} alt="" loading="lazy" className="object-cover" />
				<AvatarFallback className="rounded-[5px] bg-transparent">
					<ProjectDot color={project.color} />
				</AvatarFallback>
			</Avatar>
		);
	}
	return (
		<span className="flex size-4 shrink-0 items-center justify-center">
			<ProjectDot color={project.color} />
		</span>
	);
}

export const ProjectCell = memo(function ProjectCell({
	project,
	className
}: Readonly<{ project: UsageProject; className?: string }>) {
	const t = useTranslations();
	const name = project.name;
	return (
		<span className={cn('flex min-w-0 items-center gap-2', className)}>
			<ProjectMark project={project} />
			{name && <span className={CELL_TEXT}>{name}</span>}
			{!name && <span className={MUTED_TEXT}>{t('dashboard.appsUrls.NO_PROJECT')}</span>}
		</span>
	);
});

export function personNameOrFallback(person: UsagePerson, fallback: string) {
	if (person.name) {
		return person.name;
	}
	return fallback;
}

export const PersonCell = memo(function PersonCell({
	person,
	className
}: Readonly<{ person: UsagePerson; className?: string }>) {
	const t = useTranslations();
	const name = personNameOrFallback(person, t('dashboard.appsUrls.UNKNOWN_MEMBER'));
	return <MemberCell name={name} imageUrl={person.imageUrl} className={className} />;
});

/** The 16px face of a person inside a menu row or a filter chip. */
export function PersonFace({ person, fallbackName }: Readonly<{ person: UsagePerson; fallbackName: string }>) {
	const name = personNameOrFallback(person, fallbackName);
	return (
		<Avatar className="size-4 text-[7px] font-medium">
			<AvatarImage src={person.imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[inherit]">{initialOf(name)}</AvatarFallback>
		</Avatar>
	);
}
