import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { IInviteEmail, InviteEmailItem, mapTeamMemberItems } from './invite-email-item';

import { clsxm } from '@/core/lib/utils';
import { useSyncRef } from '@/core/hooks';
import { useTranslations } from 'next-intl';
import { AutoCompleteDropdown } from '../../common/auto-complete-dropdown';

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
	const t = useTranslations();
	const items = useMemo(() => mapTeamMemberItems(emails), [emails]);
	const $items = useSyncRef(items);

	const [emailItem, setEmailItem] = useState<InviteEmailItem | null>(null);

	const onChangeActive = useCallback(
		(item: InviteEmailItem | null) => {
			if (item && item.data) {
				setEmailItem(item);
				setSelectedEmail(item.data);
			} else if (item === null) {
				setEmailItem(null);
				setSelectedEmail(undefined);
			}
		},
		[setEmailItem, setSelectedEmail]
	);

	useEffect(() => {
		if (selectedEmail) {
			setEmailItem($items.current.find((item: any) => item.key === selectedEmail.title) || null);
		}
	}, [selectedEmail, $items]);

	return (
		<>
			<AutoCompleteDropdown
				className="min-w-[150px]  z-10"
				buttonClassName={clsxm('font-normal h-[3rem] placeholder:font-light focus:outline-none p-4')}
				value={emailItem}
				onChange={onChangeActive}
				items={items}
				placeholder={t('common.TEAM_MEMBER_EMAIL_ADDRESS')}
				error={error}
				handleAddNew={handleAddNew}
				useHandleKeyUp={true}
				setSelectedEmail={setSelectedEmail}
				selectedEmail={selectedEmail}
			/>
		</>
	);
};
