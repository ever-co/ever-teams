import { Button, InputField } from 'lib/components';
import { SearchNormalIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { FilterDropdown } from './filter-by-dropdown';
import { InvitationTable } from './invitation-table';

export const InvitationSetting = () => {
	const { trans } = useTranslation('settingsTeam');
	return (
		<div className="flex flex-col ">
			<div className="flex items-center justify-between w-full mt-8">
				<div className="w-auto">
					<InputField
						type="text"
						placeholder={trans.SEARCH_MEMBER}
						className="mb-0 bg-[#FCFCFC] h-11"
						leadingNode={
							<Button
								variant="ghost"
								className="p-0 m-0 ml-[0.9rem] min-w-0 bg-[#FCFCFC]"
								type="submit"
							>
								<SearchNormalIcon className="w-[1rem] bg-[#FCFCFC]" />
							</Button>
						}
					/>
				</div>
				<div className="flex items-center justify-between w-auto gap-4">
					<FilterDropdown setValue={() => console.log('filter')} />
					<Button
						variant="primary"
						className="font-normal rounded-xl text-md  h-[45px] min-w-[120px]"
						type="submit"
					>
						{'+  Invite'}
					</Button>
				</div>
			</div>

			<div className="mt-7 mb-[4rem]">
				<InvitationTable />
			</div>
		</div>
	);
};
