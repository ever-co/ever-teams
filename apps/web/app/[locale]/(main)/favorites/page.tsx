'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { FavoritesPage, FavoritesPageSkeleton } from '@/core/components/pages/favorites/favorites-page';

export default withAuthentication(FavoritesPage, { displayName: 'Favorites', skeleton: FavoritesPageSkeleton });
