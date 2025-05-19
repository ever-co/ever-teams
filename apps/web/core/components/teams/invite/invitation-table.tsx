import { imgTitle } from '@/core/lib/helpers/index';
import { useRequestToJoinTeam } from '@/core/hooks';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { IInvitation, IRequestToJoin, IRequestToJoinActionEnum } from '@/core/types/interfaces';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import moment from 'moment';
import { useTranslations } from 'next-intl';
import stc from 'string-to-color';
import { InvitationTableStatus } from './invitation-table-status';
import { Paginate } from '../../duplicated-components/_pagination';

export const InvitationTable = ({ invitations }: { invitations: (IInvitation | IRequestToJoin)[] }) => {
	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } = usePagination<
		IInvitation | IRequestToJoin
	>(invitations);
	const t = useTranslations();
	const { acceptRejectRequestToJoin } = useRequestToJoinTeam();

	return (
		<div>
			<div className=" sm:rounded-lg">
				<table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
					<thead className="text-xs text-gray-700 uppercase border-b">
						<tr>
							<th
								scope="col"
								className="pl-5 w-[18%]  py-3 text-sm font-normal capitalize text-[#B1AEBC]"
							>
								{t('pages.invite.invitationTable.NAME_AND_EMAIL')}
							</th>
							<th scope="col" className="text-sm w-[18%]  font-normal capitalize py-3 text-[#B1AEBC]">
								{t('pages.invite.invitationTable.POSITION')}
							</th>
							<th scope="col" className="text-sm w-[18%]  font-normal capitalize py-3 text-[#B1AEBC]">
								{t('pages.invite.invitationTable.DATE_AND_TIME_REQUEST')}
							</th>
							<th scope="col" className="text-sm w-[18%]  font-normal capitalize py-3 text-[#B1AEBC]">
								{t('pages.invite.invitationTable.CV_OR_ATTACHMENT')}
							</th>
							<th scope="col" className="text-sm w-[18%]  font-normal capitalize py-3 text-[#B1AEBC]">
								{t('common.LINK')}
							</th>
							<th scope="col" className="text-sm w-[13%]  font-normal capitalize py-3 text-[#B1AEBC]">
								{t('common.STATUS')}
							</th>
						</tr>
					</thead>
					<tbody className="dark:bg-dark--theme-light">
						{currentItems.map((invitation, index) => (
							<tr className="bg-white dark:bg-dark--theme-light dark:border-gray-700 max-w-" key={index}>
								<th
									scope="row"
									className="flex items-center  py-4 pl-0 text-gray-900 whitespace-nowrap dark:text-white"
								>
									<div
										className={clsxm(
											'w-[20px] h-[20px]',
											'flex justify-center items-center',
											'rounded-full text-xs text-default dark:text-white',
											'shadow-md font-normal'
										)}
										style={{
											backgroundColor: `${stc(invitation.fullName || '')}80`
										}}
									>
										{imgTitle(invitation.fullName)}
									</div>
									<div className="flex flex-col gap-1 pl-3">
										<div className="text-sm font-semibold text-[#282048] dark:text-white">
											{invitation.fullName}
										</div>
										<Text className="text-xs w-60 truncate dark:text-white text-[#B1AEBC] font-normal">
											{invitation.email || ''}
										</Text>
									</div>
								</th>
								<td className="text-sm font-semibold pl-2 py-4 text-[#282048] dark:text-white">
									{/* TODO: Position is not implemented yet */}-
								</td>
								<td className="text-sm font-semibold pl-2 py-4 text-[#282048] dark:text-white">
									{/* 12 Feb 2020 12:00 pm */}
									{moment(invitation.createdAt).format('DD MMM YYYY hh:mm a')}
								</td>
								<td className="text-xs font-semibold pl-2 py-4 text-[#282048] dark:text-white">
									{/* curriculum vitae.pdf */}-
								</td>
								<td className="text-xs font-semibold pl-2 py-4 text-[#1A79D0] dark:text-white">
									{/* http:// www.borde.. */}-
								</td>
								<td className="py-4 text-xs font-semibold pl-2 ">
									<InvitationTableStatus
										status={invitation.status}
										acceptJoinRequest={() => {
											acceptRejectRequestToJoin(invitation.id, IRequestToJoinActionEnum.ACCEPTED);
										}}
										rejectJoinRequest={() => {
											acceptRejectRequestToJoin(invitation.id, IRequestToJoinActionEnum.REJECTED);
										}}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
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
