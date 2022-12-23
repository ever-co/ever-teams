import { imgTitle } from '@app/helpers/img-title';
import { IInvitation } from '@app/interfaces/IInvite';
import Separator from '@components/ui/separator';

export function InvitedCard({ invitation }: { invitation: IInvitation }) {
	return (
		<div className="w-full rounded-[15px] bg-[#FFFFFF] my-[15px] dark:bg-[#202023] flex justify-between text-primary border border-white dark:border-[#202023] font-bold py-[24px] dark:text-[#FFFFFF]">
			<div className="w-[60px] flex justify-center items-center">
				<div className="rounded-[50%] w-5 h-5 bg-[#E8EBF8] opacity-40"></div>
			</div>
			<div className="w-[235px] h-[48px] flex items-center justify-start">
				<div className="flex justify-center items-center">
					<div className="flex items-center justify-center space-x-4">
						<div className="w-[42px] h-[42px] opacity-40 rounded-full bg-slate-100 dark:bg-white text-primary flex justify-center items-center text-[10px]">
							{imgTitle(invitation.email)}
						</div>
						<span className="text-[15px] opacity-40 text-primary text-normal dark:text-white">
							{invitation.fullName}
						</span>
					</div>
				</div>
			</div>
			<Separator />
			<div className="w-[334px] text-center font-light text-normal opacity-40 px-[14px]">
				{invitation.email}
			</div>
			<Separator />
			<div className="w-[122px]  text-center flex justify-center items-center opacity-40"></div>
			<Separator />
			<div className="w-[245px]  flex justify-center items-center">
				<div>
					<div className="bg-[#E8EBF8] dark:bg-[#18181B] w-[245px] opacity-40 h-[8px] rounded-full text-center" />
					<div className="text-center text-[14px] text-[#9490A0] py-1 font-light opacity-40"></div>
				</div>
			</div>
			<Separator />
			<div className="w-[184px]  flex items-center">
				<div className="w-[177px] text-center text-"> </div>
				<div></div>
			</div>
		</div>
	);
}
