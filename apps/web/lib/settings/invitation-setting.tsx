import { Button, InputField, Text } from 'lib/components';
import { SearchNormalIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { FilterDropdown } from './filter-by-dropdown';
import { MemberTable } from './member-table';
import { SortDropdown } from './sort-by-dropdown';
import { InvitationTable } from './invitation-table';

export const InvitationSetting = () => {
	const { trans } = useTranslation('settingsTeam');
	return (
		<div className="flex flex-col ">
			<div className="flex items-center justify-between w-full mt-8">
				<div className="w-[25%]">
					<InputField
						type="text"
						placeholder={trans.SEARCH_MEMBER}
						className=" mb-0"
						leadingNode={
							<Button
								variant="ghost"
								className="p-0 m-0 ml-[0.9rem] min-w-0"
								type="submit"
							>
								<SearchNormalIcon className="w-[1rem]" />
							</Button>
						}
					/>
				</div>
				<div className="flex items-center justify-between w-[50%] gap-x-[2%]">
					<FilterDropdown setValue={() => console.log('filter')} />
					<SortDropdown setValue={() => console.log('sort')} />
				</div>
			</div>

			<div className="mt-7 mb-[4rem]">
				<InvitationTable />
			</div>
		</div>
	);
};
