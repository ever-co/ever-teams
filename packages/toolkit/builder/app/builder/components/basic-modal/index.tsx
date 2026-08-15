import React from 'react';
import { Dialog } from '@ever-teams/toolkit-ui';

export function BasicModal() {
	const [isOpen, setIsOpen] = React.useState(false);

	const openModal = () => setIsOpen(true);
	return (
		<div className="bg-white w-full flex items-center flex-col ">
			<Dialog
				title={'Title Modal'}
				className=" bg-white p-5 rounded-xl w-52 h-1/2  md:w-40 md:min-w-[24rem] justify-start shadow-xl"
				titleClass="font-bold"
				open={isOpen}
			>
				<div className="text-sm  h md:w-full  flex flex-col justify-between gap-4">
					<h1>Hello Teams UI</h1>
				</div>
			</Dialog>
			<button className="bg-purple-950 rounded-md p-4 text-white" onClick={openModal}>
				Open Modal
			</button>
		</div>
	);
}
