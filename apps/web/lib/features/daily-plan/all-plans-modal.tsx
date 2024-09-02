import { Card, Modal, VerticalSeparator } from 'lib/components';
import { useCallback, useMemo, useState } from 'react';
import { clsxm } from '@app/utils';
import { Text } from 'lib/components';
import { ChevronRightIcon } from 'assets/svg';

interface IAllPlansModal {
	closeModal: () => void;
	isOpen: boolean;
}

/**
 * A modal that displays all the plans available to the user (Today, Tomorrow and Future).
 *
 *
 * @param {Object} props - The props Object
 * @param {boolean} props.open - If true open the modal otherwise close the modal
 * @param {() => void} props.closeModal - A function to close the modal
 *
 * @returns {JSX.Element} The modal element
 */
export function AllPlansModal(props: IAllPlansModal) {
	const { isOpen, closeModal } = props;

	const [selectedTab, setSelectedPlan] = useState(0);

	const handleCloseModal = useCallback(() => {
		closeModal();
	}, [closeModal]);

	const tabs = useMemo(
		() => [
			{
				name: 'Today'
			},
			{
				name: 'Tomorrow'
			},
			{
				name: 'Future'
			}
		],
		[]
	);

	return (
		<Modal isOpen={isOpen} closeModal={handleCloseModal} className={clsxm('w-[36rem]')}>
			<Card className="w-full  h-full overflow-hidden" shadow="custom">
				<div className="w-full flex flex-col gap-3 ">
					<div className="relative w-full h-12  flex items-center justify-center">
						<button className=" absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
							<span className="rotate-180">
								<ChevronRightIcon className="w-4  h-4 stroke-[#B1AEBC]" />
							</span>
							<span>Back</span>
						</button>
						<Text.Heading as="h3" className="uppercase text-center">
							Plan for 12/04/2024
						</Text.Heading>
					</div>
					<div className="w-full h-14 flex items-center px-3">
						<ul className="w-full flex items-center gap-3">
							{tabs.map((tab, index) => (
								<li
									key={index}
									className={`flex justify-center gap-4 items-center hover:text-primary cursor-pointer ${selectedTab === index ? 'text-primary font-medium' : ''}`}
									onClick={() => setSelectedPlan(index)}
								>
									<span>{tab.name}</span>
									{index + 1 < tabs.length && <VerticalSeparator />}
								</li>
							))}
						</ul>
					</div>
					<div className="w-full h-[28rem]">Contents</div>
				</div>
			</Card>
		</Modal>
	);
}
