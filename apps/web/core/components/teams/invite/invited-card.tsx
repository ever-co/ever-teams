import { imgTitle } from '@/core/lib/helpers/img-title';
import Separator from '@/core/components/common/separator';
import { TInvite } from '@/core/types/schemas';

export function InvitedCard({ invitation }: { invitation: TInvite }) {
	return (
		<div className="w-full rounded-xl bg-card my-[15px] flex justify-between text-primary hairline-border border-white dark:border-border font-semibold py-[24px] ">
			<div className="w-[60px] flex justify-center items-center">
				<div className="rounded-full w-5 h-5 bg-foreground/5 opacity-40"></div>
			</div>
			<div className="w-[235px] h-[48px] flex items-center justify-start">
				<div className="flex items-center justify-center">
					<div className="flex items-center justify-center space-x-4">
						<div className="w-[42px] h-[42px] opacity-40 rounded-full bg-foreground/5 text-primary flex justify-center items-center text-[10px]">
							{imgTitle(invitation.email ?? '')}
						</div>
						<span className="text-[15px] opacity-40 text-foreground">{invitation.fullName}</span>
					</div>
				</div>
			</div>
			<Separator />
			<div className="w-[334px] text-center font-light text-normal opacity-40 px-[14px]">{invitation.email}</div>
			<Separator />
			<div className="w-[122px]  text-center flex justify-center items-center opacity-40"></div>
			<Separator />
			<div className="w-[245px]  flex justify-center items-center">
				<div>
					<div className="bg-foreground/5 w-[245px] opacity-40 h-[8px] rounded-full text-center" />
					<div className="text-center text-[14px] text-muted-foreground py-1 font-light opacity-40"></div>
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
