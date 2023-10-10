import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState
} from 'react';
import { AutoCompleteDropdown } from 'lib/components';
import { InviteEmailItem, mapTeamMemberItems } from './invite-email-item';

import { clsxm } from '@app/utils';
import { IInviteEmail } from '@app/interfaces';
import { useSyncRef } from '@app/hooks';

export const InviteEmailDropdown = ({
	emails,
	setSelectedEmail,
	selectedEmail,
	error,
	handleAddNew
}: {
	emails: IInviteEmail[];
	setSelectedEmail: Dispatch<SetStateAction<IInviteEmail | undefined>>;
	selectedEmail: IInviteEmail | undefined;
	error: string;
	handleAddNew: (email: string) => void;
}) => {
	const items = useMemo(() => mapTeamMemberItems(emails), [emails]);
	const $items = useSyncRef(items);

	const [emailItem, setEmailItem] = useState<InviteEmailItem | null>(null);

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
			setEmailItem(
				$items.current.find((item: any) => item.key === selectedEmail.title) ||
					null
			);
		}
	}, [selectedEmail, $items]);

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
			/>
		</>
	);
};
