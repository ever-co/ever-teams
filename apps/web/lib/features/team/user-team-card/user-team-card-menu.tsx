import { mergeRefs } from '@app/helpers';
import { I_TeamMemberCardHook, I_TMCardTaskEditHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import { Card, Text } from 'lib/components';
import { MoreIcon } from 'lib/components/svgs';

type Props = IClassName & {
	memberInfo: I_TeamMemberCardHook;
	edition: I_TMCardTaskEditHook;
};

export function UserTeamCardMenu(props: Props) {
	return (
		<div className="absolute right-2">
			<DropdownMenu {...props} />
		</div>
	);
}

function DropdownMenu({ edition }: Props) {
	const menu = [
		{
			name: 'Edit Task',
			closable: true,
			onclick: () => {
				edition.setEditMode(true);
			},
		},
		{
			name: 'Estimate',
			closable: true,
			onclick: () => {
				edition.setEstimateEditMode(true);
			},
		},
		{ name: 'Assign Task' },
		{ name: 'Unassign Task' },
		{ name: 'Make a Manager' },
		{ name: 'Remove', type: 'danger' },
	];
	return (
		<Popover
			className="relative"
			ref={mergeRefs([
				edition.estimateEditIgnoreElement.ignoreElementRef,
				edition.taskEditIgnoreElement.ignoreElementRef,
			])}
		>
			<Popover.Button className="flex items-center outline-none border-none">
				<MoreIcon />
			</Popover.Button>

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-0 min-w-[210px]"
			>
				<Popover.Panel>
					{({ close }) => {
						return (
							<Card shadow="custom" className="shadow-xlcard !py-3 !px-4">
								<ul>
									{menu.map((item, i) => {
										return (
											<li key={i}>
												<button
													className="mb-2"
													onClick={() => {
														item.onclick && item.onclick();
														item.closable && close();
													}}
												>
													<Text
														className={clsxm(
															'font-normal whitespace-nowrap hover:font-semibold hover:transition-all',
															item.type === 'danger' && ['text-red-500']
														)}
													>
														{item.name}
													</Text>
												</button>
											</li>
										);
									})}
								</ul>
							</Card>
						);
					}}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}
