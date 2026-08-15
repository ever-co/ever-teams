import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

const PLASMIC_CONFIG = {
  projects: [
    {
      id: process.env.NEXT_PUBLIC_PLASMIC_PROJECT_ID as string,
      token:process.env. NEXT_PUBLIC_PLASMIC_PROJECT_API_TOKEN as string,
    },
  ],
};

export const PLASMIC = initPlasmicLoader({
  ...PLASMIC_CONFIG,
  preview: false,
});

export const PREVIEW_PLASMIC = initPlasmicLoader({
  ...PLASMIC_CONFIG,
  preview: true,
});
