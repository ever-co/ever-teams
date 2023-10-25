import { IInvitationExpire } from '@app/interfaces/IInvitation_Expire';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type InvitationExpireItem = DropdownItem<IInvitationExpire>;

export function mapInvitationExpireItems(InvitationExpire: IInvitationExpire[]) {
	const items = InvitationExpire.map<InvitationExpireItem>((Invitatio_expire) => {
		return {
			key: Invitatio_expire.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<InvitationExpireItem title={Invitatio_expire.title} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <InvitationExpireItem title={Invitatio_expire.title} className="py-2 mb-0" />,
			data: Invitatio_expire
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<InvitationExpireItem title={'7 Days'} className="w-full cursor-default" />
				</div>
			),
			disabled: true
		});
	}

	return items;
}

export function InvitationExpireItem({ title, className }: { title?: string; className?: string }) {
	return (
		<div className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-0 py-2', className)}>
			<span className={clsxm('text-normal mb-0')}>{title}</span>
		</div>
	);
}
