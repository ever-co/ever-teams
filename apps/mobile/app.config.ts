import { ExpoConfig, ConfigContext } from '@expo/config';
import * as dotenv from 'dotenv';
import { merge } from 'lodash';

// initialize dotenv
dotenv.config();

const apps = {
  everTeam: {
    name: 'Ever Teams',
    slug: 'ever-teams-mobile',
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/2ff924e4-7a91-4b23-9db9-7453a8063bb0'
    },
    extra: {
      eas: {
        projectId: '2ff924e4-7a91-4b23-9db9-7453a8063bb0'
      }
    }
  },
  everClokr: {
    name: 'Ever Clokr Mobile',
    slug: 'ever-clokr-mobile',
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/be0492ed-d6f1-4a43-9337-11acd802ff56'
    },
    extra: {
      eas: {
        projectId: 'be0492ed-d6f1-4a43-9337-11acd802ff56'
      }
    }
  }
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const app = apps[process.env.EXPO_PUBLIC_WHITE_LABEL_APP ?? 'everTeam'];
  return merge({}, config, app);
};
