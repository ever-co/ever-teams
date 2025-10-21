# Deployment Secrets Configuration

This document lists all required GitHub secrets for deploying Ever Teams to different environments.

## Critical Secrets (Required for Deployment)

These secrets **MUST** be configured for successful deployment:

### **API Configuration**

- `GAUZY_API_SERVER_URL` - Backend API URL (e.g., `https://apistage.ever.team`)
- `NEXT_PUBLIC_GAUZY_API_SERVER_URL` - Public API URL for frontend (same as above)

### **Branding Configuration**

- `APP_NAME` - Application name (e.g., `"Ever Cloc"` for cloc.ai)
- `NEXT_PUBLIC_APP_NAME` - Public app name (same as above)
- `COMPANY_NAME` - Company name (e.g., `"Ever Co. LTD"`)

### **Monitoring & Error Tracking**

- `SENTRY_DSN` - Sentry DSN for backend error tracking
- `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN for frontend error tracking

## Optional Secrets (Recommended)

### **OAuth Providers**

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` - Facebook OAuth
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` - Twitter OAuth

### **Email Configuration**

- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` - Email sending
- `SMTP_FROM_ADDRESS` - From email address

### **Additional Branding**

- `APP_SIGNATURE` - App signature text
- `APP_LOGO_URL` - Logo URL
- `APP_LINK` - Main app website URL
- `APP_SLOGAN_TEXT` - Marketing slogan
- `COMPANY_LINK` - Company website URL
- `TERMS_LINK` - Terms of service URL
- `PRIVACY_POLICY_LINK` - Privacy policy URL

### **Site Metadata (SEO)**

- `NEXT_PUBLIC_SITE_NAME` - Site name for SEO
- `NEXT_PUBLIC_SITE_TITLE` - Site title for SEO
- `NEXT_PUBLIC_SITE_DESCRIPTION` - Site description for SEO
- `NEXT_PUBLIC_SITE_KEYWORDS` - Site keywords for SEO
- `NEXT_PUBLIC_WEB_APP_URL` - Web app URL
- `NEXT_PUBLIC_TWITTER_USERNAME` - Twitter handle

### **Infrastructure**

- `NEXT_PUBLIC_IMAGES_HOSTS` - Allowed image domains (comma-separated)
- `NEXT_PUBLIC_COOKIE_DOMAINS` - Cookie domains
- `AUTH_SECRET` - Authentication secret

## Environment-Specific Examples

### **Ever Teams (Production)**

```
APP_NAME="Ever Teams"
COMPANY_NAME="Ever Co. LTD"
GAUZY_API_SERVER_URL="https://api.ever.team"
```

### **Ever Cloc (app.cloc.ai)**

```
APP_NAME="Ever Cloc"
COMPANY_NAME="Ever Co. LTD"
GAUZY_API_SERVER_URL="https://api.cloc.ai"
```

## How to Configure

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Validation

The deployment workflow includes automatic validation of critical secrets. If any critical secret is missing, the deployment will fail with a clear error message.

## Support

If you need help configuring secrets for a new deployment, contact the development team.
