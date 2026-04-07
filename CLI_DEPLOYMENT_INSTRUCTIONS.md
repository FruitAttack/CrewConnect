# CrewConnect Frontend CLI Deployment Instructions

This is a command-first deployment runbook based on the deployment flow checklist.

Shell target for all commands in this document: zsh.

Fixed constants used throughout this guide:
- Bucket: crewconnect-web-frontend
- Region: us-east-1

CloudFront Distribution ID is created during setup and exported to `CF_DISTRIBUTION_ID`.

## 0) Set constants once per terminal session

Run these first so every command uses the same values:

```zsh
export AWS_PAGER=""
export AWS_REGION=us-east-1
export BUCKET_NAME=crewconnect-web-frontend
export ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

## 1) Initial setup (one time)

### 1.1 Prepare app configuration

From the repository root, confirm production variables are set for the web build:

```zsh
cd frontend/web
grep -E 'EXPO_PUBLIC_ENV|EXPO_PUBLIC_API_BASE_URL|EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE' .env
```

Expected:
- EXPO_PUBLIC_ENV=production
- Production API/Auth values

### 1.2 Build production frontend artifacts

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web
npm install
npx expo export --platform web --clear
test -f dist/index.html && echo "Build OK"
```

### 1.3 Create and configure S3 bucket

Create bucket in us-east-1 (special case: no create-bucket-configuration argument):

```zsh
aws s3api create-bucket \
  --bucket "$BUCKET_NAME" \
  --region "$AWS_REGION"
```

Keep public ACLs blocked and allow policies (needed for CloudFront policy-based access):

```zsh
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false
```

### 1.4 Define caching strategy in upload commands

Use two upload passes:
- Long cache for hashed static assets
- No-cache for HTML and runtime JSON/config

### 1.5 Upload initial build to S3

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web

# 1) Long cache for most static assets
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --exclude "index.html" \
  --exclude "*.json" \
  --cache-control "public,max-age=31536000,immutable"

# 2) No-cache for HTML + JSON
aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --exclude "*" \
  --include "index.html" \
  --include "*.json" \
  --cache-control "no-cache,no-store,must-revalidate,max-age=0"
```

### 1.6 Create CloudFront distribution and set variables

Create a new distribution that points to your S3 bucket, then export the generated ID/domain:

```zsh
cat > /tmp/cf-create-config.json <<EOF
{
  "CallerReference": "crewconnect-$(date +%s)",
  "Comment": "CrewConnect web frontend",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3Origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0
  },
  "PriceClass": "PriceClass_100",
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true
  }
}
EOF

aws cloudfront create-distribution --distribution-config file:///tmp/cf-create-config.json > /tmp/cf-create-output.json
export CF_DISTRIBUTION_ID=$(jq -r '.Distribution.Id' /tmp/cf-create-output.json)
export CF_DOMAIN_NAME=$(jq -r '.Distribution.DomainName' /tmp/cf-create-output.json)
echo "CF_DISTRIBUTION_ID=$CF_DISTRIBUTION_ID"
echo "CF_DOMAIN_NAME=$CF_DOMAIN_NAME"

# Wait for initial distribution deployment
while true; do STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text); echo "CloudFront status: $STATUS"; [[ "$STATUS" == "Deployed" ]] && break; sleep 30; done
```

### 1.7 Configure CloudFront for SPA fallback

For SPA deep links, add custom error responses on the distribution you just created:
- 403 -> /index.html (200)
- 404 -> /index.html (200)

```zsh
# Get fresh config
aws cloudfront get-distribution-config \
  --id "$CF_DISTRIBUTION_ID" \
  --output json > /tmp/cf-errors-fresh.json

# Extract ETAG
ETAG=$(jq -r '.ETag' /tmp/cf-errors-fresh.json)

# Add custom error responses
jq '.DistributionConfig.CustomErrorResponses = {
  "Quantity": 2,
  "Items": [
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 0
    },
    {
      "ErrorCode": 403,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 0
    }
  ]
}' /tmp/cf-errors-fresh.json > /tmp/cf-errors-updated.json

# Extract DistributionConfig
jq '.DistributionConfig' /tmp/cf-errors-updated.json > /tmp/cf-errors-dist-config.json

# Apply
aws cloudfront update-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --distribution-config file:///tmp/cf-errors-dist-config.json \
  --if-match "$ETAG"

# Wait until CloudFront finishes this update before next change
while true; do STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text); echo "CloudFront status: $STATUS"; [[ "$STATUS" == "Deployed" ]] && break; sleep 30; done
```

### 1.8 Create Origin Access Control (OAC) and link to distribution

OAC allows CloudFront to sign requests to S3. You must still add a bucket policy that allows this distribution.

Create and apply OAC:

```zsh
# Create OAC
OAC_ID=$(aws cloudfront create-origin-access-control \
  --origin-access-control-config '{
    "Name": "CrewConnect-OAC",
    "OriginAccessControlOriginType": "s3",
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4"
  }' \
  --query 'OriginAccessControl.Id' \
  --output text)

echo "OAC ID: $OAC_ID"

# Get fresh distribution config
aws cloudfront get-distribution-config \
  --id "$CF_DISTRIBUTION_ID" \
  --output json > /tmp/cf-oac-fresh.json

# Extract ETAG and update config with OAC ID
ETAG=$(jq -r '.ETag' /tmp/cf-oac-fresh.json)
jq ".DistributionConfig.Origins.Items[0].OriginAccessControlId = \"$OAC_ID\"" /tmp/cf-oac-fresh.json > /tmp/cf-oac-updated-full.json
jq '.DistributionConfig' /tmp/cf-oac-updated-full.json > /tmp/cf-oac-dist-config.json

# Apply update
aws cloudfront update-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/cf-oac-dist-config.json

# Verify OAC is linked
aws cloudfront get-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --query 'Distribution.DistributionConfig.Origins.Items[0].OriginAccessControlId' \
  --output text

# Verify origin is NOT Public mode
# Expected:

# - OriginAccessControlId is non-empty
# - OriginAccessIdentity is empty
aws cloudfront get-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --query 'Distribution.DistributionConfig.Origins.Items[0].[OriginAccessControlId,S3OriginConfig.OriginAccessIdentity]' \
  --output text

# Wait for deployment before testing
while true; do STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text); echo "CloudFront status: $STATUS"; [[ "$STATUS" == "Deployed" ]] && break; sleep 30; done
```

Add required S3 bucket policy for OAC:

```zsh
cat > /tmp/crewconnect-oac-bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$CF_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy file:///tmp/crewconnect-oac-bucket-policy.json
```

### 1.9 Validate end-to-end deployment

```zsh
while true; do STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text); echo "CloudFront status: $STATUS"; [[ "$STATUS" == "Deployed" ]] && break; sleep 30; done

aws cloudfront get-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text
```

Open the returned domain and validate:
- Home page loads
- Deep links load directly
- Login/auth flow works
- API calls hit production backend

### 1.10 Optional custom domain and TLS

If needed later, add alternate domain names and ACM cert (us-east-1) to this same distribution.

## 2) Repeat deployment flow (every release)

### 2.1 Pre-deploy checks

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web
grep -E 'EXPO_PUBLIC_ENV|EXPO_PUBLIC_API_BASE_URL' .env
```

### 2.2 Build new frontend version

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web
npx expo export --platform web --clear
```

### 2.3 Publish artifacts to S3 with cache rules

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web

aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --delete \
  --exclude "index.html" \
  --exclude "*.json" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync dist/ s3://$BUCKET_NAME/ \
  --exclude "*" \
  --include "index.html" \
  --include "*.json" \
  --cache-control "no-cache,no-store,must-revalidate,max-age=0"
```

### 2.4 Invalidate CloudFront cache

```zsh
aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "/*"
```

Check invalidation status:

```zsh
aws cloudfront list-invalidations \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --query 'InvalidationList.Items[0].[Id,Status,CreateTime]' \
  --output table
```

### 2.5 Post-deploy verification

Validate homepage, deep links, login/session flows, and critical API-backed pages on desktop and mobile browsers.

### 2.6 Observability and rollback readiness

If release has critical issues, redeploy the last known good build folder using the same two-pass S3 sync + CloudFront invalidation flow.

## 3) Infrastructure changes (as needed)

When you change bucket/distribution/security settings:
- Reconfirm OAC is attached to the origin
- Re-apply OAC bucket policy if distribution or account values changed
- Re-check SPA fallback custom error responses
- Re-test cache behavior and perform invalidation

## 4) Quick command pack (copy/paste)

```zsh
export AWS_REGION=us-east-1
export BUCKET_NAME=crewconnect-web-frontend
export CF_DISTRIBUTION_ID=$(aws cloudfront list-distributions --output json | jq -r --arg origin "${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com" '.DistributionList.Items[] | select(any(.Origins.Items[]; .DomainName == $origin)) | .Id' | head -n1)
echo "CF_DISTRIBUTION_ID=$CF_DISTRIBUTION_ID"

cd /Users/joelmoffatt/VSCode/crewconnect/frontend/web
npx expo export --platform web --clear

aws s3 sync dist/ s3://$BUCKET_NAME/ --delete --exclude "index.html" --exclude "*.json" --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist/ s3://$BUCKET_NAME/ --exclude "*" --include "index.html" --include "*.json" --cache-control "no-cache,no-store,must-revalidate,max-age=0"

aws cloudfront create-invalidation --distribution-id "$CF_DISTRIBUTION_ID" --paths "/*"
```