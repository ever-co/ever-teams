import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Divider } from './divider';
import { Text } from './typography';
interface isProps {
	title: string;
	children: React.ReactNode;
	className: string;
	isDanger?: boolean;
	id?: string;
}
export const Accordian = ({ children, title, className, isDanger, id }: isProps) => {
	return (
		<div className="w-full" id={id}>
			<div
				className={`rounded-2xl p-2 ${className} shadow-[0px 14px 34px rgba(0, 0, 0, 0.05)] bg-light--theme-light dark:bg-dark--theme-light`}
			>
				<Disclosure defaultOpen>
					{({ open }) => (
						<>
							<Disclosure.Button className="flex w-full justify-between rounded-lg px-4 py-2 text-left text-sm font-medium  hover:bg-white items-center pt-[0.15rem] pb-0 h-[3.81rem] bg-light--theme-light dark:bg-dark--theme-light">
								<Text
									className={`text-2xl font-medium dark:text-white  text-center sm:text-left ${
										isDanger ? 'text-[#EB6961]' : 'text-[#282048]'
									}`}
								>
									{title}
								</Text>

								<ChevronUpIcon
									className={`${
										open ? 'rotate-180 transform' : ''
									} h-5 w-5 text-[#292D32] dark:text-white`}
								/>
							</Disclosure.Button>

							<Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-500 ">
								<Divider />
								{children}
							</Disclosure.Panel>
						</>
					)}
				</Disclosure>
			</div>
		</div>
	);
};
