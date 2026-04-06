# CrewConnect Custom Domain Setup (crewconnectname.com)

Complete guide to add a custom domain to your CloudFront distribution using AWS Certificate Manager and external domain registrar (no Route 53 needed).

## Prerequisites

- Custom domain registered at a registrar (Namecheap, GoDaddy, Domain.com, Porkbun, etc.)
- AWS Account with CloudFront distribution already deployed
- AWS CLI configured
- zsh terminal

## Environment Variables

Set once per terminal session:

```zsh
set -eo pipefail

export AWS_PAGER=""
export AWS_REGION="us-east-1"
export CF_DISTRIBUTION_ID="EKBX6UTNXR4SC"
export CUSTOM_DOMAIN="crewconnect.site"
export WWW_DOMAIN="www.crewconnect.site"
export CERT_ARN="arn:aws:acm:us-east-1:613426352709:certificate/4bed3032-c9f0-4a82-870d-a164a9e100b0"
```

## Step 1: Request ACM Certificate

Request a wildcard certificate valid for both your domain and www subdomain:

```zsh
CERT_ARN=$(aws acm request-certificate \
  --domain-name "$CUSTOM_DOMAIN" \
  --subject-alternative-names "$WWW_DOMAIN" \
  --validation-method DNS \
  --region "$AWS_REGION" \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"
```

**Save this ARN** — you'll need it in the next step.

## Step 2: Validate Certificate via DNS

AWS will send validation records. You have two options:

### Option A: Automatic Email Validation (Easier)
- Check your domain registrant email
- Click validation link
- Takes 5-30 minutes

### Option B: Manual DNS Validation (Recommended)
Get the validation records:

```zsh
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region "$AWS_REGION" \
  --query 'Certificate.DomainValidationOptions[].{Domain:DomainName,Status:ValidationStatus,RecordName:ResourceRecord.Name,RecordType:ResourceRecord.Type,RecordValue:ResourceRecord.Value}' \
  --output table
```

For each domain, log into your registrar and add the DNS record exactly as shown. Certificate should be **Issued** within a few minutes of DNS propagation.

## Step 3: Get Current CloudFront Configuration

```zsh
aws cloudfront get-distribution-config \
  --id "$CF_DISTRIBUTION_ID" \
  --output json > /tmp/cf-dist-config.json

ETAG=$(jq -r '.ETag' /tmp/cf-dist-config.json)
echo "ETag: $ETAG"
```

## Step 3.5: Verify Required Variables

Run this before updating CloudFront:

```zsh
for var in AWS_REGION CF_DISTRIBUTION_ID CUSTOM_DOMAIN WWW_DOMAIN CERT_ARN ETAG; do
  [[ -n "${(P)var}" ]] || { echo "Missing required variable: $var"; exit 1; }
done

[[ "$AWS_REGION" == "us-east-1" ]] || { echo "AWS_REGION must be us-east-1 for CloudFront ACM certificates"; exit 1; }

echo "✓ Variables look good"
echo "AWS_REGION=$AWS_REGION"
echo "CF_DISTRIBUTION_ID=$CF_DISTRIBUTION_ID"
echo "CUSTOM_DOMAIN=$CUSTOM_DOMAIN"
echo "WWW_DOMAIN=$WWW_DOMAIN"
echo "CERT_ARN=$CERT_ARN"
echo "ETAG=$ETAG"
```

## Step 4: Update CloudFront with Custom Domain

Add your alternate domain names and certificate:

```zsh
jq ".DistributionConfig |
  .Aliases = {
    \"Quantity\": 2,
    \"Items\": [\"$CUSTOM_DOMAIN\", \"$WWW_DOMAIN\"]
  } |
  .ViewerCertificate = {
    \"ACMCertificateArn\": \"$CERT_ARN\",
    \"SSLSupportMethod\": \"sni-only\",
    \"MinimumProtocolVersion\": \"TLSv1.2_2021\",
    \"Certificate\": \"$CERT_ARN\",
    \"CertificateSource\": \"acm\"
  }" /tmp/cf-dist-config.json > /tmp/cf-dist-updated.json

aws cloudfront update-distribution \
  --id "$CF_DISTRIBUTION_ID" \
  --if-match "$ETAG" \
  --distribution-config file:///tmp/cf-dist-updated.json \
  --output json > /tmp/cf-dist-result.json

echo "✓ CloudFront updated with custom domain"
```

Monitor deployment:

```zsh
while true; do
  STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text)
  echo "CloudFront status: $STATUS"
  [[ "$STATUS" == "Deployed" ]] && break
  sleep 15
done

echo "✓ CloudFront deployment complete"
```

## Step 5: Get Your CloudFront Domain Name

```zsh
CF_DOMAIN=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.DomainName' --output text)
echo "CloudFront domain: $CF_DOMAIN"
```

## Step 6: Point Domain to CloudFront

Log into your domain registrar (Namecheap, GoDaddy, etc.) and add DNS records:

### For Root Domain (@)
- **Type:** CNAME or ALIAS/ANAME
- **Name:** `@` or leave blank (depends on registrar)
- **Value:** `$CF_DOMAIN` (from Step 5)
- **TTL:** 3600 (or automatic)

### For www Subdomain
- **Type:** CNAME
- **Name:** `www`
- **Value:** `$CF_DOMAIN` (same as root)
- **TTL:** 3600 (or automatic)

**Save changes** in your registrar.

## Step 7: Verify DNS Propagation

Check domain resolution (wait 5-15 minutes if records don't show immediately):

```zsh
nslookup "$CUSTOM_DOMAIN"
nslookup "$WWW_DOMAIN"

# Should resolve to your CloudFront domain
```

DNS checker tool (optional): https://dns.google/

## Step 8: Test HTTPS & Routing

Wait 5-10 minutes after DNS propagation, then test:

```zsh
# Test root web app
curl -I "https://$CUSTOM_DOMAIN/login"

# Test mobile app
curl -I "https://$CUSTOM_DOMAIN/mobile/login"

# Test www
curl -I "https://$WWW_DOMAIN/login"
```

All should return **HTTP 200** with content-type `text/html`.

Open in browser (fresh/private window):
- `https://crewconnectname.com`
- `https://crewconnectname.com/login`
- `https://crewconnectname.com/mobile/login`
- `https://www.crewconnectname.com`

Hard refresh (`Cmd+Shift+R` on Mac) if needed.

## Step 9: Cache Invalidation (If Needed)

If you're replacing an existing distribution, invalidate cache:

```zsh
aws cloudfront create-invalidation \
  --distribution-id "$CF_DISTRIBUTION_ID" \
  --paths "/index.html" "/mobile/index.html" "/_expo/*" "/mobile/_expo/*" "/*"

echo "✓ Invalidation submitted"
```

## Troubleshooting

### Certificate shows "Pending Validation"
- Ensure DNS records are correctly added at your registrar
- Wait 10-15 minutes for propagation
- Run: `aws acm describe-certificate --certificate-arn $CERT_ARN --region us-east-1`

### Domain shows "Not Found" in browser
- DNS not propagated yet (wait 5-15 min, then hard refresh)
- CloudFront still deploying (wait for status "Deployed")
- Check browser dev tools: hard refresh, disable cache, incognito window

### Mixed content warnings
- Ensure all assets in your app use HTTPS or relative URLs
- Check `_expo` manifest files

### CloudFront returning 403
- Invalidate caches (Step 9)
- Ensure S3 bucket policy allows CloudFront access

## Quick Reference: One-Shot Verification

```zsh
# After domain is set up, verify everything
echo "=== CloudFront Status ==="
aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text

echo "=== DNS Resolution ==="
nslookup crewconnectname.com | grep -A2 "Non-authoritative"

echo "=== HTTPS Check ==="
curl -I https://crewconnectname.com/ 2>&1 | head -3

echo "=== Certificate ==="
echo | openssl s_client -servername crewconnectname.com -connect crewconnectname.com:443 2>/dev/null | grep "Issuer\|Subject"
```

## Rollback

If you need to revert to CloudFront domain:

```zsh
aws cloudfront get-distribution-config --id "$CF_DISTRIBUTION_ID" --output json > /tmp/cf-rollback.json

# Edit jq to remove Aliases and revert ViewerCertificate to default
jq '.DistributionConfig.Aliases = {"Quantity":0,"Items":[]} | .DistributionConfig.ViewerCertificate = {"CloudFrontDefaultCertificate":true}' /tmp/cf-rollback.json > /tmp/cf-rollback-updated.json

ETAG=$(jq -r '.ETag' /tmp/cf-rollback.json)
aws cloudfront update-distribution --id "$CF_DISTRIBUTION_ID" --if-match "$ETAG" --distribution-config file:///tmp/cf-rollback-updated.json
```

---

**Setup Time:** ~30 minutes (mostly waiting for DNS/certificate validation)
