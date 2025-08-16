import { Button } from '@/core/components';
import { cn } from '@/core/lib/helpers';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Select } from './basic-information-form';
import { CheckIcon } from 'lucide-react';
import { IStepElementProps } from '../container';
import { useTranslations } from 'next-intl';
import { useTags } from '@/core/hooks/tags';
import { getInitialValue } from '@/core/lib/helpers/create-project';

export default function CategorizationForm(props: IStepElementProps) {
	const { goToNext, goToPrevious, currentData } = props;
	const [tags, setTags] = useState<string[]>(() => getInitialValue(currentData, 'tags', []));
	const [colorCode, setColorCode] = useState<string>(() => getInitialValue(currentData, 'color', '#000'));
	const { tags: tagData, createTag, createTagLoading } = useTags();
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
				<span className={cn(' capitalize', !selected?.length && 'text-gray-400')}>
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

			const tagColor = tagData?.find((el) => el.id === item.id)?.color ?? '#000';

			return (
				<div key={item?.id} className="flex gap-2 items-center p-1 px-2 w-full h-full">
					<span
						className={cn(
							'h-4 w-4 rounded border border-primary flex items-center justify-center',
							selected && 'bg-primary text-primary-foreground dark:text-white'
						)}
					>
						{selected && <CheckIcon size={10} />}
					</span>
					<div className="flex gap-1 items-center h-full">
						<span style={{ backgroundColor: tagColor }} className="w-4 h-4 rounded-full" />
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
				<div className="flex flex-col flex-1 gap-1">
					<label htmlFor="project_tags" className="text-xs font-medium">
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
				<div className="flex flex-col flex-1 gap-1">
					<label htmlFor="project_color" className="text-xs font-medium">
						{t('pages.projects.categorizationForm.formFields.colorCode')}
					</label>
					<div className="w-full">
						<Popover className={cn('relative w-full')}>
							<PopoverButton className={cn('w-full')}>
								<div className="flex w-full items-center gap-1 dark:bg-dark--theme-light rounded-lg cursor-pointer h-[2.2rem]">
									<div className="h-full border w-[2.2rem] p-1 rounded-lg">
										<div
											className="w-full h-full rounded-md"
											style={{ backgroundColor: colorCode }}
										/>
									</div>
									<span className="flex items-center px-3 h-full uppercase rounded-lg border grow">
										{colorCode}
									</span>
								</div>
							</PopoverButton>
							<PopoverPanel className="absolute top-11 rounded-md border shadow-md w-fit dark:bg-dark--theme-light input-border">
								{/* @ts-ignore */}
								<HexColorPicker defaultValue={colorCode} onChange={(color) => setColorCode(color)} />
							</PopoverPanel>
						</Popover>
					</div>
				</div>
			</div>
			<div className="flex justify-between items-center w-full">
				<Button onClick={handlePrevious} className=" h-[2.5rem]" type="button">
					{t('common.BACK')}
				</Button>
				<Button type="submit" className=" h-[2.5rem]">
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}
