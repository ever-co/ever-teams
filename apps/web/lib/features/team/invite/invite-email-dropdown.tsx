import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { AutoCompleteDropdown } from 'lib/components';
import { InviteEmailItem, mapTeamMemberItems } from './invite-email-item';

import { clsxm } from '@app/utils';
import { IInviteEmail } from '@app/interfaces';

export const InviteEmailDropdown = ({
	emails,
	setSelectedEmail,
	selectedEmail,
	error,
	handleAddNew,
}: {
	emails: IInviteEmail[];
	setSelectedEmail: Dispatch<SetStateAction<IInviteEmail | undefined>>;
	selectedEmail: IInviteEmail | undefined;
	error: string;
	handleAddNew: (email: string) => void;
}) => {
	const items: any = useMemo(() => mapTeamMemberItems(emails), [emails]);

	const [emailItem, setEmailItem] = useState<InviteEmailItem | null>();

	const onChangeActive = useCallback(
		(item: InviteEmailItem) => {
			if (item.data) {
				setEmailItem(item);
				setSelectedEmail(item.data);
			}
		},
		[setEmailItem, setSelectedEmail]
	);

	useEffect(() => {
		if (selectedEmail) {
			setEmailItem(items.find((item: any) => item.key === selectedEmail.title));
		}
	}, [selectedEmail, emails, emails?.length, setSelectedEmail, items]);

	return (
		<>
			<AutoCompleteDropdown
				className="min-w-[150px] z-10"
				buttonClassName={clsxm(
					'font-normal h-[54px] placeholder:font-light focus:outline-none p-4'
				)}
				value={emailItem}
				onChange={onChangeActive}
				items={items}
				placeholder={'Team member email address'}
				error={error}
				handleAddNew={handleAddNew}
				useHandleKeyUp={true}
			></AutoCompleteDropdown>
		</>
	);
};
