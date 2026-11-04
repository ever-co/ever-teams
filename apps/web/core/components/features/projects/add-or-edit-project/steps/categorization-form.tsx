import {
	Button,
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Select } from './basic-information-form';
import { Check } from '@/core/components/icons';
import { controlGroupRecipe } from '@/core/components/common/input';
import { IStepElementProps } from '../container';
import { useTranslations } from 'next-intl';
import { useTagsQuery } from '@/core/hooks/tags/use-tags-query';
import { useCreateTag } from '@/core/hooks/tags/use-create-tag';
import { getInitialValue } from '@/core/lib/helpers/create-project';

export default function CategorizationForm(props: IStepElementProps) {
	const { goToNext, goToPrevious, currentData } = props;
	const [tags, setTags] = useState<string[]>(() => getInitialValue(currentData, 'tags', []));
	const [colorCode, setColorCode] = useState<string>(() => getInitialValue(currentData, 'color', '#000'));
	const { tags: tagData } = useTagsQuery();
	const { createTag, createTagLoading } = useCreateTag();
	const t = useTranslations();

	// Memoized callbacks to prevent unnecessary re-renders of the Select component
	const handleCreateTag = useCallback(
		(tagName: string) => {
			// Create a random hex color
			const newColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
			createTag({ name: tagName, color: newColor });
		},
		[createTag]
	);

	const handleTagsChange = useCallback((data: unknown) => {
		setTags(data as string[]);
	}, []);

	// Memoized options to prevent array recreation on every render
	const selectOptions = useMemo(() => {
		return (
			tagData?.map((el) => ({
				id: el.id,
				value: el.name,
				color: el.color ?? '#000'
			})) ?? []
		);
	}, [tagData]);

	// Memoized renderValue to prevent function recreation on every render
	const renderValue = useCallback(
		(selected: string[]) => {
			return (
				<span className={cn('capitalize', !selected?.length && 'text-muted-foreground/75')}>
					{tags.length
						? `Item${tags.length > 1 ? 's' : ''} (${tags.length})`
						: t('pages.projects.categorizationForm.formFields.tagsPlaceholder')}
				</span>
			);
		},
		[tags.length, t]
	);

	// Memoized renderItem to prevent function recreation and optimize tag color lookup
	const renderItem = useCallback(
		(item: any, selected: boolean) => {
			if (!item) return null;

			const tagColor = tagData?.find((el) => el.id === item.id)?.color ?? 'hsl(var(--muted-foreground))';

			return (
				<div key={item?.id} className="flex gap-2 items-center p-1 px-2 w-full h-full">
					<span
						className={cn(
							'flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-background shadow-sm shadow-black/10 hairline-ring ring-foreground/10 dark:ring-foreground/15',
							selected && 'bg-primary text-primary-foreground ring-primary'
						)}
					>
						{selected && <Check className="size-3" />}
					</span>
					<div className="flex gap-2 items-center h-full">
						<span style={{ backgroundColor: tagColor }} className="rounded-full size-2" />
						<span className="capitalize">{item?.value ?? ''}</span>
					</div>
				</div>
			);
		},
		[tagData]
	);

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		goToNext?.({
			tags: tagData?.filter((tag) => tags.includes(tag.id)),
			color: colorCode
		});
	};

	const handlePrevious = useCallback(() => {
		goToPrevious?.({
			tags: tagData?.filter((tag) => tags.includes(tag.id)),
			color: colorCode
		});
	}, [colorCode, goToPrevious, tagData, tags]);

	return (
		<form onSubmit={handleSubmit} className="pt-4 space-y-5 w-full">
			<div className="flex gap-3 w-full">
				<div className="flex flex-col flex-1 gap-2">
					<label htmlFor="project_tags" className={modalFieldLabelClass}>
						{t('pages.projects.categorizationForm.formFields.tags')}
					</label>
					<div className="w-full">
						<Select
							multiple
							searchEnabled
							createLoading={createTagLoading}
							onCreate={handleCreateTag}
							onChange={handleTagsChange}
							selected={tags}
							placeholder={t('pages.projects.categorizationForm.formFields.tagsPlaceholder')}
							options={selectOptions}
							renderValue={renderValue}
							renderItem={renderItem}
						/>
					</div>
				</div>
				<div className="flex flex-col flex-1 gap-2">
					<label htmlFor="project_color" className={modalFieldLabelClass}>
						{t('pages.projects.categorizationForm.formFields.colorCode')}
					</label>
					<div className="w-full">
						<Popover className={cn('relative w-full')}>
							<PopoverButton className="w-full rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25">
								<div className={cn(controlGroupRecipe, 'h-9 cursor-pointer gap-2 px-1.5')}>
									<div
										className="rounded-sm hairline-ring size-6 shrink-0 ring-border"
										style={{ backgroundColor: colorCode }}
									/>
									<span className="flex items-center font-mono text-sm uppercase grow">
										{colorCode}
									</span>
								</div>
							</PopoverButton>
							<PopoverPanel className="absolute top-11 p-2 rounded-xl hairline-ring shadow-md w-fit bg-popover ring-border shadow-black/6.5">
								{/* @ts-ignore */}
								<HexColorPicker defaultValue={colorCode} onChange={(color) => setColorCode(color)} />
							</PopoverPanel>
						</Popover>
					</div>
				</div>
			</div>
			<div className={cn(modalFooterClass, 'hairline-t border-border pt-4')}>
				<Button
					onClick={handlePrevious}
					variant="ghost"
					size="default"
					className={modalSecondaryActionClass}
					type="button"
				>
					{t('common.BACK')}
				</Button>
				<Button type="submit" size="default" className={modalPrimaryActionClass}>
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}
