import { EverTeamsLogo } from './svgs';
import { IAbout } from '../libs/interfaces';

export const AboutComponent = (props: IAbout) => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg bg-gray-50 dark:bg-[#25272D] px-16 py-14 border-2 border-gray-200 dark:border-gray-600">
        <div className="flex justify-center">
          <EverTeamsLogo />
        </div>
        <h2 className="w-[230px] text-center text-gray-600 dark:text-white mt-10">
          V {props.version}
        </h2>
      </div>
    </div>
  );
};
