'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { AboutPage } from '@/core/components/pages/about/about-page';
import { AboutPageSkeleton } from '@/core/components/pages/about/about-page-skeleton';

export default withAuthentication(AboutPage, { displayName: 'About', skeleton: AboutPageSkeleton });
