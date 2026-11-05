'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { MENU_ROW } from '@/core/components/common/menu-recipes';
import { SelectedMark } from '@/core/components/common/selected-mark';
import {
	ICON_GROUP_ORDER,
	iconOptionLabel,
	iconOptionMatches,
	propertyIconOptions,
	TaskPropertySettingsKind
} from '@/core/lib/utils/settings-task-properties';
import { ICON_GROUP_LABEL_KEYS } from './property-i18n';
import { PropertyIconImage } from './property-icon-image';

interface PropertyIconPanelProps {
	kind: TaskPropertySettingsKind;
	value: string | null;
	onPick: (path: string) => void;
}

export function PropertyIconPanel({ kind, value, onPick }: Readonly<PropertyIconPanelProps>) {
	const t = useTranslations();
	const [query, setQuery] = useState('');
	const options = useMemo(() => propertyIconOptions(kind), [kind]);
	const visibleOptions = options.filter((option) => iconOptionMatches(option, query));
	const groups = ICON_GROUP_ORDER.map((group) => ({
		group,
		options: visibleOptions.filter((option) => option.group === group)
	}));
	const filledGroups = groups.filter((entry) => entry.options.length > 0);
	const hasResults = filledGroups.length > 0;

	return (
		<div className="flex flex-col">
			<div className="p-1.5 hairline-b border-border">
				<Input
					type="search"
					value={query}
					autoFocus
					onChange={(event) => setQuery(event.target.value)}
					placeholder={t('settings.taskProperties.ICON_SEARCH')}
					aria-label={t('settings.taskProperties.ICON_SEARCH')}
					className="h-8"
				/>
			</div>
			<div className="max-h-64 overflow-y-auto overscroll-contain p-1">
				{filledGroups.map((entry) => {
					const groupLabel = t(ICON_GROUP_LABEL_KEYS[entry.group]);
					return (
						<fieldset key={entry.group} aria-label={groupLabel} className="min-w-0">
							<p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">{groupLabel}</p>
							{entry.options.map((option) => {
								const isCurrent = option.path === value;
								return (
									<button
										key={option.path}
										type="button"
										aria-pressed={isCurrent}
										onClick={() => onPick(option.path)}
										className={MENU_ROW}
									>
										<PropertyIconImage path={option.path} />
										<span className="capitalize">{iconOptionLabel(option)}</span>
										{isCurrent && <SelectedMark className="ml-auto" />}
									</button>
								);
							})}
						</fieldset>
					);
				})}
				{!hasResults && (
					<p className="px-2 py-3 text-xs text-muted-foreground">{t('settings.taskProperties.ICON_EMPTY')}</p>
				)}
			</div>
		</div>
	);
}
