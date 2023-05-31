import { MenuIcon } from 'lib/components/svgs';
import moment from 'moment';
import { Avatar } from 'lib/components';
import { imgTitle } from '@app/helpers';
import { clsxm } from '@app/utils';
import stc from 'string-to-color';
import { OT_Member } from '@app/interfaces';
import { Paginate } from 'lib/components/pagination';
import { usePagination } from '@app/hooks/features/usePagination';

export const MemberTable = ({ members }: { members: OT_Member[] }) => {
	const {
		total,
		onPageChange,
		itemsPerPage,
		itemOffset,
		endOffset,
		setItemsPerPage,
		currentItems,
	} = usePagination<OT_Member>(members);

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
								Name
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Title
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Roles
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Joined / Left
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Status
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]"></th>
						</tr>
					</thead>
					<tbody>
						{currentItems.map((member) => (
							<tr className="bg-white  dark:bg-gray-800 dark:border-gray-700 ">
								<th
									scope="row"
									className="flex items-center pl-5 py-4 text-gray-900 whitespace-nowrap dark:text-white"
								>
									{member.employee.user?.imageId ? (
										<Avatar
											size={20}
											className="relative cursor-pointer"
											imageUrl={
												member.employee.user?.image?.thumbUrl ||
												member.employee.user?.image?.fullUrl ||
												member.employee.user?.imageUrl
											}
											alt="User Avatar"
										/>
									) : member.employee.user?.name ? (
										<div
											className={clsxm(
												'w-[20px] h-[20px]',
												'flex justify-center items-center',
												'rounded-full text-xs text-default dark:text-white',
												'shadow-md font-normal'
											)}
											style={{
												backgroundColor: `${stc(
													member.employee.user?.name || ''
												)}80`,
											}}
										>
											{imgTitle(member.employee.user?.name)}
										</div>
									) : (
										''
									)}
									<div className="pl-3">
										<div className="text-sm font-semibold text-[#282048]">
											{member.employee.fullName}
										</div>
									</div>
								</th>
								<td className="text-sm font-semibold py-4">
									{/* TODO Position */}-
								</td>
								<td className="text-sm font-semibold py-4">
									<span className="capitalize">
										{member.role?.name || 'Member'}
									</span>

									{/* Manager ( Admin) */}
								</td>
								<td className="text-sm font-semibold py-4">
									{/* 12 Feb 2020 12:00 pm */}
									{moment(member.employee.createdAt).format(
										'DD MMM YYYY hh:mm a'
									)}
								</td>
								<td className="text-sm font-semibold py-4">
									<div className="flex items-center bg-[#D4EFDF] justify-center rounded-full pl-[16px] pr-[16px] pt-[5px] pb-[5px]">
										Member
									</div>
								</td>
								<td className="py-4 flex justify-center items-center w-[50px]">
									<MenuIcon />
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
