import { Button } from '@/lib/components';
import { cn } from '@/lib/utils';
import { Popover } from '@headlessui/react';
import { FormEvent, useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Select } from './basic-information-form';
import { CheckIcon } from 'lucide-react';
import { IStepElementProps } from '../container';
import { useTags } from '@/app/hooks/features/useTags';
import { useTranslations } from 'next-intl';
import { getInitialValue } from '../utils';

export default function CategorizationForm(props: IStepElementProps) {
	const { goToNext, currentData, mode } = props;
	const [tags, setTags] = useState<string[]>(() => getInitialValue(currentData, mode, 'tags', []));
	const [colorCode, setColorCode] = useState<string>(() => getInitialValue(currentData, mode, 'color', '#000'));
	const { tags: tagData, getTags, createTag, createTagLoading } = useTags();
	const t = useTranslations();

	useEffect(() => {
		getTags();
	}, [getTags]);

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		goToNext({
			tags: tagData?.filter((tag) => tags.includes(tag.id)),
			color: colorCode
		});
	};

	console.log(currentData);

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-5 pt-4">
			<div className="w-full flex gap-3">
				<div className="flex gap-1  flex-1 flex-col">
					<label htmlFor="project_tags" className=" text-xs font-medium">
						{t('pages.projects.categorizationForm.formFields.tags')}
					</label>
					<div className="w-full">
						<Select
							multiple
							searchEnabled
							createLoading={createTagLoading}
							onCreate={(tagName) => {
								// Create a random hex color
								const newColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
								createTag({ name: tagName, color: newColor });
							}}
							onChange={(data) => setTags(data as string[])}
							selected={tags}
							placeholder={t('pages.projects.categorizationForm.formFields.tagsPlaceholder')}
							options={tagData?.map((el) => {
								return {
									id: el.id,
									value: el.name,
									color: el.color ?? '#000'
								};
							})}
							renderValue={(selected) => {
								return (
									<span className={cn(' capitalize', !selected?.length && 'text-gray-400')}>
										{tags.length
											? `Item${tags.length > 1 ? 's' : ''} (${tags.length})`
											: t('pages.projects.categorizationForm.formFields.tagsPlaceholder')}
									</span>
								);
							}}
							renderItem={(item, selected) => {
								return (
									<div className="w-full h-full p-1 px-2 flex items-center gap-2">
										<span
											className={cn(
												'h-4 w-4 rounded border border-primary flex items-center justify-center',
												selected && 'bg-primary text-primary-foreground dark:text-white'
											)}
										>
											{selected && <CheckIcon size={10} />}
										</span>
										<div className="h-full flex items-center gap-1">
											<span
												style={{
													backgroundColor:
														tagData?.find((el) => el.id == item.id)?.color ?? '#000'
												}}
												className="w-4 h-4 rounded-full"
											/>
											<span className="capitalize">{item?.value ?? ''}</span>
										</div>
									</div>
								);
							}}
						/>
					</div>
				</div>
				<div className="flex gap-1 flex-1 flex-col">
					<label htmlFor="project_color" className=" text-xs font-medium">
						{t('pages.projects.categorizationForm.formFields.colorCode')}
					</label>
					<div className="w-full">
						<Popover className={cn('relative w-full')}>
							<Popover.Button className={cn('w-full')}>
								<div className="flex w-full items-center gap-1 dark:bg-dark--theme-light rounded-lg cursor-pointer h-[2.2rem]">
									<div className="h-full border w-[2.2rem] p-1 rounded-lg">
										<div
											className="w-full h-full rounded-md"
											style={{ backgroundColor: colorCode }}
										/>
									</div>
									<span className=" border h-full grow flex items-center px-3 uppercase rounded-lg">
										{colorCode}
									</span>
								</div>
							</Popover.Button>
							<Popover.Panel className="w-fit absolute top-11 border rounded-md shadow-md dark:bg-dark--theme-light input-border">
								<HexColorPicker defaultValue={colorCode} onChange={(color) => setColorCode(color)} />
							</Popover.Panel>
						</Popover>
					</div>
				</div>
			</div>
			<div className="w-full flex items-center justify-end">
				<Button type="submit" className=" h-[2.5rem]">
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}
