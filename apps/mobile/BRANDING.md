# Mobile App Branding Configuration

This document explains how to configure branding for the Ever Teams mobile
application.

## Environment Variables

The mobile app supports the following environment variables for branding
customization:

### Required Variables

- `APP_NAME` - The name of your application (default: "Ever Teams")
- `COMPANY_NAME` - Your company name (default: "Ever Co. LTD")

### Optional Variables

- `APP_LOGO_URL` - URL to your app logo
  (default: "<https://app.ever.team/assets/ever-teams.png>")
- `APP_WEBSITE_URL` - Your app's website URL (default: "<https://ever.team/>")
- `APP_EMAIL_CONFIRMATION_URL` - Email confirmation URL
  (default: "<https://app.gauzy.co/#/auth/confirm-email>")

### Expo Configuration Variables

For Expo builds, you also need to set these variables:

- `EXPO_PROJECT_NAME` - Display name for the app
- `EXPO_PROJECT_SLUG` - URL-friendly project identifier
- `EXPO_PROJECT_OWNER` - Expo account owner
- `EXPO_PROJECT_ID` - Expo project ID
- `EXPO_PROJECT_PACKAGE_NAME` - Android package name
  (e.g., "com.yourcompany.yourapp")
- `EXPO_PROJECT_IOS_BUNDLE_IDENTIFIER` - iOS bundle identifier
  (e.g., "com.yourcompany.yourapp")

## Configuration Files

### 1. App Configuration (`app/config/config.base.ts`)

The branding configuration is centralized in the config system:

```typescript
branding: {
  appName: process.env.APP_NAME || 'Ever Teams',
  companyName: process.env.COMPANY_NAME || 'Ever Co. LTD',
  copyrightText: `© 2022-Present, ${process.env.APP_NAME || 'Ever Teams'} by ${
    process.env.COMPANY_NAME || 'Ever Co. LTD'
  }. All rights reserved.`,
  appLogo: process.env.APP_LOGO_URL ||
    'https://app.ever.team/assets/ever-teams.png',
  appLink: process.env.APP_WEBSITE_URL || 'https://ever.team/',
  appEmailConfirmationUrl: process.env.APP_EMAIL_CONFIRMATION_URL ||
    'https://app.gauzy.co/#/auth/confirm-email'
}
```

### 2. Expo Configuration (`app.template.json`)

The `app.template.json` file uses environment variables that get replaced
during build:

- `$EXPO_PROJECT_NAME` - App display name
- `$EXPO_PROJECT_SLUG` - Project slug
- `$EXPO_PROJECT_OWNER` - Expo owner
- `$EXPO_PROJECT_ID` - Project ID
- `$EXPO_PROJECT_PACKAGE_NAME` - Android package
- `$EXPO_PROJECT_IOS_BUNDLE_IDENTIFIER` - iOS bundle ID

## Usage in Components

Components can access branding configuration through the config system:

```typescript
import Config from '../../../config';

// Use in component
<Text>{Config.branding.copyrightText}</Text>
<Text>{Config.branding.appName}</Text>
```

## Example Configuration

For Ever Cloc branding, set these environment variables:

```bash
# App Branding
APP_NAME="Ever Cloc"
COMPANY_NAME="Ever Co. LTD"
APP_LOGO_URL="https://app.cloc.ai/assets/ever-cloc.png"
APP_WEBSITE_URL="https://cloc.ai/"
APP_EMAIL_CONFIRMATION_URL="https://app.cloc.ai/#/auth/confirm-email"

# Expo Configuration
EXPO_PROJECT_NAME="Ever Cloc Mobile"
EXPO_PROJECT_SLUG="ever-cloc-mobile"
EXPO_PROJECT_OWNER="everco"
EXPO_PROJECT_PACKAGE_NAME="co.ever.cloc"
EXPO_PROJECT_IOS_BUNDLE_IDENTIFIER="co.ever.cloc"
```

## Assets

Remember to also update the following assets for complete branding:

- App icons in `assets/images/`
- Splash screens
- Logo files
- Favicon

## Build Process

1. Set environment variables
2. Generate `app.json` from `app.template.json` with your variables
3. Build the app with Expo or React Native CLI

The build process will automatically use your branding configuration
throughout the app.
