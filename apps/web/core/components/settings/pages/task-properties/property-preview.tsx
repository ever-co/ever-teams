import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { dataColorChipStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { cn } from '@/core/lib/helpers';
import { TaskPropertySettingsKind } from '@/core/lib/utils/settings-task-properties';
import { PROPERTY_PREVIEW_CHIP } from './property-list-recipes';

interface PropertyPreviewProps {
	kind: TaskPropertySettingsKind;
	name: string;
	color: string | null;
	/** The icon being chosen, so the preview shows a custom one as the property will. */
	icon?: string | null;
	/** The `fullIconUrl` of that icon, while it is the stored one. */
	iconUrl?: string | null;
	placeholder: string;
}

function chipStyleOf(color: string | null) {
	if (!isPaintableColor(color)) {
		return undefined;
	}
	return dataColorChipStyle(color);
}

export function PropertyPreview({ kind, name, color, icon, iconUrl, placeholder }: Readonly<PropertyPreviewProps>) {
	const typedName = name.trim();
	const hasName = typedName.length > 0;
	let shownName = placeholder;
	if (hasName) {
		shownName = typedName;
	}

	if (kind === 'issueType') {
		return (
			<span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-foreground">
				<TaskPropertyIcon kind="issueType" name={typedName} color={color} icon={icon} iconUrl={iconUrl} />
				<span className={cn('truncate', !hasName && 'text-muted-foreground')}>{shownName}</span>
			</span>
		);
	}

	const isPainted = isPaintableColor(color);
	return (
		<span
			className={cn(PROPERTY_PREVIEW_CHIP, !isPainted && '[--chip:hsl(var(--muted-foreground))]')}
			style={chipStyleOf(color)}
		>
			<TaskPropertyIcon kind={kind} name={typedName} color={color} icon={icon} iconUrl={iconUrl} />
			<span className="truncate">{shownName}</span>
		</span>
	);
}
