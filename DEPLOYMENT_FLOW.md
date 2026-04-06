# CrewConnect Frontend Deployment Flow (No Commands)

This guide is a command-free checklist you can follow using either:
- AWS Console
- AWS CLI automation

Use this as the high-level process for first-time setup and repeat deployments.

## 1. Initial Setup (Do Once)

### 1.1 Prepare app configuration
- Confirm production environment values are set for frontend build-time variables.
- Verify API base URL points to your production backend endpoint.
- Confirm auth provider keys and URLs are production values.
- Validate these values in the built output path your app uses.

### 1.2 Build production frontend artifacts
- Run a production web build.
- Confirm the output folder exists and includes:
  - main HTML entry point
  - static assets
  - runtime/config JSON files (if used)
- Sanity-check that branding/assets and route entry files are present.

### 1.3 Create and configure S3 bucket
- Create one bucket dedicated to the web frontend.
- Keep ownership and public access settings aligned with CloudFront-origin access strategy.
- Set SPA fallback behavior so deep links resolve to the app entry point.

### 1.4 Define object caching strategy
- Long cache for versioned static assets.
- No-cache (or very short cache) for HTML and dynamic manifest/config files.
- Ensure this strategy is consistent between initial upload and future updates.

### 1.5 Upload initial build to S3
- Upload all build artifacts.
- Ensure stale files are removed so old assets do not linger.
- Verify key files are reachable in the bucket.

### 1.6 Create CloudFront distribution
- Set S3 as the origin.
- Enforce HTTPS for viewers.
- Configure default behavior for most static files.
- Add specific cache behavior overrides for HTML/config paths if required.
- Confirm error/fallback behavior supports SPA routes.

### 1.7 Secure origin access (production hardening)
- Restrict bucket read access to CloudFront only.
- Remove public-read bucket policy once CloudFront access is verified.
- Confirm direct bucket object URL access is blocked (except where intentionally allowed).

### 1.8 Validate end-to-end deployment
- Wait for distribution deployment completion.
- Open the CloudFront URL and validate:
  - home page loads
  - deep links work
  - auth flow works
  - API calls hit production backend
- Verify browser cache headers match expected policy.

### 1.9 Optional domain and TLS
- Attach custom domain.
- Provision/attach certificate in required region for CloudFront.
- Update DNS and validate HTTPS on custom domain.

## 2. Repeat Deployment Flow (Every Update)

### 2.1 Pre-deploy checks
- Confirm production environment values have not regressed.
- Confirm backend endpoint and auth settings are still correct.
- Review release scope and rollback plan.

### 2.2 Build new frontend version
- Produce fresh production build.
- Validate output integrity (entry HTML, assets, config files).

### 2.3 Publish artifacts to S3
- Sync new build artifacts.
- Preserve cache rules:
  - long-lived cache for hashed/static assets
  - no-cache for HTML/config
- Remove files that no longer exist in the new build.

### 2.4 Refresh CloudFront content
- Create invalidation for changed paths (or all paths when needed).
- Track invalidation completion for critical releases.

### 2.5 Post-deploy verification
- Validate homepage and key routes.
- Validate login/session flows.
- Validate critical API-backed pages.
- Smoke test mobile and desktop browsers.

### 2.6 Observability and rollback readiness
- Monitor CloudFront and backend errors after release.
- Watch for cache-related regressions (old JS bundle, stale HTML, stale config).
- If critical issues occur, rollback by redeploying last known good build.

## 3. When Infrastructure Changes (As Needed)

Use this flow when changing bucket/distribution/security settings:
- Update CloudFront behavior/origin settings.
- Update S3 bucket policy and public access posture.
- Re-validate SPA routing and error fallback behavior.
- Re-test cache behavior and invalidation strategy.
- Re-verify custom domain, certificate, and DNS wiring.

## 4. Practical Checklist Summary

### One-time setup
- Production env verified
- First production build generated
- S3 bucket configured
- Initial upload complete
- CloudFront distribution created
- S3 restricted to CloudFront access
- Domain/TLS configured (optional)
- End-to-end validation complete

### Every release
- Production env re-verified
- New build generated
- S3 sync completed with correct cache strategy
- CloudFront invalidation run
- Post-deploy smoke tests passed
- Monitoring clean after release window
