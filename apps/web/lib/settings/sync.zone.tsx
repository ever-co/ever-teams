import { DataSyncToggler, Text } from 'lib/components';
import { useTranslations } from 'next-intl';

export function SyncZone() {
	const t = useTranslations();
	return (
		<div className="flex flex-col items-center justify-between">
			<div className="w-full mt-5">
				<div className="flex flex-col lg:flex-row items-center justify-between w-full gap-6">
					<div className="flex flex-col items-center justify-between w-full sm:gap-4 sm:flex-row">
						<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">Auto Sync</Text>
						<div className="flex items-center lg:items-start w-full">
							<DataSyncToggler />
							<Text className="flex items-center ml-5 text-sm font-normal text-gray-400">
								{/* {  'Enabled' : 'Desabled'}  */}
							</Text>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
