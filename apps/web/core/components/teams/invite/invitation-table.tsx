import { imgTitle } from '@/core/lib/helpers/index';
import { useRequestToJoinTeam } from '@/core/hooks';
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

export const InvitationTable = ({ invitations }: { invitations: (TInvite | IJoinTeamResponse)[] }) => {
	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } = usePagination<
		TInvite | IJoinTeamResponse
	>({ items: invitations });
	const t = useTranslations();
	const { acceptRejectRequestToJoin } = useRequestToJoinTeam();

	return (
		<div>
			<div className="sm:rounded-lg">
				<Table className="w-full text-sm text-left text-gray-500 dark:bg-dark--theme-light">
					<TableHeader className="text-xs text-gray-700 uppercase border-b">
						<TableRow>
							<TableHead
								scope="col"
								className="pl-5 w-fit  py-3 text-sm font-normal capitalize text-[#B1AEBC] dark:text-white h-auto px-0"
							>
								{t('pages.invite.invitationTable.NAME_AND_EMAIL')}
							</TableHead>
							<TableHead
								scope="col"
								className="text-sm w-fit font-normal capitalize py-3 text-[#B1AEBC] dark:text-white h-auto px-0"
							>
								{t('pages.invite.invitationTable.POSITION')}
							</TableHead>
							<TableHead
								scope="col"
								className="text-sm w-fit  font-normal capitalize py-3 text-[#B1AEBC] dark:text-white h-auto px-0"
							>
								{t('pages.invite.invitationTable.DATE_AND_TIME_REQUEST')}
							</TableHead>
							<TableHead
								scope="col"
								className="text-sm w-fit  font-normal capitalize py-3 text-[#B1AEBC] dark:text-white h-auto px-0"
							>
								{t('pages.invite.invitationTable.CV_OR_ATTACHMENT')}
							</TableHead>
							<TableHead
								scope="col"
								className="text-sm w-fit  font-normal capitalize py-3 text-[#B1AEBC] dark:text-white h-auto px-0"
							>
								{t('common.LINK')}
							</TableHead>
							<TableHead
								scope="col"
								className="text-sm w-[13%]  font-normal capitalize py-3 text-[#B1AEBC] dark:text-white h-auto px-0"
							>
								{t('common.STATUS')}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="dark:bg-dark--theme-light">
						{currentItems.map((invitation, index) => (
							<TableRow
								className="bg-white dark:bg-dark--theme-light dark:border-gray-700 w-fit"
								key={index}
							>
								<TableCell
									scope="row"
									className="flex items-center p-0 py-4 pl-0 text-gray-900 whitespace-nowrap dark:text-white w-fit"
								>
									<div
										className={clsxm(
											'flex justify-center items-center text-xs font-normal rounded-full shadow-md size-9 text-default dark:text-white'
										)}
										style={{
											backgroundColor: `${stc(invitation.fullName || '')}80`
										}}
									>
										{imgTitle(invitation.fullName || '')}
									</div>
									<div className="flex flex-col gap-1 pl-3">
										<div className="text-sm font-semibold text-[#282048] dark:text-white">
											{invitation.fullName}
										</div>
										<Text className="text-xs w-fit truncate dark:text-white text-[#B1AEBC] font-normal">
											{invitation.email || ''}
										</Text>
									</div>
								</TableCell>
								<TableCell className="text-xs font-semibold py-4 text-[#282048] dark:text-white p-0 px-0 w-fit">
									{/* TODO: Position is not implemented yet */}-
								</TableCell>
								<TableCell className="text-xs font-semibold py-4 text-[#282048] dark:text-white p-0 px-0 w-fit">
									{/* 12 Feb 2020 12:00 pm */}
									{moment(invitation.createdAt).format('DD MMM YYYY hh:mm a')}
								</TableCell>
								<TableCell className="text-xs font-semibold py-4 text-[#282048] dark:text-white p-0 px-0 w-fit">
									{/* curriculum vitae.pdf */}-
								</TableCell>
								<TableCell className="text-xs font-semibold py-4 text-[#1A79D0] dark:text-white p-0 px-0 w-fit">
									{/* http:// www.borde.. */}-
								</TableCell>
								<TableCell className="p-0 px-0 py-4 text-xs font-semibold w-fit">
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
			</div>

			<Paginate
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
