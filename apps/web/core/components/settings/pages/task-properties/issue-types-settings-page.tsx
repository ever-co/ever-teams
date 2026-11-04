'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, Plus, Spinner } from '@/core/components/icons';
import {
	SettingsPage,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from '@/core/components/tasks/task-property-icon';
import { IssueTypeSettingsModel, useIssueTypeSettings } from '@/core/hooks/settings/use-issue-type-settings';
import { PropertyListItem } from '@/core/lib/utils/settings-task-properties';
import { PropertyList, usePropertyListController } from './property-list';
import {
	IssueTypeDefaultRowSkeleton,
	IssueTypesSettingsSkeleton,
	ISSUE_TYPES_SKELETON_ROWS
} from './issue-types-settings-skeleton';

function DefaultTypeFace({ item, isSaving }: Readonly<{ item: PropertyListItem | null; isSaving: boolean }>) {
	const t = useTranslations();
	if (isSaving) {
		return <Spinner className="size-3.5 animate-spin" />;
	}
	if (!item) {
		return (
			<>
				<TaskPropertyPlaceholderIcon kind="issueType" />
				<span>{t('settings.taskProperties.issueTypes.NO_DEFAULT')}</span>
			</>
		);
	}
	return (
		<>
			<TaskPropertyIcon kind="issueType" name={item.name} color={item.color} />
			<span className="capitalize">{item.label}</span>
		</>
	);
}

function DefaultTypePicker({ model }: Readonly<{ model: IssueTypeSettingsModel }>) {
	const t = useTranslations();
	const [announcement, setAnnouncement] = useState('');
	const { items, defaultItem, isSavingDefault, makeDefault } = model;
	const hasTypes = items.length > 0;

	let currentName: string = t('settings.taskProperties.issueTypes.NO_DEFAULT');
	if (defaultItem) {
		currentName = defaultItem.label;
	}

	const pick = async (item: PropertyListItem) => {
		const isCurrent = item.id === defaultItem?.id;
		if (isCurrent) {
			return;
		}
		try {
			await makeDefault(item);
			setAnnouncement(t('settings.taskProperties.ANNOUNCE_DEFAULT', { name: item.label }));
		} catch {
			// The mutation's error toast gives the reason; the picker still shows the stored default.
		}
	};

	return (
		<>
			{!hasTypes && (
				<span className="text-[13px] text-muted-foreground">
					{t('settings.taskProperties.issueTypes.NO_DEFAULT')}
				</span>
			)}
			{hasTypes && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="outline"
							disabled={isSavingDefault}
							aria-label={t('settings.taskProperties.issueTypes.DEFAULT_TRIGGER', { name: currentName })}
							className="gap-2"
						>
							<DefaultTypeFace item={defaultItem} isSaving={isSavingDefault} />
							<ChevronDown className="size-3.5 text-muted-foreground" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						{items.map((item) => {
							const isCurrent = item.id === defaultItem?.id;
							return (
								<DropdownMenuItem key={item.id} onClick={() => pick(item)}>
									<TaskPropertyIcon kind="issueType" name={item.name} color={item.color} />
									<span className="min-w-0 truncate capitalize">{item.label}</span>
									{isCurrent && <SelectedMark className="ml-auto" />}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
			<span aria-live="polite" className="sr-only">
				{announcement}
			</span>
		</>
	);
}

function DefaultTypeSection({ model }: Readonly<{ model: IssueTypeSettingsModel }>) {
	const t = useTranslations();
	const hasItems = model.items.length > 0;
	const isFirstLoad = model.isLoading && !hasItems;
	const hasFailed = model.isError && !hasItems;
	if (hasFailed) {
		return null;
	}
	return (
		<SettingsSection title={t('settings.taskProperties.issueTypes.DEFAULT_SECTION')}>
			{isFirstLoad && <IssueTypeDefaultRowSkeleton />}
			{!isFirstLoad && (
				<SettingsSurface>
					<SettingsRow
						label={t('settings.taskProperties.issueTypes.DEFAULT_LABEL')}
						description={t('settings.taskProperties.issueTypes.DEFAULT_DESCRIPTION')}
					>
						<DefaultTypePicker model={model} />
					</SettingsRow>
				</SettingsSurface>
			)}
		</SettingsSection>
	);
}

function IssueTypesSettingsContent() {
	const t = useTranslations();
	const model = useIssueTypeSettings();
	const controller = usePropertyListController();
	const { openCreate } = controller;

	return (
		<SettingsPage
			title={t('settings.entries.issueTypes.TITLE')}
			description={t('settings.entries.issueTypes.DESCRIPTION')}
			actions={
				<Button type="button" onClick={() => openCreate()}>
					<Plus />
					{t('settings.taskProperties.ADD', { kind: 'issueType' })}
				</Button>
			}
		>
			<DefaultTypeSection model={model} />
			<SettingsSection title={t('settings.taskProperties.issueTypes.TYPES_SECTION')}>
				<PropertyList
					kind="issueType"
					model={model}
					controller={controller}
					skeletonRows={ISSUE_TYPES_SKELETON_ROWS}
					onMakeDefault={model.makeDefault}
					onDelete={model.remove}
				/>
			</SettingsSection>
		</SettingsPage>
	);
}

export function IssueTypesSettingsPage() {
	return (
		<TeamSettingsGate skeleton={<IssueTypesSettingsSkeleton />}>
			<IssueTypesSettingsContent />
		</TeamSettingsGate>
	);
}
