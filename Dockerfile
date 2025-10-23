# syntax = docker/dockerfile:1

# Ever Teams Platform

ARG NODE_VERSION=22.18.0
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://api.ever.team
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_CAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_DISABLE_AUTO_REFRESH=false
ARG NEXT_PUBLIC_COOKIE_DOMAINS=ever.team
ARG NEXT_PUBLIC_BOARD_APP_DOMAIN=https://board.ever.team
ARG NEXT_PUBLIC_BOARD_BACKEND_POST_URL=https://jsonboard.ever.team/api/v2/post/
ARG NEXT_PUBLIC_BOARD_FIREBASE_CONFIG
ARG NEXT_PUBLIC_MEET_DOMAIN=https://meet.ever.team
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DEBUG
ARG NEXT_PUBLIC_JITSU_BROWSER_URL
ARG NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY
ARG NEXT_PUBLIC_GITHUB_APP_NAME=ever-github
ARG NEXT_PUBLIC_CHATWOOT_API_KEY
ARG NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true

# App Branding Variables
ARG APP_NAME=Ever Teams
ARG APP_SIGNATURE=Ever Teams
ARG APP_LOGO_URL=/assets/ever-teams.png
ARG APP_LINK=https://ever.team
ARG APP_SLOGAN_TEXT=Real-Time Clarity, Real-Time Reality™.
ARG COMPANY_NAME=Ever Co. LTD
ARG COMPANY_LINK=https://ever.team
ARG TERMS_LINK=https://ever.team/terms
ARG PRIVACY_POLICY_LINK=https://ever.team/privacy
ARG MAIN_PICTURE=/assets/ever-teams.png
ARG MAIN_PICTURE_DARK=/assets/ever-teams.png

# Site Metadata Variables
ARG NEXT_PUBLIC_SITE_NAME=Ever Teams
ARG NEXT_PUBLIC_SITE_TITLE=Open Work and Project Management Platform
ARG NEXT_PUBLIC_SITE_DESCRIPTION=All-In-One Work & Workforce Management, Time Management, Time Tracking, Activity Tracking, Productivity Tracking & Metrics, Projects / Tasks & Issues Management, Organizations & Teams, Integrations (GitHub, JIRA, ...) and More!
ARG NEXT_PUBLIC_SITE_KEYWORDS=time tracking, open-work, project management, software development, task management, team collaboration, agile, kanban, scrum, gantt chart, resource management, project management, work items tracking, agile, scrum, collaboration
ARG NEXT_PUBLIC_WEB_APP_URL=https://app.ever.team/
ARG NEXT_PUBLIC_TWITTER_USERNAME=ever-teams
ARG NEXT_PUBLIC_IMAGES_HOSTS=dummyimage.com,res.cloudinary.com,gauzy.sfo2.digitaloceanspaces.com,cdn-icons-png.flaticon.com,api.gauzy.co,apida.gauzy.co,apicw.gauzy.co,apicivo.gauzy.co,apidev.gauzy.co,apidemo.gauzy.co,apidemocw.gauzy.co,apidemodt.gauzy.co,apidemodts.gauzy.co,apidemocivo.gauzy.co,apidemoda.gauzy.co,apistage.gauzy.co,apistagecivo.gauzy.co,apistagecw.gauzy.co,apistageda.gauzy.co,apistagedt.gauzy.co,apistagedts.gauzy.co,api.ever.team,app.ever.team,apidev.ever.team,gauzy.s3.wasabisys.com,gauzystage.s3.wasabisys.com

# OAuth Configuration
ARG NEXT_PUBLIC_GOOGLE_APP_NAME=Ever Teams
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXT_PUBLIC_FACEBOOK_APP_NAME=Ever Teams
ARG FACEBOOK_CLIENT_ID
ARG FACEBOOK_CLIENT_SECRET
ARG NEXT_PUBLIC_TWITTER_APP_NAME=Ever Teams
ARG TWITTER_CLIENT_ID
ARG TWITTER_CLIENT_SECRET
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET

# Additional Configuration
ARG NEXT_PUBLIC_CAPTCHA_TYPE=recaptcha
ARG NEXT_PUBLIC_MEET_TYPE=jitsi
ARG LIVEKIT_API_SECRET
ARG LIVEKIT_API_KEY
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG INVITE_CALLBACK_URL=https://app.ever.team/auth/accept-invite
ARG VERIFY_EMAIL_CALLBACK_URL=https://app.ever.team/verify-email
ARG SMTP_PORT=587
ARG SENTRY_LOG_LEVEL=error
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED=false
ARG LOG_FOLDER_MAX_SIZE=10
ARG NEXT_PUBLIC_LOG_FOLDER_MAX_SIZE=10
ARG ACTIVE_LOCAL_LOG_SYSTEM=false
ARG NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM=false
ARG IS_DESKTOP_APP=false
ARG DEMO=false
ARG ANALYZE=false

# Server Configuration
ARG GAUZY_API_SERVER_URL=https://api.ever.team
ARG JITSU_SERVER_URL
ARG JITSU_SERVER_WRITE_KEY
ARG AUTH_SECRET
ARG CAPTCHA_SECRET_KEY
ARG SMTP_FROM_ADDRESS
ARG SMTP_HOST
ARG SMTP_SECURE=true
ARG SMTP_USERNAME
ARG SMTP_PASSWORD
ARG MEET_JWT_APP_ID
ARG MEET_JWT_APP_SECRET
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DSN
ARG POSTMARK_SERVER_API_TOKEN
ARG MAILCHIMP_API_KEY
ARG MAILCHIMP_LIST_ID

FROM node:${NODE_VERSION}-slim AS base

# Output the environment variable value (debug)
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL
RUN echo "NEXT_PUBLIC_GAUZY_API_SERVER_URL=${NEXT_PUBLIC_GAUZY_API_SERVER_URL}"

LABEL maintainer="ever@ever.co"
LABEL org.opencontainers.image.source="https://github.com/ever-co/ever-teams"

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_BUILD_OUTPUT_TYPE=standalone
ENV NEXT_SHARP_PATH=/temp/node_modules/sharp

RUN npm i -g npm@9

# Pre-install Sharp for Next.js image optimization support
RUN mkdir /temp && cd /temp && npm i sharp

RUN npm cache clean --force

# Throw-away build stage to reduce size of final image
FROM base AS build

# We make env vars passed as build argument to be available in this build stage because we prebuild the NextJs app
ARG NEXT_PUBLIC_GAUZY_API_SERVER_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_CAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_DISABLE_AUTO_REFRESH
ARG NEXT_PUBLIC_COOKIE_DOMAINS
ARG NEXT_PUBLIC_BOARD_APP_DOMAIN
ARG NEXT_PUBLIC_BOARD_BACKEND_POST_URL
ARG NEXT_PUBLIC_BOARD_FIREBASE_CONFIG
ARG NEXT_PUBLIC_MEET_DOMAIN
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DEBUG
ARG NEXT_PUBLIC_JITSU_BROWSER_URL
ARG NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY
ARG NEXT_PUBLIC_GITHUB_APP_NAME
ARG NEXT_PUBLIC_CHATWOOT_API_KEY

# App Branding Variables
ARG APP_NAME
ARG APP_SIGNATURE
ARG APP_LOGO_URL
ARG APP_LINK
ARG APP_SLOGAN_TEXT
ARG COMPANY_NAME
ARG COMPANY_LINK
ARG TERMS_LINK
ARG PRIVACY_POLICY_LINK
ARG MAIN_PICTURE
ARG MAIN_PICTURE_DARK

# Site Metadata Variables
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_TITLE
ARG NEXT_PUBLIC_SITE_DESCRIPTION
ARG NEXT_PUBLIC_SITE_KEYWORDS
ARG NEXT_PUBLIC_WEB_APP_URL
ARG NEXT_PUBLIC_TWITTER_USERNAME
ARG NEXT_PUBLIC_IMAGES_HOSTS

# OAuth Configuration
ARG NEXT_PUBLIC_GOOGLE_APP_NAME
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG NEXT_PUBLIC_FACEBOOK_APP_NAME
ARG FACEBOOK_CLIENT_ID
ARG FACEBOOK_CLIENT_SECRET
ARG NEXT_PUBLIC_TWITTER_APP_NAME
ARG TWITTER_CLIENT_ID
ARG TWITTER_CLIENT_SECRET
ARG GITHUB_CLIENT_ID
ARG GITHUB_CLIENT_SECRET

# Additional Configuration
ARG NEXT_PUBLIC_CAPTCHA_TYPE
ARG NEXT_PUBLIC_MEET_TYPE
ARG LIVEKIT_API_SECRET
ARG LIVEKIT_API_KEY
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG INVITE_CALLBACK_URL
ARG VERIFY_EMAIL_CALLBACK_URL
ARG SMTP_PORT
ARG SENTRY_LOG_LEVEL
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED
ARG LOG_FOLDER_MAX_SIZE
ARG NEXT_PUBLIC_LOG_FOLDER_MAX_SIZE
ARG ACTIVE_LOCAL_LOG_SYSTEM
ARG NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM
ARG IS_DESKTOP_APP
ARG DEMO
ARG ANALYZE

# Server Configuration
ARG GAUZY_API_SERVER_URL
ARG JITSU_SERVER_URL
ARG JITSU_SERVER_WRITE_KEY
ARG AUTH_SECRET
ARG CAPTCHA_SECRET_KEY
ARG SMTP_FROM_ADDRESS
ARG SMTP_HOST
ARG SMTP_SECURE
ARG SMTP_USERNAME
ARG SMTP_PASSWORD
ARG MEET_JWT_APP_ID
ARG MEET_JWT_APP_SECRET
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_DSN
ARG POSTMARK_SERVER_API_TOKEN
ARG MAILCHIMP_API_KEY
ARG MAILCHIMP_LIST_ID

# Install packages needed to build node modules
RUN apt-get update -qq && \
	apt-get install -y build-essential pkg-config python-is-python3

# Install Yarn
RUN npm install -g yarn --force

# --- STEP 1: Copy only lockfiles and manifests for dependency resolution ---
COPY package.json yarn.lock ./

COPY packages/constants/package.json packages/constants/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/services/package.json packages/services/package.json
COPY packages/hooks/package.json packages/hooks/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json
COPY apps/web/package.json ./apps/web/package.json

# Set working directory to the web app
WORKDIR /app/apps/web

# --- STEP 2: Install deps in deterministic and cacheable way ---
RUN yarn install --frozen-lockfile --non-interactive --ignore-scripts

# --- STEP 3: Copy the rest of the repo for build ---
WORKDIR /app
COPY . .

# Set production env
ENV NODE_ENV=production
ENV NEXT_IGNORE_ESLINT_ERROR_ON_BUILD=true

# --- STEP 4: Build the web application ---
RUN yarn run build:web

# --- STEP 5: Remove dev dependencies and clean cache --- Remove dev dependencies (to reduce final image size)
WORKDIR /app/apps/web
RUN yarn install --prod --ignore-scripts
RUN yarn cache clean

# ------------------------------------------------------------------------------
# Runtime stage: lightweight image that serves the built application
# ------------------------------------------------------------------------------

FROM base

# Copy build artifacts from the previous stage
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# Default port for the web server
EXPOSE 3030
ENV PORT=3030

# Start Next.js server
CMD [ "node", "./apps/web/server.js" ]
