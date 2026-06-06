import { motion } from 'framer-motion';
import Image from 'next/image';
import { ImageConfig } from '../../../types';

export const ImageCarousel = ({ currentImageConfig }: { currentImageConfig: ImageConfig }) => (
  <motion.div
    key={currentImageConfig.src}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 1, ease: "easeInOut" }}
  >
    <Image
      src={currentImageConfig.src}
      alt="Teams Kit Hero"
      width={currentImageConfig.width}
      height={currentImageConfig.height}
      style={{
        width: `${currentImageConfig.width}px`,
        height: `${currentImageConfig.height}px`
      }}
      priority
    />
  </motion.div>
);