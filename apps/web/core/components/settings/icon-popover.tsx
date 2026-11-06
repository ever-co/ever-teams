import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { ChevronDown } from '@/core/components/icons';
import { controlRecipe } from '@/core/components/common/input';
import { Divider } from '@/core/components';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { IconItem, IIcon } from './icon-items';
import { InputField } from '../duplicated-components/_input';
import { Tooltip } from '../duplicated-components/tooltip';

const TRIGGER_FIELD_CLASS = clsxm(controlRecipe, 'relative flex h-9 cursor-pointer items-center justify-between');

const IconPopover = ({
	setValue,
	active,
	iconList
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IIcon | null;
	iconList: IIcon[];
}) => {
	const [iconOption, setIconOption] = useState<IIcon[]>(iconList);

	const [values, setValues] = useState<IIcon | null>(null);
	const onSelect = (ic: IIcon) => {
		setValues(ic);
		setValue('icon', ic.path);
		buttonRef.current?.click();
	};

	useEffect(() => {
		if (active) {
			setValues(iconList.find((icon: IIcon) => icon?.title === active?.title) || null);
		}
	}, [active, iconList]);

	const buttonRef = useRef<HTMLButtonElement>(null);
	return (
		<Popover className="relative border-none no-underline w-[auto]" onProgressCapture={(e) => e.stopPropagation()}>
			{() => (
				<>
					<PopoverButton
						className="w-full rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
						ref={buttonRef}
					>
						<div className={TRIGGER_FIELD_CLASS}>
							<div className="flex h-full min-w-0 items-center gap-2 pl-2.5 text-foreground">
								<IconItem
									title={values?.title ? values.title.split('-').join(' ') : 'Icons'}
									className="w-full py-0 mb-0 cursor-pointer"
									url={values?.fullUrl ? values.fullUrl : ''}
								/>
							</div>
							<div className="mr-2.5 flex">
								<ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
							</div>
						</div>
					</PopoverButton>
					<Transition
						as="div"
						enter="transition-[opacity,scale] ease-out duration-150"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="transition-[opacity,scale] ease-in duration-150"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<PopoverPanel className="absolute left-1/2 z-10 mt-1 w-[375px] max-w-sm -translate-x-1/2 transform sm:px-0 lg:max-w-3xl">
							<div className="rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-md shadow-black/6.5 hairline-ring ring-border">
								<div className="pb-2">
									<InputField
										type="search"
										wrapperClassName="mb-0"
										placeholder="Search Icon"
										className="h-8"
										// trailingNode={
										// 	<Tooltip
										// 		enabled={true}
										// 		placement="top"
										// 		label="Upload your own icon"
										// 		className="mr-5"
										// 	>
										// 		<div className="relative cursor-pointer">
										// 			<DocumentUploadIcon className="w-5 h-5" />
										// 			<input
										// 				type="file"
										// 				className="absolute inset-0 opacity-0"
										// 				accept="image/svg+xml"
										// 			/>
										// 		</div>
										// 	</Tooltip>
										// }
										onChange={(e) => {
											setIconOption(
												iconList.filter((icon) =>
													icon.title
														.toLocaleLowerCase()
														.split('-')
														.join(' ')
														.includes(e.target.value.toLocaleLowerCase())
												)
											);
										}}
									/>
								</div>

								<Divider />
								<div className="mt-2.5 h-[245px] scroll-custom overflow-auto">
									<div className="flex gap-y-[10px] flex-wrap">
										{iconOption?.map((ic, index) => {
											return (
												<Tooltip
													label={ic.title.split('-').join(' ')}
													className="capitaliz"
													placement={'auto'}
													key={index}
												>
													<div
														className="flex size-12 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-foreground/5"
														key={index}
														onClick={() => onSelect(ic)}
													>
														{ic.fullUrl && (
															<Image
																src={ic.fullUrl}
																alt={ic.title}
																width={20}
																height={20}
																decoding="async"
																data-nimg="1"
																loading="lazy"
																className="min-h-[20px] dark:invert"
															/>
														)}
													</div>
												</Tooltip>
											);
										})}
									</div>
								</div>
							</div>
						</PopoverPanel>
					</Transition>
				</>
			)}
		</Popover>
	);
};

export default IconPopover;
