import Skeleton from 'react-loading-skeleton';
import { MainLayout, MainHeader } from 'lib/layout';

const TeamPageSkeleton = () => {
	return (
		<MainLayout>
			<MainHeader>
				<Skeleton
					height={20}
					width={180}
					borderRadius={10}
					className="dark:bg-dark--theme-light"
				/>
				<div className="w-full flex flex-col">
					<Skeleton
						height={50}
						width={850}
						borderRadius={25}
						className="dark:bg-dark--theme-light mt-16"
					/>

					<div className="flex items-center">
						{' '}
						<div className="flex-1 flex flex-col mr-10 lg:mt-0 mt-8">
							<div className="flex flex-col lg:flex-row justify-between items-center space-x-3">
								<div className="flex-1 flex items-center space-x-4 ">
									<Skeleton height={25} width={180} borderRadius={15} />

									<Skeleton height={25} width={180} borderRadius={15} />

									<Skeleton height={25} width={180} borderRadius={15} />

									<Skeleton height={25} width={180} borderRadius={15} />
								</div>
							</div>
						</div>
						<div style={{ marginTop: '-60px' }}>
							<div className="pr-5">
								<div className="w-full">
									<Skeleton
										height={140}
										width={280}
										borderRadius={10}
										className="dark:bg-dark--theme-light"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
				<ul className="flex row font-normal justify-between mb-3 mt-16">
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
					<li>
						<Skeleton width={80} height={20} borderRadius={25} />
					</li>
				</ul>
			</MainHeader>
		</MainLayout>
	);
};

export default TeamPageSkeleton;
