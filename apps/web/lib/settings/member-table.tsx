import Avtar from 'assets/Ellipse.svg';
import { MenuIcon } from 'lib/components/svgs';
import Image from 'next/image';
import { PaginationDropdown } from './page-dropdown';
export const MemberTable = () => {
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
								Tittle
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								Roles
							</th>
							<th scope="col" className="capitalize py-3 text-[#B1AEBC]">
								oined / Left
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
									<div className="text-sm font-semibold text-[#282048]">
										Alexandro Bernard
									</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4">UI/UX Designer</td>
							<td className="text-sm font-semibold py-4">Manager ( Admin)</td>
							<td className="text-sm font-semibold py-4">
								12 Feb 2020 12:00 pm
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
									<div className="text-sm font-semibold">Ryan Reynold</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4">Engineer</td>
							<td className="text-sm font-semibold py-4">Manager</td>
							<td className="text-sm font-semibold py-4">
								12 Feb 2020 12:00 pm
							</td>
							<td className="text-sm font-semibold py-4">
								<div className="flex items-center bg-[#F5F1CB] justify-center rounded-full pl-[16px] pr-[16px] pt-[5px] pb-[5px]">
									Pending
								</div>
							</td>
							<td className="py-4 flex justify-center items-center w-[50px]">
								<MenuIcon />
							</td>
						</tr>
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
									<div className="text-sm font-semibold">Austin Brows</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4">
								Front End Developer
							</td>
							<td className="text-sm font-semibold py-4">Member</td>
							<td className="text-sm font-semibold py-4">
								12 Feb 2020 12:00 pm
							</td>
							<td className="text-sm font-semibold py-4">
								<div className="flex items-center bg-[#F5F1CB] justify-center rounded-full pl-[16px] pr-[16px] pt-[5px] pb-[5px]">
									Pending
								</div>
							</td>
							<td className="py-4 flex justify-center items-center w-[50px]">
								<MenuIcon />
							</td>
						</tr>
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
									<div className="text-sm font-semibold">Levi Rainer</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4">Back End Developer</td>
							<td className="text-sm font-semibold py-4">Member</td>
							<td className="text-sm font-semibold py-4">
								12 Feb 2020 12:00 pm
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
									<div className="text-sm font-semibold">Downy Jhonson</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4">Data Analyst</td>
							<td className="text-sm font-semibold py-4">Member</td>
							<td className="text-sm font-semibold py-4">
								12 Feb 2020 12:00 pm
							</td>
							<td className="text-sm font-semibold py-4">
								<div className="flex items-center bg-[#ECE8FC] justify-center rounded-full pl-[16px] pr-[16px] pt-[5px] pb-[5px]">
									Left
								</div>
							</td>
							<td className="py-4 flex justify-center items-center w-[50px]">
								<MenuIcon />
							</td>
						</tr>
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
									<div className="text-sm font-semibold">Dany the rock</div>
								</div>
							</th>
							<td className="text-sm font-semibold py-4">CTO</td>
							<td className="text-sm font-semibold py-4">Viewer</td>
							<td className="text-sm font-semibold py-4">
								12 Feb 2020 12:00 pm
							</td>
							<td className="text-sm font-semibold py-4">
								<div className="flex items-center bg-[#F5B8B8] justify-center rounded-full pl-[16px] pr-[16px] pt-[5px] pb-[5px]">
									Suspended
								</div>
							</td>
							<td className="py-4 flex justify-center items-center w-[50px]">
								<MenuIcon />
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
							className="block rounded-[8px] px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white mr-1"
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
							className="block px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-[8px]"
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
