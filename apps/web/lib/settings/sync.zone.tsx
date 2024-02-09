import { dataSyncModeState, isDataSyncState } from '@app/stores/data-sync';
import { DataSyncModeToggler, DataSyncToggler, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useRecoilValue } from 'recoil';

export function SyncZone() {
	const t = useTranslations();
	const isDataSync = useRecoilValue(isDataSyncState);
	const dataSyncMode = useRecoilValue(dataSyncModeState);
	return (
		<div className="flex flex-col items-center justify-between">
			<div className="w-full mt-5">
				<div className="flex flex-col lg:flex-row items-center justify-between w-full gap-6">
					<div className=" flex flex-col items-center justify-between w-full md:w-1/2 sm:gap-4 sm:flex-row">
						<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">Auto Sync</Text>
						<div className="flex items-center w-full">
							<DataSyncToggler />
							<Text className="flex items-center ml-5 text-sm font-normal text-gray-400">
								{isDataSync ? 'Enabled' : 'Desabled'}
							</Text>
						</div>
					</div>
					{isDataSync ? (
						<div className=" flex flex-col items-center justify-between w-full md:w-1/2 sm:gap-4 sm:flex-row">
							<Text className="font-normal min-w-[25%] text-gray-400 text-lg justify-center">
								Sync Mode
							</Text>
							<div className="flex items-center w-full">
								<DataSyncModeToggler />
								<Text className="flex items-center ml-5 text-sm font-normal text-gray-400">
									{dataSyncMode == 'REAL_TIME' ? 'Real Time' : 'Pull'}
								</Text>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
