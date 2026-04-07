# Temp Reset Commands (One-Line, zsh)

Use these one at a time in order.

## 0) Set constants

```zsh
export AWS_PAGER=""
export AWS_REGION=us-east-1
export BUCKET_NAME=crewconnect-web-frontend
export CF_DISTRIBUTION_ID=E1EKZ24F5IF7KO
```

## 1) Capture OAC ID (if any)

```zsh
OAC_ID=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.DistributionConfig.Origins.Items[0].OriginAccessControlId' --output text); echo "OAC_ID=$OAC_ID"
```

## 2) Disable distribution (required before delete)

```zsh
aws cloudfront get-distribution-config --id "$CF_DISTRIBUTION_ID" --output json > /tmp/cf-delete-fresh.json
ETAG=$(jq -r '.ETag' /tmp/cf-delete-fresh.json); jq '.DistributionConfig.Enabled = false' /tmp/cf-delete-fresh.json > /tmp/cf-delete-disabled-full.json; jq '.DistributionConfig' /tmp/cf-delete-disabled-full.json > /tmp/cf-delete-disabled-config.json; aws cloudfront update-distribution --id "$CF_DISTRIBUTION_ID" --if-match "$ETAG" --distribution-config file:///tmp/cf-delete-disabled-config.json
```

## 3) Wait until distribution is deployed

```zsh
while true; do STATUS=$(aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" --query 'Distribution.Status' --output text); echo "CloudFront status: $STATUS"; [[ "$STATUS" == "Deployed" ]] && break; sleep 30; done
```

## 4) Delete distribution

```zsh
DEL_ETAG=$(aws cloudfront get-distribution-config --id "$CF_DISTRIBUTION_ID" --query 'ETag' --output text); aws cloudfront delete-distribution --id "$CF_DISTRIBUTION_ID" --if-match "$DEL_ETAG"
```

## 5) Delete S3 bucket contents and bucket

```zsh
aws s3 rm "s3://$BUCKET_NAME" --recursive; aws s3api delete-bucket-policy --bucket "$BUCKET_NAME" 2>/dev/null || true; aws s3api delete-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
```

## 6) Delete OAC (optional cleanup)

```zsh
if [[ -n "$OAC_ID" && "$OAC_ID" != "None" ]]; then OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" --query 'ETag' --output text); aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG"; fi
```

## 7) Verify deletion

```zsh
aws s3api head-bucket --bucket "$BUCKET_NAME"
aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID"
```
