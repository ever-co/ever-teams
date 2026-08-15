import { UserType } from '../../../types';
import { UserTypeButtons } from './user-type-buttons';
import { UserTypeContent } from './user-type-content';
import { HOMEPAGE_COMMON_STYLES as COMMON_STYLES } from '../../../libs/styles';

export const DecisionHelper = ({
  userTypes,
  activeTab,
  onTabChange
}: {
  userTypes: UserType[];
  activeTab: number | null;
  onTabChange: (index: number) => void;
}) => (
  <div className="flex flex-col items-center justify-center mb-48">
    <h2 className={COMMON_STYLES.sectionTitle}>
      Can&apos;t Decide?
    </h2>
    <p className="text-xl text-gray-700 dark:text-white/70 mb-8">
      Which of these terms best describe you?
    </p>
    <UserTypeButtons userTypes={userTypes} activeTab={activeTab} onTabChange={onTabChange} />
    <UserTypeContent userTypes={userTypes} activeTab={activeTab} />
  </div>
);
