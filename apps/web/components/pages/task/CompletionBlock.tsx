import { useState } from 'react';
import { Card } from 'lib/components';
import ToolButton from '@components/pages/task/description-block/tool-button';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';

const CompletionBlock = () => {
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	return (
		<Card className="w-full mt-8" shadow="bigger">
			<div className="flex justify-between">
				<h4 className="text-lg font-semibold pb-2">Proof of Completion</h4>

				<div className="flex items-center">
					<button className="flex items-center justify-center text-[#B1AEBC] text-sm mr-2">
						<Image
							className="mr-1"
							width={22}
							height={22}
							alt="bold"
							src="/assets/svg/link2.svg"
						/>{' '}
						Link
					</button>
					<ToolButton iconSource="/assets/svg/attach.svg" />
					<ToolButton iconSource="/assets/svg/more.svg" />
					<Image
						src="/assets/svg/line-up.svg"
						alt="line"
						width={18}
						height={18}
						style={{ height: '18px' }}
					/>
					<ChevronUpIcon className="h-5 w-5 text-[#292D32] cursor-pointer" />
				</div>
			</div>
			<hr />
			<div>
				<div className="flex justify-between py-4">
					<p className="text-[#A5A2B2] font-medium text-sm">Description</p>
					<button>
						<Image
							src="/assets/svg/edit.svg"
							alt="edit header"
							width={14}
							height={14}
							style={{ height: '14px' }}
							className="cursor-pointer"
						/>
					</button>
				</div>
				<textarea
					className="w-full bg-transparent resize-none h-auto text-black dark:text-white not-italic text-sm mr-1 items-start outline-1 pb-4 rounded-md outline-0 border border-transparent scrollbar-hide mt-2"
					placeholder="Write the description...."
				></textarea>
			</div>
			<hr />
			<div className="my-4">
				<p className="text-[#A5A2B2] font-medium text-sm mb-4">
					Attachment files
				</p>

				<div
					id="file-upload"
					className="bg-[#F9F9F9] w-full py-4 flex justify-center items-center border border-dashed rounded-md cursor-pointer dark:bg-dark--theme"
				>
					<Image
						src="/assets/svg/file-download.svg"
						alt="edit header"
						width={18}
						height={18}
						style={{ height: '18px' }}
						className="cursor-pointer"
					/>
					<label className="text-sm text-[#A5A2B2] ml-2 cursor-pointer">
						<input type="file" />
						Upload Files
					</label>
				</div>
			</div>
			<hr />
			<div className="my-4">
				<p className="text-[#A5A2B2] font-medium text-sm mb-4">Links</p>
				<div className="bg-[#F9F9F9] w-full py-4 flex justify-center items-center border border-dashed rounded-md cursor-pointer dark:bg-dark--theme">
					<Image
						src="/assets/svg/link2.svg"
						alt="edit header"
						width={18}
						height={18}
						style={{ height: '18px' }}
						className="cursor-pointer"
					/>
					<label className="text-sm text-[#A5A2B2] ml-2 cursor-pointer">
						Add Links
					</label>
				</div>
			</div>
			<hr />
			<div className="my-4 h-36">
				<p className="text-[#A5A2B2] font-medium text-sm mb-4">Comment</p>
				<div className="">
					<input
						className="text-sm text-[#A5A2B2] w-full py-4 bg-[#F9F9F9] border rounded-md outline-0 px-2 dark:bg-dark--theme"
						type="text"
						placeholder="Add Comment here..."
						onClick={() => {
							setIsUpdated(true);
						}}
					/>
					{isUpdated && (
						<div className="flex justify-end mt-2">
							<button
								onClick={() => setIsUpdated(false)}
								className="font-medium transition-all hover:font-semibold"
							>
								Cancel
							</button>
							<button className="bg-green-500 text-white px-4 py-1 m-2 rounded font-medium hover:bg-green-600 transition-all">
								Save
							</button>
						</div>
					)}
				</div>
			</div>
		</Card>
	);
};

export default CompletionBlock;
