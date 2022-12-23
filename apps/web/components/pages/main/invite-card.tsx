import { useState, Fragment } from 'react';
import Separator from '../../common/separator';
import Invite from '../../invite/invite';

const InviteCard = () => {
	const [isOpen, setIsOpen] = useState(false);

	const closeModal = () => {
		setIsOpen(false);
	};

	const openModal = () => {
		setIsOpen(true);
	};
	return (
		<div className="w-full rounded-[15px] bg-[#FFFFFF] my-[15px] dark:bg-[#202023] flex justify-between text-primary border border-white dark:border-[#202023] hover:border-primary dark:hover:border-gray-100  font-bold py-[24px] dark:text-[#FFFFFF]">
			<div className="w-[60px]  flex justify-center items-center">
				<div className="rounded-[50%] w-5 h-5 bg-[#E8EBF8]"></div>
			</div>
			<div className="w-[235px] h-[48px] flex items-center justify-center">
				<div className="flex justify-center items-center">
					<button
						onClick={openModal}
						className="text-center bg-primary dark:bg-white dark:text-black w-[105px] text-[#FFFFFF] h-[35px] rounded-[8px]"
					>
						Invite
					</button>
				</div>
				<div className="w-[137px] mx-[20px] h-[48px] flex justify-center items-center"></div>
			</div>
			<Separator />
			<div className="w-[334px]  font-light text-normal px-[14px]"> </div>
			<Separator />
			<div className="w-[122px]  text-center flex justify-center items-center"></div>
			<Separator />
			<div className="w-[245px]  flex justify-center items-center">
				<div>
					<div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[245px] h-[8px] rounded-full text-center" />
					<div className="text-center text-[14px] text-[#9490A0] py-1 font-light"></div>
				</div>
			</div>
			<Separator />
			<div className="w-[184px]  flex items-center">
				<div className="w-[177px] text-center text-"> </div>
				<div></div>
			</div>
			<Invite
				task={null}
				isOpen={isOpen}
				closeModal={closeModal}
				Fragment={Fragment}
			/>
		</div>
	);
};

export default InviteCard;
