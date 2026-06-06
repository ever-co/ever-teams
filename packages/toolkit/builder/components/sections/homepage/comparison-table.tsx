import { ComparisonRow } from '../../../types';
import { HOMEPAGE_COMMON_STYLES } from '../../../libs/styles';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';

export const ComparisonTable = ({ data }: { data: ComparisonRow[] }) => (
  <div className="flex flex-col items-center justify-center mb-48">
    <h2 className={HOMEPAGE_COMMON_STYLES.sectionTitle}>
      Comparison Table
    </h2>
    <div className="w-full max-w-7xl overflow-x-auto">
      <table className="w-full border-collapse rounded-lg border border-[#27272A] overflow-hidden">
        <TableHeader />
        <TableBody data={data} />
      </table>
    </div>
  </div>
);
