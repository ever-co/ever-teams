import InviteModal from '@/core/components/features/teams/invite-modal';
import Separator from '@/core/components/common/separator';
import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';

const InviteCard = () => {
	const [isOpen, setIsOpen] = useState(false);
	const t = useTranslations();

	const closeModal = () => {
		setIsOpen(false);
	};

	const openModal = () => {
		setIsOpen(true);
	};
	return (
		<div className="my-3 flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-card py-3 text-primary hover:border-primary dark:text-foreground">
			<div className="w-[60px]  flex justify-center items-center">
				<div className="rounded-[50%] w-5 h-5 bg-[#E8EBF8]"></div>
			</div>
			<div className="w-[235px] h-[48px] flex items-center justify-center">
				<div className="flex items-center justify-center">
					<button
						onClick={openModal}
						className="h-9 rounded-md bg-primary px-4 text-center text-sm font-medium text-white hover:bg-primary/90"
					>
						{t('common.INVITE')}
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
					<div className="bg-[#E8EBF8] dark:bg-background w-[245px] h-[8px] rounded-full text-center" />
					<div className="text-center text-[14px] text-[#9490A0] py-1 font-light"></div>
				</div>
			</div>
			<Separator />
			<div className="w-[184px]  flex items-center">
				<div className="w-[177px] text-center text-"> </div>
				<div></div>
			</div>
			<InviteModal task={null} isOpen={isOpen} closeModal={closeModal} Fragment={Fragment} />
		</div>
	);
};

export default InviteCard;
