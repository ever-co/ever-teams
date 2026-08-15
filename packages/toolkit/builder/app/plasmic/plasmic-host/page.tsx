import { Suspense } from 'react';
import { PlasmicHostClient } from "./plasmic-host-client";

export default function PlasmicHostPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PlasmicHostClient />
    </Suspense>
  );
}
