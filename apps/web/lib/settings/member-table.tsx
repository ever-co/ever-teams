import { MenuIcon } from 'lib/components/svgs';
import { PaginationDropdown } from './page-dropdown';
import { useOrganizationTeams } from '@app/hooks';
import moment from 'moment';
import { Avatar } from 'lib/components';
import { imgTitle } from '@app/helpers';
import { clsxm } from '@app/utils';
import stc from 'string-to-color';

export const MemberTable = () => {
	const { activeTeam } = useOrganizationTeams();

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
						{activeTeam?.members.map((member) => (
							<tr className="bg-white  dark:bg-gray-800 dark:border-gray-700 ">
								<th
									scope="row"
									className="flex items-center pl-5 py-4 text-gray-900 whitespace-nowrap dark:text-white"
								>
									{/* <Image
										className="w-7 h-7 rounded-full"
										src={Avtar}
										alt="Jese image"
										width={10}
										height={10}
									/> */}
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
			<nav
				className="flex items-center justify-between pt-4"
				aria-label="Table navigation"
			>
				<ul className="inline-flex items-center -space-x-px">
					<li>
						<a
							href="#"
							className="block w-10 h-10 flex justify-center items-center rounded-[8px]  ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white mr-1"
						>
							<span className="sr-only">Previous</span>
							<svg
								className="w-5 h-5"
								aria-hidden="true"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									fill-rule="evenodd"
									d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
									clip-rule="evenodd"
								></path>
							</svg>
						</a>
					</li>
					<li>
						<a
							href="#"
							className="px-3 py-2 leading-tight text-gray-500 bg-white hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
						>
							1
						</a>
					</li>
					<li>
						<a
							href="#"
							className="px-3 py-2 leading-tight text-gray-500 bg-white hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
						>
							2
						</a>
					</li>
					<li>
						<a
							href="#"
							aria-current="page"
							className="z-10 px-3 py-2 leading-tight text-[#1A1C1E] font-bolder"
						>
							3
						</a>
					</li>
					<li>
						<a
							href="#"
							className="px-3 py-2 leading-tight text-gray-500 bg-white dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
						>
							...
						</a>
					</li>
					<li>
						<a
							href="#"
							className="px-3 py-2 leading-tight text-gray-500 bg-white  hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
						>
							10
						</a>
					</li>
					<li>
						<a
							href="#"
							className="block w-10 h-10 flex justify-center items-center leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-[8px]"
						>
							<span className="sr-only">Next</span>
							<svg
								className="w-5 h-5"
								aria-hidden="true"
								fill="currentColor"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									fill-rule="evenodd"
									d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
									clip-rule="evenodd"
								></path>
							</svg>
						</a>
					</li>
				</ul>
				<div className="flex items-center gap-x-5">
					<PaginationDropdown setValue={() => console.log('')} />
					<span className="text-sm font-normal text-gray-500 dark:text-gray-400">
						Showing 1 to 10 of 50 entries
					</span>
				</div>
			</nav>
		</div>
	);
};
