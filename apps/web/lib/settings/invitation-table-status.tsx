import { CheckIcon, CloseIcon } from 'lib/components/svgs';
import { useTranslation } from 'next-i18next';
interface isProps {
	status: string | undefined;
	acceptJoinRequest: () => void;
	rejectJoinRequest: () => void;
}

export const InvitationTableStatus = ({ status, acceptJoinRequest, rejectJoinRequest }: isProps) => {
	const { t } = useTranslation();
	const RenderStatus = (status: string | undefined) => {
		switch (status) {
			case 'ACCEPTED':
				return (
					<div className="flex items-center bg-[#D4EFDF] justify-center rounded-xl w-28 h-7 text-[#5D846D] dark:text-whit font-medium">
						{t('common.ACCEPTED')}
					</div>
				);
			case 'INVITED':
				return (
					<div className="flex items-center bg-[#EDEDED] justify-center rounded-xl w-28 h-7 text-[#6B6B6B]  font-medium">
						{t('common.INVITED')}
					</div>
				);
			case 'REJECTED':
				return (
					<div className="flex items-center bg-[#F5B8B8] justify-center rounded-xl w-28 h-7 text-[#A44A36]  font-medium">
						{t('common.REJECTED')}
					</div>
				);
			case 'EXPIRED':
				return (
					<div className="flex items-center bg-[#F5B8B8] justify-center rounded-xl w-28 h-7 text-[#A44A36] font-medium">
						{t('common.EXPIRED')}
					</div>
				);
			case 'REQUESTED':
				return (
					<div className="flex items-center justify-center gap-1 font-medium rounded-xl w-36 h-7">
						<div className="bg-[#CBE6F5] text-[#2772E2] w-24 h-7 rounded-xl flex items-center p-2 justify-center text-xs">
							{t('common.REQUEST')}
						</div>
						<div
							className="bg-[#27AE60] dark:bg-[#27AE60] w-10 h-7 rounded-lg  flex items-center justify-center cursor-pointer"
							onClick={acceptJoinRequest}
						>
							<CheckIcon />
						</div>
						<div
							className="bg-[#EE6C4D] w-10 h-7 rounded-lg flex items-center justify-center cursor-pointer"
							onClick={rejectJoinRequest}
						>
							<CloseIcon className="stroke-white" />
						</div>
					</div>
				);
			default:
				return <></>;
		}
	};
	return RenderStatus(status);
};
