import { IInvitation, IRequestToJoin } from '@app/interfaces';
import moment from 'moment';
import { usePagination } from '@app/hooks/features/usePagination';
import { Paginate } from 'lib/components/pagination';
import { clsxm } from '@app/utils';
import stc from 'string-to-color';
import { imgTitle } from '@app/helpers';

export const InvitationTable = ({
	invitations,
}: {
	invitations: (IInvitation | IRequestToJoin)[];
}) => {
	const {
		total,
		onPageChange,
		itemsPerPage,
		itemOffset,
		endOffset,
		setItemsPerPage,
		currentItems,
	} = usePagination<IInvitation | IRequestToJoin>(invitations);

	return (
		<div>
			<div className="overflow-x-auto  sm:rounded-lg">
				<table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
					<thead className="text-xs text-gray-700 uppercase border-b">
						<tr>
							<th
								scope="col"
								className="pl-5 py-3 text-md font-semibold capitalize text-[#B1AEBC]"
							>
								Name & Email
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Position
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Date & Time Request
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								CV / Attachement
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Link
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Status
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]"></th>
						</tr>
					</thead>
					<tbody>
						{currentItems.map((invitation) => (
							<tr className="bg-white  dark:bg-gray-800 dark:border-gray-700 ">
								<th
									scope="row"
									className="flex items-center pl-5 py-4 text-gray-900 whitespace-nowrap dark:text-white"
								>
									<div
										className={clsxm(
											'w-[20px] h-[20px]',
											'flex justify-center items-center',
											'rounded-full text-xs text-default dark:text-white',
											'shadow-md font-normal'
										)}
										style={{
											backgroundColor: `${stc(invitation.fullName || '')}80`,
										}}
									>
										{imgTitle(invitation.fullName)}
									</div>
									<div className="pl-3">
										<div className="text-sm font-semibold text-[#282048] dark:text-white">
											{invitation.fullName}
										</div>
									</div>
								</th>
								<td className="text-sm font-semibold py-4 text-[#282048] dark:text-white">
									{/* TODO: Position is not implemented yet */}-
								</td>
								<td className="text-sm font-semibold py-4 text-[#282048] dark:text-white">
									{/* 12 Feb 2020 12:00 pm */}
									{moment(invitation.createdAt).format('DD MMM YYYY hh:mm a')}
								</td>
								<td className="text-xs font-semibold py-4 text-[#282048] dark:text-white">
									{/* curriculum vitae.pdf */}-
								</td>
								<td className="text-xs font-semibold py-4 text-[#1A79D0] dark:text-white">
									{/* http:// www.borde.. */}-
								</td>
								<td className="text-xs font-semibold py-4 ">
									<div className="flex text-[#5D846D] items-center bg-[#D4EFDF] justify-center rounded-full pl-5 pr-5 pt-1 pb-1 ">
										{invitation.status}
									</div>
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
