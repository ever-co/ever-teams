import { Builder } from '../../../types';
import { BuilderHeader } from './builder-header';
import { BuilderFeatures } from './builder-features';
import { BuilderTags } from './builder-tags';

export const BuilderCardContent = ({ builder }: { builder: Builder }) => (
    <>
        <PurpleBlurEffect />
        <div className="flex flex-col flex-grow relative z-10">
            <BuilderHeader builder={builder} />
            <BuilderFeatures features={builder.features} />
        </div>
        <BuilderTags tags={builder.tags} />
    </>
);

const PurpleBlurEffect = () => (
    <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-purple-200/50 dark:bg-transparent rounded-full blur-[60px] pointer-events-none" />
);
