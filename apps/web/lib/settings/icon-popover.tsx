import { IIcon } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Divider, InputField, Tooltip } from 'lib/components';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import Image from 'next/image';
import { Fragment, useEffect, useRef, useState } from 'react';
import { IconItem } from './icon-items';

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

	const buttonRef = useRef<any>();
	return (
		<Popover className="relative border-none no-underline w-[auto]">
			{() => (
				<>
					<Popover.Button className="outline-none w-full" ref={buttonRef}>
						<div className="cursor-pointer relative w-[100%] h-[54px] border border-[#00000021] dark:border-[#34353D] rounded-xl flex items-center justify-between">
							<div className="flex gap-[8px] h-[40px] items-center pl-[15px]">
								<IconItem
									title={values?.title ? values.title.split('-').join(' ') : 'Icons'}
									className="w-full cursor-pointer py-2 mb-0"
									url={values?.fullUrl ? values.fullUrl : ''}
								/>
							</div>
							<div className="flex mr-[0.5rem] gap-3">
								<ChevronDownIcon
									className={clsxm(
										'ml-2 h-5 w-5 dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80'
									)}
									aria-hidden="true"
								/>
							</div>
						</div>
					</Popover.Button>
					<Transition
						as={Fragment}
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<Popover.Panel className="absolute left-1/2 z-10 mt-0 w-[375px] max-w-sm -translate-x-1/2 transform  sm:px-0 lg:max-w-3xl shandow ">
							<div className="bg-light--theme-light shadow dark:bg-[#E7E7EA] rounded-[10px] text-[14px] font-light p-[16px]">
								<div className="text-[18px] text-[#7E7991] font-[500]">
									<InputField
										type="search"
										wrapperClassName="search-border bg-transparent dark:bg-[#E7E7EA]"
										placeholder="Search Icon"
										className="px-0 dark:bg-[#E7E7EA] rounded-none"
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
								<div className="mt-[10px] h-[245px] scroll-custom overflow-auto">
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
														className="hover:bg-[#F1EDFD] rounded-[10px] h-[48px] w-[48px] hover:cursor-pointer flex items-center justify-center"
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
																className="min-h-[20px]"
															/>
														)}
													</div>
												</Tooltip>
											);
										})}
									</div>
								</div>
							</div>
						</Popover.Panel>
					</Transition>
				</>
			)}
		</Popover>
	);
};

export default IconPopover;
