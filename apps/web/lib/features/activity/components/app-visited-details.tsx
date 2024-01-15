import { useModal } from '@app/hooks';
// import { useTimeDailyActivity } from '@app/hooks/features/useTimeDailyActivity';
import { Modal } from 'lib/components';
import React, { PropsWithChildren } from 'react';

export function AppVisitedModal({ children }: PropsWithChildren) {
	const { closeModal, isOpen, openModal } = useModal();
	// const { visitedAppDetail, loading } = useTimeDailyActivity('APP');
	return (
		<div>
			<div onClick={openModal}>{children}</div>
			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				title="Screenshots detail"
				className="bg-white dark:bg-[#343434d4] p-4 rounded-lg lg:w-[60vw] xl:w-[50vw] 2xl:w-[40vw] m-8"
			>
				{/* {loading ? (
					<div>Loading ...</div>
				) : (
					<div>
						<h3>{visitedAppDetail.title}</h3>
						<p>{visitedAppDetail.description}</p>
						<div>
							<span>{visitedAppDetail.isActive && 'Active'}</span>
						</div>
					</div>
				)} */}
			</Modal>
		</div>
	);
}
