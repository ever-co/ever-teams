import Image from 'next/image';
import Avtar from 'assets/Ellipse.svg';
import { PaginationDropdown } from './page-dropdown';

export const InvitationTable = () => {
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
						<tr className="bg-white  dark:bg-gray-800 dark:border-gray-700 ">
							<th
								scope="row"
								className="flex items-center pl-5 py-4 text-gray-900 whitespace-nowrap dark:text-white"
							>
								<Image
									className="w-7 h-7 rounded-full"
									src={Avtar}
									alt="Jese image"
									width={10}
									height={10}
								/>
								<div className="pl-3">
									<div className="text-sm font-semibold text-[#282048] dark:text-white">
										Alexandro Bernard
									</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4 text-[#282048] dark:text-white">
								UI/UX Designer
							</td>
							<td className="text-sm font-semibold py-4 text-[#282048] dark:text-white">
								12/2/2020 12:00 pm
							</td>
							<td className="text-xs font-semibold py-4 text-[#282048] dark:text-white">
								curriculum vitae.pdf
							</td>
							<td className="text-xs font-semibold py-4 text-[#1A79D0] dark:text-white">
								http:// www.borde..
							</td>
							<td className="text-xs font-semibold py-4 ">
								<div className="flex text-[#5D846D] items-center bg-[#D4EFDF] justify-center rounded-full pl-5 pr-5 pt-1 pb-1 ">
									Accepted
								</div>
							</td>
						</tr>
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
							className="block w-10 h-10 rounded-[8px] flex justify-center items-center ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white mr-1"
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
							className="block leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-[8px] w-10 h-10 flex items-center justify-center"
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
