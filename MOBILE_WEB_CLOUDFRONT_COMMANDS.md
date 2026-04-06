# CrewConnect Web + Mobile CloudFront Routing Commands (zsh)

This runbook exports both frontends, uploads to S3, and configures CloudFront so deep links work for both apps:

- `https://<domain>/login` -> web SPA
- `https://<domain>/mobile/login` -> mobile SPA

All commands below are for `zsh`.

## 1) Set environment variables

Run once per terminal session.

```zsh
# Keep strict error handling, but avoid nounset (-u) because VS Code zsh hooks may
# reference optional prompt vars like RPROMPT.
set -eo pipefail

export AWS_PAGER=""
export AWS_REGION="us-east-1"
export BUCKET_NAME="crewconnect-web-frontend"
export CF_DISTRIBUTION_ID="EKBX6UTNXR4SC"
export CF_FUNCTION_NAME="crewconnect-spa-router"
```

If you already ran `set -u` in your shell, disable it first:

```zsh
set +u
```

Optional quick checks:

```zsh
aws sts get-caller-identity --query Account --output text
aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text
```

## 2) Build web export (root app)

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web
npx expo export --platform web --clear
test -f dist/index.html && echo "web export ok"
```

## 3) Build mobile export (served under /mobile)

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/mobile
EXPO_PUBLIC_ENV=production npx expo export --platform web --clear
test -f dist/index.html && echo "mobile export ok"
```

## 4) Upload web to S3 root

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web

# Long cache for versioned assets
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
  --delete \
  --exclude "index.html" \
  --exclude "*.json" \
  --cache-control "public,max-age=31536000,immutable"

# No-cache for HTML/JSON entry files
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
  --exclude "*" \
  --include "index.html" \
  --include "*.json" \
  --cache-control "no-cache,no-store,must-revalidate,max-age=0"
```

## 5) Upload mobile to S3 /mobile prefix

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/mobile

# Long cache for versioned assets
aws s3 sync dist/ "s3://$BUCKET_NAME/mobile/" \
  --delete \
  --exclude "index.html" \
  --exclude "*.json" \
  --cache-control "public,max-age=31536000,immutable"

# No-cache for HTML/JSON entry files
aws s3 sync dist/ "s3://$BUCKET_NAME/mobile/" \
  --exclude "*" \
  --include "index.html" \
  --include "*.json" \
  --cache-control "no-cache,no-store,must-revalidate,max-age=0"
```

## 6) Create or update CloudFront Function for SPA routing

This function ensures:

- `/mobile` and `/mobile/*` rewrite to `/mobile/index.html`
- all other non-file routes rewrite to `/index.html`

```zsh
cat > /tmp/crewconnect-spa-router.js <<'EOF'
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Keep file requests unchanged, for example "/app.js" or "/image.png"
  if (/\.[^\/]+$/.test(uri)) {
    return request;
  }

  // Mobile SPA entry
  if (uri === '/mobile' || uri.indexOf('/mobile/') === 0) {
    request.uri = '/mobile/index.html';
    return request;
  }

  // Root web SPA entry
  request.uri = '/index.html';
  return request;
}
EOF

if aws cloudfront describe-function --name "$CF_FUNCTION_NAME" --stage DEVELOPMENT >/tmp/cf-fn-desc.json 2>/dev/null; then
  ETAG=$(jq -r '.ETag' /tmp/cf-fn-desc.json)
  aws cloudfront update-function \
    --name "$CF_FUNCTION_NAME" \
    --if-match "$ETAG" \
    --function-config Comment="CrewConnect SPA router",Runtime=cloudfront-js-2.0 \
    --function-code fileb:///tmp/crewconnect-spa-router.js >/tmp/cf-fn-update.json
else
  aws cloudfront create-function \
    --name "$CF_FUNCTION_NAME" \
    --function-config Comment="CrewConnect SPA router",Runtime=cloudfront-js-2.0 \
    --function-code fileb:///tmp/crewconnect-spa-router.js >/tmp/cf-fn-create.json
fi

ETAG=$(aws cloudfront describe-function --name "$CF_FUNCTION_NAME" --stage DEVELOPMENT --query 'ETag' --output text)
aws cloudfront publish-function --name "$CF_FUNCTION_NAME" --if-match "$ETAG" >/tmp/cf-fn-publish.json

export CF_FUNCTION_ARN=$(aws cloudfront describe-function --name "$CF_FUNCTION_NAME" --stage LIVE --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
echo "Using function ARN: $CF_FUNCTION_ARN"
```

## 7) Attach function to distribution default behavior

This also disables global CloudFront custom error fallback so `/mobile/*` does not get forced to `/index.html`.

```zsh
aws cloudfront get-distribution-config --id "$CF_DISTRIBUTION_ID" --output json >/tmp/cf-dist-full.json
ETAG=$(jq -r '.ETag' /tmp/cf-dist-full.json)

jq '.DistributionConfig
| .DefaultCacheBehavior.FunctionAssociations = (
    (.DefaultCacheBehavior.FunctionAssociations // {"Quantity":0,"Items":[]})
    | .Items = ((.Items // [])
      | map(select(.EventType != "viewer-request"))
      + [{"EventType":"viewer-request","FunctionARN":env.CF_FUNCTION_ARN}])
    | .Quantity = (.Items | length)
  )
| .CustomErrorResponses = {"Quantity":0}' /tmp/cf-dist-full.json >/tmp/cf-dist-updated-config.json

aws cloudfront update-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/cf-dist-updated-config.json >/tmp/cf-dist-update-result.json
```

Wait for distribution deployment:

```zsh
while true; do
  STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text)
  echo "CloudFront status: $STATUS"
  [[ "$STATUS" == "Deployed" ]] && break
  sleep 30
done
```

## 8) Invalidate cache

```zsh
aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "/index.html" "/mobile/index.html" "/_expo/*" "/mobile/_expo/*"
```

If you need a full cache reset:

```zsh
aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/*"
```

## 9) Verify routing

```zsh
CF_DOMAIN=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.DomainName' --output text)
echo "https://$CF_DOMAIN/login"
echo "https://$CF_DOMAIN/mobile/login"
```

Open both URLs in a fresh/private browser window and hard refresh each route.

## 10) One-shot deploy command (after setup is stable)

Use this after your function/distribution config is already in place.

```zsh
set -eo pipefail
export AWS_PAGER=""
export AWS_REGION="us-east-1"
export BUCKET_NAME="crewconnect-web-frontend"
export CF_DISTRIBUTION_ID="EKBX6UTNXR4SC"

cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web
npx expo export --platform web --clear
aws s3 sync dist/ "s3://$BUCKET_NAME/" --delete --exclude "index.html" --exclude "*.json" --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/ "s3://$BUCKET_NAME/" --exclude "*" --include "index.html" --include "*.json" --cache-control "no-cache,no-store,must-revalidate,max-age=0"

cd /Users/joelmoffatt/VSCode/crewconnect/frontend/mobile
EXPO_PUBLIC_ENV=production npx expo export --platform web --clear
aws s3 sync dist/ "s3://$BUCKET_NAME/mobile/" --delete --exclude "index.html" --exclude "*.json" --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/ "s3://$BUCKET_NAME/mobile/" --exclude "*" --include "index.html" --include "*.json" --cache-control "no-cache,no-store,must-revalidate,max-age=0"

aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/index.html" "/mobile/index.html" "/_expo/*" "/mobile/_expo/*"
echo "Deploy complete"
```
