import { Builder } from '../../../types';
import { BuilderCard } from './builder-card';
import { HOMEPAGE_COMMON_STYLES as COMMON_STYLES } from '../../../libs/styles';

export const FrameworkSelection = ({ builders }: { builders: Builder[] }) => (
  <div className="flex flex-col items-center justify-center mb-48">
    <h2 className={COMMON_STYLES.sectionTitle}>
      Choose Your Framework
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl w-full">
      {builders.map((builder) => (
        <BuilderCard builder={builder} key={builder.name} />
      ))}
    </div>
  </div>
);
