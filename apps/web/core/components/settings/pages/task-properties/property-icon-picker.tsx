'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { propertyLabelOf, TaskPropertySettingsKind } from '@/core/lib/utils/settings-task-properties';
import { classicIconGlyphOf, libraryIconKeyOf } from '@/core/lib/utils/property-icon-value';
import { PropertyIconImage } from './property-icon-image';

function IconPanelLoading() {
	return (
		<div className="flex flex-col gap-2 p-2" aria-hidden="true">
			<span className="h-8 rounded-md bg-foreground/[0.05]" />
			<span className="h-40 animate-pulse rounded-md bg-foreground/[0.04]" />
		</div>
	);
}

const PropertyIconPanel = dynamic(() => import('./property-icon-panel').then((module) => module.PropertyIconPanel), {
	ssr: false,
	loading: IconPanelLoading
});

function iconNameOf(value: string) {
	const libraryKey = libraryIconKeyOf(value);
	if (libraryKey) {
		return libraryKey.split('-').join(' ');
	}
	const fileName = value.split('/').pop() ?? '';
	const name = fileName.replace(/\.(svg|png|jpe?g|webp|gif)$/i, '');
	return propertyLabelOf(name);
}

/** The chosen icon as the property will show it: a classic one as its glyph, a custom one with a fallback. */
function ChosenIcon({ kind, value }: Readonly<{ kind: TaskPropertySettingsKind; value: string }>) {
	const glyph = classicIconGlyphOf(value);
	if (glyph) {
		return <TaskPropertyIcon kind={glyph.kind} name={glyph.name} />;
	}
	return <PropertyIconImage value={value} fallback={<TaskPropertyPlaceholderIcon kind={kind} />} />;
}

interface PropertyIconPickerProps {
	kind: TaskPropertySettingsKind;
	value: string | null;
	onChange: (path: string) => void;
}

export function PropertyIconPicker({ kind, value, onChange }: Readonly<PropertyIconPickerProps>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);

	let triggerLabel = t('settings.taskProperties.ICON_CHOOSE');
	if (value) {
		triggerLabel = t('settings.taskProperties.ICON_CURRENT', { name: iconNameOf(value) });
	}

	const pick = (path: string) => {
		onChange(path);
		setIsOpen(false);
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={triggerLabel}
					className="keycap-3d flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					{value && <ChosenIcon kind={kind} value={value} />}
					{!value && <TaskPropertyPlaceholderIcon kind={kind} />}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 p-0">
				<PropertyIconPanel kind={kind} value={value} onPick={pick} />
			</PopoverContent>
		</Popover>
	);
}
