/* eslint-disable react-hooks/exhaustive-deps */
import { Button, InputField } from '@/lib/components';
import RichTextEditor from '../text-editor';
import { Calendar } from '@components/ui/calendar';
import { Listbox, Popover } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckIcon, ChevronDown, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { IStepElementProps } from '../container';
import Image from 'next/image';
import moment from 'moment';
import { isValidUrl } from '@/app/utils';
import { ScrollArea } from '@components/ui/scroll-bar';
import { ScrollBar } from '@components/ui/scroll-area';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser, useImageAssets } from '@/app/hooks';
import { getInitialValue } from '../utils';

type BasicInfoErrorKeys = 'dateRange' | 'websiteUrl' | 'projectTitle' | 'projectImage';

export default function BasicInformationForm(props: IStepElementProps) {
	const { goToNext, currentData, mode } = props;
	const [startDate, setStartDate] = useState(() => getInitialValue(currentData, 'startDate', new Date()));
	const [endDate, setEndDate] = useState(() => getInitialValue(currentData, 'endDate', new Date()));
	const [projectTitle, setProjectTitle] = useState(() => getInitialValue(currentData, 'name', ''));
	const [description, setDescription] = useState(() => getInitialValue(currentData, 'description', ''));
	const [projectImageFile, setProjectImageFile] = useState<File | null>(null);
	const [websiteUrl, setWebsiteUrl] = useState<string>(() => getInitialValue(currentData, 'projectUrl', ''));
	const [errors, setErrors] = useState<Map<BasicInfoErrorKeys, string>>(new Map());
	const t = useTranslations();
	const { createImageAssets, loading: createImageAssetLoading } = useImageAssets();
	const { user } = useAuthenticateUser();
	const [projectImageUrl, setProjectImageUrl] = useState(() => {
		if (mode == 'edit' && currentData.imageUrl) {
			return currentData.imageUrl;
		}

		if (projectImageFile) {
			return URL.createObjectURL(projectImageFile);
		}

		return null;
	});

	// Validate projectImageFile
	const isValidImageFile = useCallback(
		(file: File) => {
			if (file.size > 5 * 1024 * 1024) {
				setErrors(
					(prevErrors) =>
						new Map(
							prevErrors.set(
								'projectImage',
								t('pages.projects.basicInformationForm.errors.fileSizeLimit')
							)
						)
				);
				setProjectImageFile(null);
				return false;
			}

			if (!['image/jpeg', 'image/png'].includes(file.type)) {
				setErrors(
					(prevErrors) =>
						new Map(
							prevErrors.set(
								'projectImage',
								t('pages.projects.basicInformationForm.errors.fileFormatLimit')
							)
						)
				);
				setProjectImageFile(null);
				return false;
			}

			setErrors((prevErrors) => {
				const newErrors = new Map(prevErrors);
				newErrors.delete('projectImage');
				return newErrors;
			});

			return true;
		},
		[t]
	);

	// Project image file
	const handleProjectImageFileChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];

			if (!file) return;

			// Validation
			isValidImageFile(file);
			// setProjectImageUrl(URL.createObjectURL(file));
			setProjectImageFile(file);
			setProjectImageUrl(URL.createObjectURL(file));
		},
		[isValidImageFile]
	);

	const validateForm = () => {
		const newErrors = new Map<BasicInfoErrorKeys, string>(errors);

		// Clean up before next try
		newErrors.delete('projectImage');

		// Validate projectTitle
		validateField(
			'projectTitle',
			projectTitle,
			[
				(value) => (!value?.trim() ? t('pages.projects.basicInformationForm.errors.titleRequired') : null),
				(value) =>
					value?.length < 3 || value?.length > 100
						? 'Project title must be between 3 and 100 characters.'
						: null
			],
			newErrors
		);

		// Validate startDate (required)
		validateField(
			'dateRange',
			startDate,
			[(value) => (!value ? t('pages.projects.basicInformationForm.errors.startDateRequired') : null)],
			newErrors
		);

		// Validate endDate (required, and endDate must be after startDate)
		validateField(
			'dateRange',
			endDate,
			[
				(value) => (!value ? t('pages.projects.basicInformationForm.errors.endDateRequired') : null),
				(value) =>
					moment(startDate).isBefore(value)
						? null
						: t('pages.projects.basicInformationForm.errors.endDateAfterStart')
			],
			newErrors
		);

		// Validate websiteUrl
		validateField(
			'websiteUrl',
			websiteUrl,
			[
				(value) =>
					value && !isValidUrl(value) && t('pages.projects.basicInformationForm.errors.invalidWebsiteUrl')
			],
			newErrors
		);

		setErrors(newErrors);
		return newErrors;
	};

	const createProjectImage = useCallback(
		async (file: File) => {
			return createImageAssets(
				file,
				'project_images',
				user?.tenantId as string,
				user?.employee?.organizationId as string
			).then((image) => {
				return image;
			});
		},
		[user, createImageAssets]
	);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		const errors = validateForm();

		if (errors.size > 0) {
			return;
		}

		if (projectImageFile) {
			const image = await createProjectImage(projectImageFile).catch(() => {
				const newErrors = new Map<BasicInfoErrorKeys, string>(errors);

				newErrors.set('projectImage', t('pages.projects.basicInformationForm.errors.uploadError'));

				setErrors(newErrors);
			});

			if (!image) {
				return;
			}

			goToNext({
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				name: projectTitle,
				description,
				projectImage: image,
				projectUrl: websiteUrl
			});
		}

		goToNext({
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			name: projectTitle,
			description,
			projectUrl: websiteUrl
		});
	};

	return (
		<form onSubmit={handleSubmit} className="w-full pt-4 space-y-5">
			<div className="flex flex-col w-full gap-2">
				<label htmlFor="project_title" className="text-xs font-medium ">
					{t('pages.projects.basicInformationForm.formFields.title')}
				</label>
				<div className="w-full ">
					<InputField
						onChange={(el) => setProjectTitle(el.target.value)}
						required
						maxLength={100}
						minLength={3}
						value={projectTitle}
						id="project_title"
						placeholder={t('pages.projects.basicInformationForm.formFields.titlePlaceholder')}
						className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
						noWrapper
					/>
				</div>
			</div>
			<div className="w-full">
				<RichTextEditor defaultValue={description} onChange={(value) => setDescription(value)} />
			</div>
			<div className="flex flex-col w-full">
				<div className="flex w-full gap-2">
					<div className="flex flex-col w-full gap-1">
						<label htmlFor="project_start_date" className="text-xs font-medium">
							{t('common.START_DATE')}
						</label>
						<DatePicker
							onChange={(date) => {
								if (date) {
									setStartDate(date);
									if (endDate < date) {
										setEndDate(date);
									}
								}
							}}
							required
							value={startDate}
							id="project_start_date"
							placeholder="Pick a date"
							isStartDate={true}
						/>
					</div>
					<div className="flex flex-col w-full gap-2">
						<label htmlFor="project_end_date" className="text-xs font-medium">
							{t('common.END_DATE')}
						</label>
						<DatePicker
							onChange={(date) => {
								if (date) {
									setEndDate(date);
								}
							}}
							required
							value={endDate}
							id="project_end_date"
							placeholder="Pick a date"
							isStartDate={false}
							minDate={startDate}
						/>
					</div>
				</div>
				{errors?.get('dateRange') && (
					<p className="text-xs font-light text-red-600">{errors.get('dateRange')}</p>
				)}
			</div>
			<div className="flex flex-col w-full gap-2">
				<label htmlFor="website_url" className="text-xs font-medium ">
					{t('pages.projects.basicInformationForm.formFields.websiteUrl')}
				</label>
				<div className="w-full ">
					<InputField
						value={websiteUrl}
						onChange={(e) => setWebsiteUrl(e.target.value)}
						type="url"
						id="website_url"
						placeholder={t('pages.projects.basicInformationForm.formFields.websiteUrlPlaceholder')}
						className=" text-xs border dark:border-white   h-[2.2rem] px-4 rounded-lg bg-transparent dark:bg-transparent"
						noWrapper
					/>
				</div>
			</div>

			<div className="flex flex-col w-full gap-2">
				<span className="text-xs font-medium ">
					{t('pages.projects.basicInformationForm.formFields.projectThumbnail')}
				</span>
				<div className="flex flex-col w-full gap-1">
					<div className="flex items-center w-full gap-5">
						{projectImageUrl && (
							<div className="relative w-20 h-20 overflow-hidden rounded-lg group">
								<Image
									height={50}
									width={50}
									className="object-cover w-full h-full overflow-hidden rounded-lg aspect-square"
									src={projectImageUrl}
									alt={projectTitle}
								/>
								<div
									className={cn(
										' h-[0%] w-[0%] transition-all group-hover:w-full cursor-pointer group-hover:h-full bg-black/30 flex items-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
									)}
								>
									<X
										onClick={() => {
											setProjectImageFile(null);
											setProjectImageUrl(null);
											errors.delete('projectImage');
										}}
										size={20}
										className={cn(' text-white')}
									/>
								</div>
							</div>
						)}

						<label
							htmlFor="dropzone-file"
							className={cn(
								'flex grow flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500'
							)}
						>
							<div className="flex items-center justify-center gap-3 grow">
								<svg
									className="w-6 h-6 text-gray-500 dark:text-gray-400"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 20 16"
								>
									<path
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="1"
										d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
									/>
								</svg>
								<p className="text-sm text-gray-500 dark:text-gray-400">
									<span className="text-xs ">
										{t('pages.projects.basicInformationForm.formFields.uploadPhoto')}
									</span>
								</p>
							</div>
							<input
								onChange={handleProjectImageFileChange}
								id="dropzone-file"
								type="file"
								className="hidden"
							/>
						</label>
					</div>
					{errors?.get('projectImage') && (
						<p className="text-xs font-light text-red-600">{errors?.get('projectImage')}</p>
					)}
				</div>
			</div>
			<div className="flex items-center justify-end w-full">
				<Button loading={createImageAssetLoading} className=" h-[2.5rem]">
					{createImageAssetLoading
						? t('pages.projects.basicInformationForm.common.uploadingImage')
						: t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}

/**
 * Field validator
 */
export function validateField<ErrorKeys>(
	field: ErrorKeys,
	value: any,
	rules: Array<(value: any) => string | null>,
	errors: Map<ErrorKeys, string>
) {
	let errorMessage = null;

	for (const rule of rules) {
		errorMessage = rule(value);
		if (errorMessage) {
			break;
		}
	}

	if (errorMessage) {
		errors?.set(field, errorMessage);
	} else {
		errors?.delete(field);
	}
}

/**
 * ----------------------------------------------------------------
 * Some common components for the project creation flow.
 * ----------------------------------------------------------------
 */

/**
 * Date picker
 */

interface IDatePickerProps {
	className?: string;
	onChange?: (date?: Date) => void;
	value?: Date;
	placeholder?: string;
	disabled?: boolean;
	required?: boolean;
	id?: string;
	isStartDate?: boolean;
	minDate?: Date;
}

export function DatePicker(props: IDatePickerProps) {
	const { className, onChange, value, placeholder, disabled, required, id, isStartDate, minDate } = props;
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const disabledDays = useMemo(() => {
		if (isStartDate) {
			return { before: today };
		} else if (minDate) {
			return { before: minDate };
		}
		return undefined;
	}, [isStartDate, minDate, today]);

	return (
		<Popover className={cn('relative w-full border rounded-lg p-2')}>
			<Popover.Button
				className={cn(
					'w-full flex items-center justify-between text-left',
					!value && 'text-muted-foreground',
					className
				)}
				disabled={disabled}
			>
				{value ? format(value, 'PPP') : <span className="text-xs">{placeholder}</span>}
				<CalendarIcon size={15} />
			</Popover.Button>
			<Popover.Panel className="absolute right-0 z-50 w-auto p-0 bg-white border rounded-lg shadow-md dark:bg-dark--theme top-11">
				<Calendar
					id={id}
					required={required}
					disabled={disabled || disabledDays}
					mode="single"
					selected={value}
					onSelect={onChange}
					initialFocus
					fromDate={isStartDate ? today : minDate}
				/>
			</Popover.Panel>
		</Popover>
	);
}
/**
 * Select (mono / multi)
 * With:
 * - Search
 * - Create new term if not found in the search results
 */

export interface Identifiable {
	id: string;
	value: string | number;
}
interface ISelectProps<IItem> {
	options: IItem[];
	selected: string | string[] | null;
	placeholder?: string;
	className?: string;
	onChange?: (value: string | string[]) => void;
	multiple?: boolean;
	renderItem?: (item: IItem, selected: boolean, active: boolean) => React.ReactNode;
	renderValue?: (value: string | string[] | null) => React.ReactNode;
	searchEnabled?: boolean;
	onCreate?: (newTerm: string) => void;
	createLoading?: boolean;
}

export function Select<T extends Identifiable>(props: ISelectProps<T>) {
	const {
		options,
		placeholder,
		className,
		selected,
		onChange,
		renderItem,
		multiple,
		searchEnabled,
		onCreate,
		createLoading,
		renderValue
	} = props;
	// When search enabled
	const [searchTerm, setSearchTerm] = useState('');
	const [filteredItems, setFilteredItems] = useState<T[]>([]);

	const isMulti = multiple ?? false;

	useEffect(() => {
		if (searchTerm.length) {
			setFilteredItems(
				options?.filter((el) => String(el.value).toLowerCase().includes(searchTerm.toLowerCase()))
			);
		} else {
			setFilteredItems(options);
		}
	}, [searchTerm, options]);

	const items = searchEnabled && searchTerm.length ? filteredItems : options ?? [];

	// Dynamic heigh calculation based on number of items
	const maxVisibleItems = 7;
	const itemHeight = 1.5; //rem
	const listHeight = items?.length > maxVisibleItems ? '12rem' : `${items?.length * itemHeight}rem`;

	return (
		<div className="relative">
			<Listbox multiple={isMulti} value={selected} onChange={onChange}>
				<Listbox.Button
					className={cn(
						'w-full border rounded-lg flex items-center justify-between text-left px-2 py-1 text-xs h-[2.2rem]',
						className
					)}
				>
					{renderValue ? (
						renderValue(selected)
					) : (
						<span className={cn(' capitalize', !selected?.length && 'text-gray-400')}>
							{isMulti ? placeholder : options?.find((el) => el.id == selected)?.value || placeholder}
						</span>
					)}

					<ChevronDown size={15} className="text-gray-400 " />
				</Listbox.Button>
				<Listbox.Options
					className={cn(
						'absolute z-20 text-xs top-11 border space-y-1 w-full bg-white dark:bg-dark--theme rounded-md p-1 shadow-md'
					)}
				>
					{searchEnabled && (
						<div className="w-full flex border dark:border-white rounded-md   h-[2rem] items-center px-1">
							<Search size={15} className=" text-slate-300" />
							<InputField
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
								}}
								placeholder={items?.length == 0 ? 'Type new ...' : 'Search ...'}
								className="h-full text-xs bg-transparent border-none dark:bg-transparent"
								noWrapper
							/>
						</div>
					)}

					<ScrollArea style={{ height: listHeight }}>
						{items?.map((item) => (
							<Listbox.Option key={item?.id} value={item?.id} as={Fragment}>
								{({ active, selected: isSelected }) => (
									<li className={cn('text-xs cursor-pointer rounded ')}>
										{renderItem ? (
											renderItem(item, isSelected, active)
										) : isMulti ? (
											// Default multi-select render
											<div className="flex items-center w-full h-full gap-2 p-1 px-2">
												<span
													className={cn(
														'h-4 w-4 rounded border border-primary flex items-center justify-center',
														isSelected &&
															'bg-primary text-primary-foreground dark:text-white'
													)}
												>
													{isSelected && <CheckIcon className=" dark:text-white" size={10} />}
												</span>
												<span className="capitalize dark:text-white">{item?.value ?? '-'}</span>
											</div>
										) : (
											// Default single-select render
											<div
												className={cn(
													'w-full h-full p-1 px-2 flex items-center gap-2 rounded',
													isSelected && 'bg-primary text-primary-foreground dark:text-white'
												)}
											>
												{isSelected && <CheckIcon size={10} />}
												<span className={cn(' capitalize', selected && !isSelected && 'pl-5')}>
													{item?.value ?? '-'}
												</span>
											</div>
										)}
									</li>
								)}
							</Listbox.Option>
						))}
						<ScrollBar className="-pl-7" />
					</ScrollArea>
					{searchEnabled && items?.length == 0 && onCreate && (
						<div className="flex items-center justify-center w-full h-[2.2rem] px-1 py-2">
							<Button
								type="button"
								loading={createLoading}
								onClick={() => onCreate?.(searchTerm)}
								variant="outline"
								className="w-full h-full text-xs"
							>
								Add new
							</Button>
						</div>
					)}
				</Listbox.Options>
			</Listbox>
		</div>
	);
}

/**
 * Show image or identifier letters
 */

interface IThumbnailProps {
	imgUrl?: string;
	identifier: string;
	size?: number | string;
	className?: string;
}

export function Thumbnail(props: IThumbnailProps) {
	const { imgUrl, identifier, size = 15, className } = props;
	return (
		<div
			style={{
				width: size,
				height: size
			}}
			className={cn(
				'rounded-md flex items-center justify-center overflow-hidden',
				!imgUrl && 'border',
				className
			)}
		>
			{imgUrl ? (
				<Image
					className="object-cover w-full h-full rounded-md"
					src={imgUrl}
					alt={identifier}
					width={40}
					height={40}
				/>
			) : (
				<span className=" text-[.5rem] uppercase">{identifier.substring(0, 2)}</span>
			)}
		</div>
	);
}
