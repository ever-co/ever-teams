/**
 * These are configuration settings for the production environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */

import { GAUZY_PROD_API_SERVER_URL, } from '@env'

export default {
  API_URL: GAUZY_PROD_API_SERVER_URL,
}
