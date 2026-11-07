/* eslint-disable react-hooks/exhaustive-deps */
// import { InputField } from '@/core/components';
import RichTextEditor from '../text-editor';
// import { Calendar } from '@/core/components/ui/calendar';
import { cn } from '@/core/lib/helpers';
import { Calendar as CalendarIcon, Spinner, Upload, X } from '@/core/components/icons';
import { differenceInDays, format, isAfter, isEqual, addDays } from 'date-fns';
import { FormEvent, useCallback, useMemo, useState } from 'react';
import { IStepElementProps } from '../container';
import Image from 'next/image';
import { isValidUrl } from '@/core/lib/utils';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-area';
import { useTranslations } from 'next-intl';
import { useAuthenticateUser } from '@/core/hooks';
import { useImageAssets } from '@/core/hooks/common/use-image-assets';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { getInitialValue } from '@/core/lib/helpers/create-project';
import { InputField } from '@/core/components/duplicated-components/_input';
import { DictationButton } from '@/core/components/common/dictation-button';
import { appendDictatedText } from '@/core/hooks/ai/use-dictation';
import { Button as ShadcnButton, type ButtonSize } from '@/core/components/duplicated-components/_button';
import { Calendar } from '@/core/components/common/calendar';
import {
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalTitleFieldClass
} from '@/core/components/common/modal';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	loading?: boolean;
	variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
	size?: ButtonSize;
}

const Button = ({ children, loading, className, ...props }: ButtonProps) => {
	return (
		<ShadcnButton className={cn('relative', className)} disabled={loading} {...props}>
			{loading && <Spinner className="animate-spin" />}
			{children}
		</ShadcnButton>
	);
};

const PROJECT_TITLE_MAX_LENGTH = 100;
type BasicInfoErrorKeys = 'dateRange' | 'websiteUrl' | 'projectTitle' | 'projectImage' | 'description' | 'taskKey';

/** A project's task key: 2 to 10 upper-case letters or digits, starting with a letter (the platform's own rule). */
const TASK_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

/** The key the platform proposes for a title (its first three letters or digits), shown as the field's placeholder. */
function proposedTaskKey(title: string): string {
	const compact = title.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3);
	if (TASK_KEY_PATTERN.test(compact)) return compact;
	return title.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3);
}

export default function BasicInformationForm(props: IStepElementProps) {
	const { goToNext, currentData, mode } = props;
	const [startDate, setStartDate] = useState(() => getInitialValue(currentData, 'startDate', new Date()));
	// Default the end date to a week out: the validator below requires end > start (strictly), so a
	// same-day default made every fresh wizard fail step 1 with "End date must be after start date".
	const [endDate, setEndDate] = useState(() => getInitialValue(currentData, 'endDate', addDays(new Date(), 7)));
	const [projectTitle, setProjectTitle] = useState(() => getInitialValue(currentData, 'name', ''));
	const [description, setDescription] = useState(() => getInitialValue(currentData, 'description', ''));
	const appendDictatedTitle = (text: string) => {
		setProjectTitle((current: string) => {
			const nextTitle = appendDictatedText(current, text);
			return nextTitle.slice(0, PROJECT_TITLE_MAX_LENGTH);
		});
	};
	const [projectImageFile, setProjectImageFile] = useState<File | null>(null);
	const [websiteUrl, setWebsiteUrl] = useState<string>(() => getInitialValue(currentData, 'projectUrl', ''));
	const [taskKey, setTaskKey] = useState<string>(() => String(getInitialValue(currentData, 'taskKey', '') ?? ''));
	const [errors, setErrors] = useState<Map<BasicInfoErrorKeys, string>>(new Map());
	const [descriptionValid, setDescriptionValid] = useState(true);
	const t = useTranslations();
	const { createImageAssets, loading: createImageAssetLoading } = useImageAssets();
	const { user } = useAuthenticateUser();
	const [projectImageUrl, setProjectImageUrl] = useState(() => {
		if (mode == 'edit' && currentData?.imageUrl) {
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

		// The task key: empty (the platform proposes one) or a valid key.
		const key = taskKey.trim().toUpperCase();
		if (key && !TASK_KEY_PATTERN.test(key)) {
			newErrors.set('taskKey', t('pages.projects.basicInformationForm.errors.taskKeyInvalid'));
		} else {
			newErrors.delete('taskKey');
		}

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
				(value) => {
					if (!value || !startDate) return null;
					const daysDifference = differenceInDays(new Date(value), new Date(startDate));
					if (daysDifference <= 0) {
						return t('pages.projects.basicInformationForm.errors.endDateAfterStart');
					}
					// Warning for very short projects (less than 1 day)
					if (daysDifference < 1) {
						return 'Project duration should be at least 1 day for proper planning.';
					}
					return null;
				}
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

		// Validate description word limit
		if (!descriptionValid) {
			newErrors.set('description', t('pages.projects.basicInformationForm.errors.descriptionWordLimit'));
		} else {
			newErrors.delete('description');
		}

		setErrors(newErrors);
		return newErrors;
	};

	const createProjectImage = useCallback(
		async (file: File) => {
			return createImageAssets(file, 'project_images').then((image) => {
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

			goToNext?.({
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				name: projectTitle,
				description,
				projectImage: image,
				projectUrl: websiteUrl,
				taskKey: taskKey.trim().toUpperCase() || undefined
			});
			return;
		}

		goToNext?.({
			startDate: startDate.toISOString(),
			endDate: endDate.toISOString(),
			name: projectTitle,
			description,
			projectUrl: websiteUrl,
			taskKey: taskKey.trim().toUpperCase() || undefined
		});
	};

	return (
		<form onSubmit={handleSubmit} className="pt-4 w-full flex flex-col">
			<ScrollArea className="w-full max-h-[65vh] pr-4">
				<div className="space-y-5 pb-32">
					<div className="flex flex-col gap-2 w-full">
						<label htmlFor="project_title" className="sr-only">
							{t('pages.projects.basicInformationForm.formFields.title')}
						</label>
						<div className="flex w-full items-center gap-2">
							<InputField
								onChange={(el) => setProjectTitle(el.target.value)}
								required
								maxLength={PROJECT_TITLE_MAX_LENGTH}
								minLength={3}
								value={projectTitle}
								id="project_title"
								placeholder={t('pages.projects.basicInformationForm.formFields.titlePlaceholder')}
								className={modalTitleFieldClass}
								noWrapper
							/>
							<DictationButton onText={appendDictatedTitle} />
						</div>
					</div>
					<div className="flex flex-col gap-1 w-full">
						<label htmlFor="project_task_key" className={modalFieldLabelClass}>
							{t('pages.projects.basicInformationForm.formFields.taskKey')}
						</label>
						<InputField
							id="project_task_key"
							value={taskKey}
							onChange={(el) => setTaskKey(el.target.value.toUpperCase())}
							maxLength={10}
							placeholder={proposedTaskKey(projectTitle) || 'WEB'}
							aria-describedby="project_task_key_help"
							noWrapper
						/>
						<p id="project_task_key_help" className="text-xs text-muted-foreground">
							{t('pages.projects.basicInformationForm.formFields.taskKeyHelp', { example: `${taskKey.trim() || proposedTaskKey(projectTitle) || 'WEB'}-42` })}
						</p>
						{errors?.get('taskKey') && <p className="text-xs text-destructive-ink">{errors.get('taskKey')}</p>}
					</div>
					<div className="w-full flex flex-col gap-1">
						<RichTextEditor
							defaultValue={description}
							onChange={(value) => setDescription(value)}
							onValidityChange={setDescriptionValid}
							title={projectTitle}
						/>
						{errors?.get('description') && (
							<p className="text-xs text-destructive-ink">{errors.get('description')}</p>
						)}
					</div>
					<div className="flex flex-col gap-1 w-full">
						<div className="flex gap-3 w-full">
							<div className="flex flex-col gap-2 w-full">
								<label htmlFor="project_start_date" className={modalFieldLabelClass}>
									{t('common.START_DATE')}
								</label>
								<DatePicker
									onChange={(date) => {
										if (date) {
											setStartDate(date);
											// Smart logic: adjust End Date if necessary (if no End Date or Start Date >= End Date)
											if (!endDate || isAfter(date, endDate) || isEqual(date, endDate)) {
												// If no End Date or Start Date >= End Date,
												// set End Date to 1 month after Start Date (typical project duration)
												const suggestedEndDate = new Date(date);
												suggestedEndDate.setMonth(suggestedEndDate.getMonth() + 1);
												setEndDate(suggestedEndDate);
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
							<div className="flex flex-col gap-2 w-full">
								<label htmlFor="project_end_date" className={modalFieldLabelClass}>
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
							<p className="text-xs text-destructive-ink">{errors.get('dateRange')}</p>
						)}
					</div>
					<div className="flex flex-col gap-2 w-full">
						<label htmlFor="website_url" className={modalFieldLabelClass}>
							{t('pages.projects.basicInformationForm.formFields.websiteUrl')}
						</label>
						<div className="w-full">
							<InputField
								value={websiteUrl}
								onChange={(e) => setWebsiteUrl(e.target.value)}
								type="url"
								id="website_url"
								placeholder={t('pages.projects.basicInformationForm.formFields.websiteUrlPlaceholder')}
								noWrapper
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2 w-full">
						<span className={modalFieldLabelClass}>
							{t('pages.projects.basicInformationForm.formFields.projectThumbnail')}
						</span>
						<div className="flex flex-col gap-1 w-full">
							<div className="flex gap-4 items-center w-full">
								{projectImageUrl && (
									<div className="overflow-hidden relative w-20 h-20 rounded-lg hairline-ring ring-border group">
										<Image
											height={50}
											width={50}
											className="object-cover overflow-hidden w-full h-full rounded-lg aspect-square"
											src={projectImageUrl}
											alt={projectTitle}
										/>
										<div className="flex absolute inset-0 justify-center items-center transition-colors group-hover:bg-black/40">
											<X
												onClick={() => {
													setProjectImageFile(null);
													setProjectImageUrl(null);
													setErrors((prev) => {
														const newErrors = new Map(prev);
														newErrors.delete('projectImage');
														return newErrors;
													});
												}}
												className="text-white cursor-pointer size-5"
											/>
										</div>
									</div>
								)}

								<label
									htmlFor="dropzone-file"
									className="flex flex-col justify-center items-center w-full h-20 rounded-lg hairline-border border-dashed transition-colors cursor-pointer grow border-border bg-foreground/[0.02] hover:bg-foreground/[0.04]"
								>
									<div className="flex gap-2 justify-center items-center grow">
										<Upload className="size-5 text-muted-foreground" aria-hidden="true" />
										<p className="text-sm text-muted-foreground">
											<span className="text-xs">
												{t('pages.projects.basicInformationForm.formFields.uploadPhoto')}
											</span>
										</p>
									</div>
									<input
										onChange={handleProjectImageFileChange}
										id="dropzone-file"
										type="file"
										accept="image/jpeg,image/png"
										className="hidden"
									/>
								</label>
							</div>
							{errors?.get('projectImage') && (
								<p className="text-xs text-destructive-ink">{errors?.get('projectImage')}</p>
							)}
						</div>
					</div>
				</div>
				<ScrollBar orientation="vertical" />
			</ScrollArea>
			<div className={cn(modalFooterClass, 'hairline-t border-border pt-4')}>
				<Button loading={createImageAssetLoading} size="default" className={modalPrimaryActionClass}>
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

	// Smart logic for projects
	const disabledDays = useMemo(() => {
		if (!isStartDate && minDate) {
			// For End Date : disable dates before Start Date
			return { before: minDate };
		}
		// For Start Date : no restriction (total flexibility for projects)
		return undefined;
	}, [isStartDate, minDate]);

	// Reasonable year range for projects (5 years in the past, 10 years in the future)
	const currentYear = new Date().getFullYear();
	const fromYear = currentYear - 5;
	const toYear = currentYear + 10;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="lg"
					className={cn(
						'w-full justify-between px-3 font-normal text-left',
						!value && 'text-muted-foreground',
						className
					)}
					disabled={disabled}
				>
					{value && format(value, 'PPP')}
					{!value && <span>{placeholder}</span>}
					<CalendarIcon className="text-muted-foreground" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0 w-auto" align="start">
				<Calendar
					id={id}
					required={required}
					disabled={disabled || disabledDays}
					mode="single"
					selected={value}
					onSelect={onChange}
					initialFocus
					fromYear={fromYear}
					toYear={toYear}
					captionLayout="dropdown-buttons"
				/>
			</PopoverContent>
		</Popover>
	);
}

export type { Identifiable } from './select';
export { Select } from './select';

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
				!imgUrl && 'hairline-border',
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
