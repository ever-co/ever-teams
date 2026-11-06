import { imgTitle } from '@/core/lib/helpers/index';
import { useAcceptRejectRequestToJoin } from '@/core/hooks/organizations/teams/use-accept-reject-request-to-join';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { InvitationTableStatus } from './invitation-table-status';
import { Paginate } from '../../duplicated-components/_pagination';
import { IJoinTeamResponse } from '@/core/types/interfaces/team/request-to-join';
import { ERequestStatus } from '@/core/types/generics/enums';
import { TInvite } from '@/core/types/schemas';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/core/components/common/table';

const HEAD_CELL = 'whitespace-nowrap';
const BODY_CELL = 'text-sm text-foreground';

export const InvitationTable = ({ invitations }: { invitations: (TInvite | IJoinTeamResponse)[] }) => {
	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } = usePagination<
		TInvite | IJoinTeamResponse
	>({ items: invitations });
	const t = useTranslations();
	const { acceptRejectRequestToJoin } = useAcceptRejectRequestToJoin();

	return (
		<div>
			<Table className="w-full text-left text-sm">
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead scope="col" className={HEAD_CELL}>
							{t('pages.invite.invitationTable.NAME_AND_EMAIL')}
						</TableHead>
						<TableHead scope="col" className={HEAD_CELL}>
							{t('pages.invite.invitationTable.POSITION')}
						</TableHead>
						<TableHead scope="col" className={HEAD_CELL}>
							{t('pages.invite.invitationTable.DATE_AND_TIME_REQUEST')}
						</TableHead>
						<TableHead scope="col" className={HEAD_CELL}>
							{t('pages.invite.invitationTable.CV_OR_ATTACHMENT')}
						</TableHead>
						<TableHead scope="col" className={HEAD_CELL}>
							{t('common.LINK')}
						</TableHead>
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'w-[13%]')}>
							{t('common.STATUS')}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentItems.map((invitation) => (
						<TableRow key={invitation.id}>
							<TableCell scope="row" className="whitespace-nowrap text-foreground">
								<div className="flex items-center gap-3">
									<div
										className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-normal text-foreground"
										style={{
											backgroundColor: `${stc(invitation.fullName || '')}80`
										}}
									>
										{imgTitle(invitation.fullName || '')}
									</div>
									<div className="flex min-w-0 flex-col gap-0.5">
										<div className="text-sm font-medium text-foreground">{invitation.fullName}</div>
										<Text className="w-fit truncate text-xs font-normal text-muted-foreground">
											{invitation.email || ''}
										</Text>
									</div>
								</div>
							</TableCell>
							<TableCell className={BODY_CELL}>{/* TODO: Position is not implemented yet */}-</TableCell>
							<TableCell className={clsxm(BODY_CELL, 'whitespace-nowrap tabular-nums')}>
								{/* 12 Feb 2020 12:00 pm */}
								{moment(invitation.createdAt).format('DD MMM YYYY hh:mm a')}
							</TableCell>
							<TableCell className={BODY_CELL}>{/* curriculum vitae.pdf */}-</TableCell>
							<TableCell className={clsxm(BODY_CELL, 'text-primary-ink')}>
								{/* http:// www.borde.. */}-
							</TableCell>
							<TableCell>
								<InvitationTableStatus
									status={invitation.status || undefined} // Handle null status
									acceptJoinRequest={() => {
										acceptRejectRequestToJoin(invitation.id || '', ERequestStatus.ACCEPTED);
									}}
									rejectJoinRequest={() => {
										acceptRejectRequestToJoin(invitation.id || '', ERequestStatus.REJECTED);
									}}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Paginate
				className="px-4 pb-4"
				total={total}
				onPageChange={onPageChange}
				pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
				itemsPerPage={itemsPerPage}
				itemOffset={itemOffset}
				endOffset={endOffset}
				setItemsPerPage={setItemsPerPage}
			/>
		</div>
	);
};
