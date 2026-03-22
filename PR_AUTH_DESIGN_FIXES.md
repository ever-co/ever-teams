# 🚀 Redesign auth pages & fix broken layout after OTP 6→8 change

## Description

The OTP code length was recently increased from 6 to 8 characters, which broke the auth pages layout — inputs were overflowing, spacing was off, and the overall look felt outdated. Instead of just patching the overflow, I took the opportunity to modernize the entire auth layout and fix several usability bugs on the workspace selection screen.

- Completely redesigned `AuthLayout` with a cleaner, modern split-panel layout (image left, form right)
- Fixed the OTP input to properly accommodate 8 characters without breaking
- Fixed workspace selection bugs (clipped icons, non-togglable accordion)

## What Was Changed

### Major Changes

- **Full `AuthLayout` redesign**: Replaced the old `flex-row` split layout with a modern CSS Grid approach (`lg:grid-cols-5`). The left panel now uses `fixed` positioning with gradient overlays and a blockquote section. The right panel has a clean vertical flow: logo/slogan → centered form → footer with copyright, legal links, language switcher and theme toggle — all self-contained (no more separate `Footer` component import)
- **Added `headerLinkText`/`headerLinkHref` props** to `AuthLayout` for contextual navigation links (e.g. "Register Now!" on login, "Login" on register)
- **Fixed OTP input layout** in `page-component.tsx` to handle 8-character codes without overflow
- **Fixed workspace list clipping**: Replaced Radix `ScrollArea` with native `overflow-y-auto` — Radix's negative-margin scrollbar trick was cutting off the selection icons on the right edge
- **Fixed workspace accordion toggle**: Chevron now properly opens and closes (was only opening before)

### Minor Changes

- Added missing i18n keys (`TERMS_OF_SERVICE`, `PRIVACY_POLICY`, `AND`, `FORGOT_PASSWORD`) across all locale files — was blocking TypeScript build
- Restored the app slogan (`APP_SLOGAN_TEXT`) below the logo in the auth header
- Removed dependency on the old `Footer` component and `clsxm` utility in auth layout

## How to Test This PR

1. Run the app with `yarn dev:web`
2. Open `http://localhost:3030/auth/passcode`
3. Check the overall auth page design:
   - Left panel shows the app screenshot with gradient overlay and quote text
   - Right panel has logo + slogan at top, form centered, footer at bottom
   - Layout is responsive — left panel hides on mobile
   - Dark mode works correctly (separate images, proper color scheme)
4. Enter an email and verify:
   - The 8-digit OTP input fields fit properly, no overflow
   - "Register Now!" link appears in the top-right corner
5. Reach the "Select Workspace" screen and verify:
   - Selection icons (circles) on the right side are fully visible
   - Clicking a workspace chevron opens it, clicking again closes it
   - The selected workspace auto-expands on load
6. Switch language and toggle dark mode from the footer
7. Run `cd apps/web && npx tsc --noEmit --skipLibCheck` — should pass with 0 errors

## Screenshots (if needed)

| Before | After |
| ------ | ----- |
| (Add screenshot of old auth layout) | (Add screenshot of new auth layout) |
| (Add screenshot of broken OTP overflow) | (Add screenshot of fixed OTP) |
| (Add screenshot of clipped workspace icons) | (Add screenshot of visible icons) |

### Previous screenshots

<!-- Add screenshots/videos of the old auth design and broken OTP layout -->

### Current screenshots

<!-- Add screenshots/videos of the new modern auth design -->

## Related Issues

- Related to the OTP code length change from 6 to 8 characters

## Type of Change

- [x] Bug fix (fixes a problem)
- [x] New feature (adds functionality)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced

## Notes for the Reviewer (Optional)

- The `AuthLayout` was rewritten from scratch — the old version used `flex-row` with a `fixed w-1/2` left panel and a separate `Footer` component. The new version uses CSS Grid, self-contained footer, and cleaner responsive behavior.
- The Radix `ScrollArea` replacement in the workspace list is intentional — its custom scrollbar uses a negative-margin trick that clips content on the right edge. A native `overflow-y-auto` div avoids this entirely.
- The i18n additions are small but were required — `en.json` is the TypeScript type source and all locale files must match its structure.

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation
- `@Innocent-Akim` for auth and cookie handling and assistance

