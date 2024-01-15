import { useModal } from '@app/hooks';
import { Modal } from 'lib/components';
import React, { PropsWithChildren } from 'react';

const UserTeamCardActivity = ({ children, id }: PropsWithChildren<{ id: string | undefined }>) => {
	const { closeModal, isOpen, openModal } = useModal();
	return (
		<div>
			<div onClick={openModal}>{children}</div>
			<Modal
				isOpen={isOpen}
				closeModal={closeModal}
				title="Activity detail"
				className="bg-white dark:bg-[#343434d4] p-4 rounded-lg lg:w-[60vw] xl:w-[50vw] 2xl:w-[40vw] m-8"
			>
				Details {id}
			</Modal>
		</div>
	);
};

export default UserTeamCardActivity;
