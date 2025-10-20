# 🎨 BRANDING AUDIT - Ever Teams to Environment Variables

## 📊 STATUS OVERVIEW

### ✅ COMPLETED

- [x] Added new environment variables to `.env.sample`
- [x] Updated K8s manifests (dev, prod, stage) with all branding variables
- [x] Updated GitHub Actions workflows (dev, prod, stage) with all branding variables
- [x] Externalized hardcoded images hosts array in `next.config.js`

### 🔄 IN PROGRESS

- [ ] Refactor hardcoded strings in code
- [ ] Update translation files

### ❌ TODO

- [ ] Test local environment switching
- [ ] Update documentation

---

## 🔍 IDENTIFIED HARDCODED REFERENCES

### 1. **packages/constants/src/metainfo.ts**

```typescript
export const SITE_NAME = "Ever Teams";
export const SITE_TITLE = "Open Work and Project Management Platform";
export const SITE_DESCRIPTION = "All-In-One Work & Workforce Management...";
export const SITE_KEYWORDS = "time tracking, open-work, project management...";
export const WEB_APP_URL = "https://app.ever.team/";
export const TWITTER_USERNAME = "ever-teams";
```

**ACTION**: Replace with environment variables

### 2. **apps/web/core/components/layouts/app-sidebar.tsx** (ligne 83)

```typescript
name: 'Ever Teams',
```

**ACTION**: Replace with dynamic value

### 3. **apps/web/core/components/common/workspace-switcher.tsx** (ligne 320)

```typescript
<span className="font-semibold truncate">Ever Teams</span>
```

**ACTION**: Replace with dynamic value

### 4. **Translation Files** (apps/web/locales/*.json)

Files containing "Ever Teams":

- en.json (4 occurrences)
- fr.json, de.json, es.json, it.json, nl.json, pt.json, pl.json, ru.json, zh.json, bg.json, he.json, ar.json

**ACTION**: Replace with dynamic placeholders like `{siteName}`

### 5. **packages/constants/src/baseurls.ts** (comments only)

```typescript
// # Ever Teams Web App Base Url
// # Ever Teams website url
```

**ACTION**: Update comments to be generic

---

## 🆕 NEW ENVIRONMENT VARIABLES ADDED

| Variable | Purpose | Default Value |
|----------|---------|---------------|
| `NEXT_PUBLIC_SITE_NAME` | Main site name | "Ever Teams" |
| `NEXT_PUBLIC_SITE_TITLE` | Page title/metadata | "Open Work and Project Management Platform" |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Meta description | "All-In-One Work & Workforce Management..." |
| `NEXT_PUBLIC_SITE_KEYWORDS` | SEO keywords | "time tracking, open-work, project management..." |
| `NEXT_PUBLIC_WEB_APP_URL` | Web app URL | "<https://app.ever.team/>" |
| `NEXT_PUBLIC_TWITTER_USERNAME` | Twitter handle | "ever-teams" |
| `NEXT_PUBLIC_IMAGES_HOSTS` | Allowed image domains | "dummyimage.com,res.cloudinary.com,..." |

---

## 🎯 NEXT STEPS

1. **Refactor metainfo.ts** to use environment variables
2. **Update components** to use dynamic values
3. **Update translation files** with placeholders
4. **Update deployment configs** (K8s, GitHub Actions)
5. **Test environment switching**

---

## 🔧 DEPLOYMENT FILES TO UPDATE

### K8s Manifests

- [ ] `.deploy/k8s/k8s-manifest.dev.yaml` - Add new environment variables
- [ ] `.deploy/k8s/k8s-manifest.prod.yaml` - Add new environment variables
- [ ] `.deploy/k8s/k8s-manifest.stage.yaml` - Add new environment variables

### GitHub Actions Workflows

- [ ] `.github/workflows/deploy-do-dev.yml` - Add new secrets/env vars
- [ ] `.github/workflows/deploy-do-prod.yml` - Add new secrets/env vars
- [ ] `.github/workflows/deploy-do-stage.yml` - Add new secrets/env vars

### Other deployment files to check

- [ ] Vercel deployment workflows
- [ ] Render deployment workflows
- [ ] Docker files (if any branding in build process)

---

## 📋 VARIABLES MISSING FROM DEPLOYMENTS

Currently missing from K8s manifests and GitHub Actions:

- `APP_NAME`
- `APP_SIGNATURE`
- `APP_LOGO_URL`
- `APP_LINK`
- `APP_SLOGAN_TEXT`
- `COMPANY_NAME`
- `COMPANY_LINK`
- `TERMS_LINK`
- `PRIVACY_POLICY_LINK`
- `MAIN_PICTURE`
- `MAIN_PICTURE_DARK`
- `NEXT_PUBLIC_SITE_NAME` (new)
- `NEXT_PUBLIC_SITE_TITLE` (new)
- `NEXT_PUBLIC_SITE_DESCRIPTION` (new)
- `NEXT_PUBLIC_SITE_KEYWORDS` (new)
- `NEXT_PUBLIC_WEB_APP_URL` (new)
- `NEXT_PUBLIC_TWITTER_USERNAME` (new)
- `NEXT_PUBLIC_IMAGES_HOSTS` (new)
