import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import os from 'os';

type EnvOptions = {
  before: {
    NEXT_PUBLIC_GAUZY_API_SERVER_URL?: string
  },
  after: {
    NEXT_PUBLIC_GAUZY_API_SERVER_URL?: string
  }
}

const scanAllFiles = async (files: string[], oldConfig: string, newConfig: string) => {
  files.forEach((file) => {
    if (path.extname(file) === '.js') {
      try {
        const data = fs.readFileSync(file, 'utf-8');
        const result = data.replace(new RegExp(oldConfig, 'g'), newConfig);
        fs.writeFileSync(file, result, 'utf8');
      } catch (error) {
        console.log('error replace', error);
      }
    }
  });
}
export const replaceConfig = async (folderPath: string, envOptions: EnvOptions) => {
  try {
    console.log('all files path', folderPath);
    if (os.platform() === 'win32') {
      folderPath = folderPath.replace(/\\/g, '/');
    }
    console.log('final path', folderPath);
    const NEXT_PUBLIC_GAUZY_API_SERVER_URL_BEFORE = `"NEXT_PUBLIC_GAUZY_API_SERVER_URL","${envOptions.before.NEXT_PUBLIC_GAUZY_API_SERVER_URL}"`;
    const NEXT_PUBLIC_GAUZY_API_SERVER_URL_AFTER = `"NEXT_PUBLIC_GAUZY_API_SERVER_URL","${envOptions.after.NEXT_PUBLIC_GAUZY_API_SERVER_URL}"`;
    const NEXT_PUBLIC_GAUZY_API_SERVER_URL_DEFAULT = `"NEXT_PUBLIC_GAUZY_API_SERVER_URL","https://api.ever.team"`;
    const files = await fg(`${folderPath}/**/*`, { onlyFiles: true });
    await scanAllFiles(files, NEXT_PUBLIC_GAUZY_API_SERVER_URL_BEFORE, NEXT_PUBLIC_GAUZY_API_SERVER_URL_AFTER);
    await scanAllFiles(files, NEXT_PUBLIC_GAUZY_API_SERVER_URL_DEFAULT, NEXT_PUBLIC_GAUZY_API_SERVER_URL_AFTER);
  } catch (error) {
    console.log('error on replacing file', error);
  }
}

export const clearDesktopConfig = (folderPath: string) => {
  const fileNames = ['desktop-server.body', 'desktop-server.meta'];
  try {
    // remove cached desktop server config
    fileNames.forEach((file) => {
      fs.unlinkSync(path.join(folderPath, file));
    })
  } catch (error) {
    console.log('skip unlink file on not exists');
  }
}
