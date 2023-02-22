import Skeleton from 'react-loading-skeleton';
import { Text, InputField } from 'lib/components';

const StatusListCard = () => {
	return (
		<>
			<div className="w-full mt-20">
				<div className="flex">
					<div className="rounded-md m-h-64  flex gap-12">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mt-4 w-[200px]">
							<Skeleton
								width={200}
								borderRadius={20}
								className="dark:bg-dark--theme-light"
							/>
						</Text>

						<div className="flex flex-col">
							<Skeleton
								width={250}
								borderRadius={8}
								height={45}
								className="dark:bg-dark--theme-light"
							/>

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem]">
								<Skeleton
									width={200}
									borderRadius={20}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
							<div className="flex gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
							<div className="flex w-full gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full mt-20">
				<div className="flex">
					<div className="rounded-md m-h-64  flex gap-x-[2rem]">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mt-4 w-[200px]">
							<Skeleton
								width={200}
								borderRadius={20}
								className="dark:bg-dark--theme-light"
							/>
						</Text>

						<div className="flex flex-col">
							<Skeleton
								width={250}
								borderRadius={8}
								height={45}
								className="dark:bg-dark--theme-light"
							/>

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem]">
								<Skeleton
									width={200}
									borderRadius={20}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
							<div className="flex w-full gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
							<div className="flex w-full gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
							<div className="flex w-1/2 gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-40"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="w-full mt-20">
				<div className="flex">
					<div className="rounded-md m-h-64  flex gap-x-[2rem]">
						<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mt-4 w-[200px]">
							<Skeleton
								width={200}
								borderRadius={20}
								className="dark:bg-dark--theme-light"
							/>
						</Text>

						<div className="flex flex-col">
							<Skeleton
								width={250}
								borderRadius={8}
								height={45}
								className="dark:bg-dark--theme-light"
							/>

							<Text className="flex-none flex-grow-0 text-md text-gray-400 font-medium mb-[1rem] w-full mt-[2.4rem]">
								<Skeleton
									width={200}
									borderRadius={20}
									className="dark:bg-dark--theme-light"
								/>
							</Text>
							<div className="flex w-full gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
							<div className="flex w-full gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
								<InputField
									type="text"
									className="mb-0 h-[54px] w-80"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
							<div className="flex w-1/2 gap-3 mt-4">
								<InputField
									type="text"
									className="mb-0 h-[54px] w-40"
									wrapperClassName="mb-0 h-[54px]"
									disabled={true}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default StatusListCard;
