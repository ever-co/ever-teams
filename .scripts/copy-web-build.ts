import { copy } from 'fs-extra';
import { join } from 'path';

async function copyWebBuild() {
  const webDir = join(process.cwd(), 'apps/web');
  const distDir = join(process.cwd(), 'apps/server-web/release/app/dist');

  try {
    // Copy standalone build
    await copy(
      join(webDir, '.next/standalone'),
      join(distDir, 'standalone')
    );

    // Copy static files
    await copy(
      join(webDir, '.next/static'),
      join(distDir, 'standalone/apps/web/.next/static')
    );

    // Copy public files
    await copy(
      join(webDir, 'public'),
      join(distDir, 'standalone/apps/web/public')
    );

    console.log('Build files copied successfully');
  } catch (error) {
    console.error('Failed to copy build files:', error);
    process.exit(1);
  }
}

copyWebBuild();
