import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Text } from './typography';

interface isProps {
	title: any;
	children?: React.ReactNode;
	className: string;
	wrapperClassName?: string;
	textClassName?: string;
}
export const SidebarAccordian = ({ children, title, className, wrapperClassName, textClassName }: isProps) => {
	return (
		<div className="w-full ">
			<div
				className={`rounded-2xl bg-[transparent]  ${className} shadow-[0px_14px_34px_rgba(0,0,0,0.05)] dark:bg-dark--theme `}
			>
				<Disclosure defaultOpen>
					{({ open }) => (
						<>
							<Disclosure.Button
								className={`flex w-full justify-between rounded-lg px-4 py-2 text-left font-medium items-center ${wrapperClassName} pt-[0.15rem] pb-0 ${open ? 'text-[#3826a6] border-l-solid border-l-primary bg-[#E9E5F9] dark:bg-[#6755C9]' : 'border-l-transparent'}`}
							>
								<Text
									className={`text-base dark:text-white  text-center sm:text-left flex items-center gap-2 ${textClassName}`}
								>
									{title}
								</Text>

								<ChevronUpIcon
									className={`${
										!open ? 'rotate-180 transform' : ''
									} h-5 w-5 text-[#292D32] dark:text-white`}
								/>
							</Disclosure.Button>
							{children && (
								<Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500 dark:bg-dark--theme shadow-[0px_14px_34px_rgba(0,0,0,0.05)] bg-light--theme-light dark:bg-dark--theme-light ">
									{children}
								</Disclosure.Panel>
							)}
						</>
					)}
				</Disclosure>
			</div>
		</div>
	);
};
