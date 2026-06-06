import { ImageConfig } from '../../../types';
import { HOMEPAGE_COMMON_STYLES } from '../../../libs/styles';
import { ImageCarousel } from './image-carousel';

export const ProductShowcase = ({ currentImageConfig }: { currentImageConfig: ImageConfig }) => (
  <div className={HOMEPAGE_COMMON_STYLES.container + " mb-32 min-h-[420px]"}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      <div className="max-w-xl min-h-[420px] flex items-center">
        <p className="text-xl text-gray-700 dark:text-white/80 leading-[48px]">
          For developers and startup founders, <span className="text-blue-500 dark:text-[#5BA5FC]">Teams Kit</span> is your gateway to building powerful, customizable time tracking components—fast. Whether you need timers, counters, or analytics tools, our embeddable kit works seamlessly with top visual builders to help you design, test, and deploy with ease.
        </p>
      </div>
      <div className="flex justify-center items-center">
        <ImageCarousel currentImageConfig={currentImageConfig} />
      </div>
    </div>
  </div>
);
