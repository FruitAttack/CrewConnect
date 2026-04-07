# CrewConnect Backend Manual Deploy

This runbook covers the manual path for building the backend image, pushing it to Amazon ECR, and rolling the new image into ECS.

Important: ECS should be updated to a new task definition revision that references the newly pushed image digest. Do not rely on a reused mutable tag like `latest` by itself; always resolve the digest for the image you just pushed and register a fresh task definition revision with that digest.

Main fix from April 7, 2026:

- Set `CONTAINER_NAME=Main` to match the actual ECS task definition container name.
- Resolve the pushed ECR digest and register ECS with the digest-pinned image URI, not just `latest`.
- Verify the new task definition image matches `IMAGE_URI_DIGEST` before calling `update-service`.
- Build the image for `linux/amd64` before pushing it, because the ECS Fargate task is `Linux/X86_64`.

## Assumptions

- AWS account: `613426352709`
- Region: `us-east-2`
- ECR repository: `crewconnect/backend`
- ECS cluster: `default`
- ECS service: `backend-5676`
- Container port: `3001`
- ECS container name: `Main`

If any of those differ in your environment, update the commands before running them.

## 1. Set shell variables

Run these once per terminal session:

```zsh
export AWS_PAGER=""
export AWS_REGION=us-east-2
export AWS_ACCOUNT_ID=613426352709
export ECR_REPOSITORY=crewconnect/backend
export IMAGE_TAG=latest
export ECS_CLUSTER=default
export ECS_SERVICE=backend-5676
export CONTAINER_NAME=Main
export CONTAINER_PORT=3001
export ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
export IMAGE_URI="$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
```

## 2. Build the image locally

From the backend directory:

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/backend
docker buildx build --platform linux/amd64 -t crewconnect-backend --load .
```

If you want to test the container locally first:

```zsh
docker run --rm --env-file .env -p 3001:3001 --name crewconnect-backend crewconnect-backend
```

If your Docker Desktop builder does not support `buildx --load`, create or switch to a builder first and then rerun the build:

```zsh
docker buildx create --use --name crewconnect-amd64-builder
docker buildx build --platform linux/amd64 -t crewconnect-backend --load .
```

## 3. Authenticate Docker to ECR

```zsh
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"
```

## 4. Tag and push the image

Tag the image for ECR and push it:

```zsh
docker tag crewconnect-backend "$IMAGE_URI"
docker push "$IMAGE_URI"
```

If you prefer a release tag instead of `latest`, set `IMAGE_TAG` before tagging and pushing.

If you built on Apple Silicon or any other non-x86 machine, keep the `linux/amd64` platform flag in the build step. Otherwise the image manifest may not contain an amd64 descriptor, and ECS Fargate will fail with `CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'`.

After the push completes, resolve the digest for the exact image you just published and use that immutable URI for ECS:

```zsh
IMAGE_DIGEST=$(aws ecr describe-images \
  --region "$AWS_REGION" \
  --repository-name "$ECR_REPOSITORY" \
  --image-ids imageTag="$IMAGE_TAG" \
  --query 'imageDetails[0].imageDigest' \
  --output text)

export IMAGE_URI_DIGEST="$ECR_REGISTRY/$ECR_REPOSITORY@$IMAGE_DIGEST"

echo "$IMAGE_URI_DIGEST"
```

Use `IMAGE_URI_DIGEST` in the ECS task definition registration step below so the service always points at the new image you just built. It must be exported because the `jq` command reads it from the environment.

## 5. Update ECS to use the new image

ECS deployments are driven by the task definition. The clean manual path is:

1. Pull the current task definition.
2. Replace the container image with the new ECR image URI.
3. Register the new revision.
4. Update the service to use the new revision.

### 5.1 Get the current task definition ARN

```zsh
CURRENT_TD_ARN=$(aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --query "services[0].deployments[?status=='PRIMARY'].taskDefinition | [0]" \
  --output text)

echo "$CURRENT_TD_ARN"
```

### 5.2 Export the task definition JSON

```zsh
aws ecs describe-task-definition \
  --region "$AWS_REGION" \
  --task-definition "$CURRENT_TD_ARN" \
  --query taskDefinition > /tmp/crewconnect-taskdef.json
```

### 5.3 Create a new task definition revision with the updated image

This command removes AWS-managed fields that are not accepted when registering a new revision, then swaps in the new image digest you just resolved.

```zsh
jq \
  'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy,.deregisteredAt)
  | .containerDefinitions = (.containerDefinitions | map(if .name == env.CONTAINER_NAME then .image = env.IMAGE_URI_DIGEST else . end))' \
  /tmp/crewconnect-taskdef.json > /tmp/crewconnect-taskdef-new.json

NEW_TD_ARN=$(aws ecs register-task-definition \
  --region "$AWS_REGION" \
  --cli-input-json file:///tmp/crewconnect-taskdef-new.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "$NEW_TD_ARN"
```

Set `CONTAINER_NAME` to the exact container name from the ECS task definition before running that command. For the current backend service, the container name is `Main`.

### 5.4 Update the service to the new revision

Update the service with the new task definition ARN:

```zsh
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$NEW_TD_ARN" \
  --force-new-deployment
```

If you already know the new task definition ARN from the register response, use that directly instead of re-querying.

If the service still shows the old revision after `update-service`, verify that the registered task definition image is the digest-pinned URI, not a mutable tag:

```zsh
aws ecs describe-task-definition \
  --region "$AWS_REGION" \
  --task-definition "$NEW_TD_ARN" \
  --query "taskDefinition.containerDefinitions[].image" \
  --output text
```

That output should match `IMAGE_URI_DIGEST`.

## 6. Verify the rollout

Watch the service until it stabilizes:

```zsh
aws ecs wait services-stable \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE"
```

Check the currently running task definition and image:

```zsh
aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --query "services[0].deployments[?status=='PRIMARY'].[taskDefinition,runningCount,pendingCount]" \
  --output table

aws ecs describe-task-definition \
  --region "$AWS_REGION" \
  --task-definition "$NEW_TD_ARN" \
  --query "taskDefinition.containerDefinitions[].image" \
  --output text
```

Then confirm the API responds through your public endpoint or load balancer.

## 7. Smoke test the reports routes

After the container is running, verify that the reports router is present. These requests should return something other than `404` if the image includes the routes:

```zsh
curl -i http://localhost:3001/api/reports
curl -i http://localhost:3001/api/reports/equipment-utilization
curl -i "http://localhost:3001/api/reports/dashboard?company_id=test"
```

Expected results:

- `401` or `403` means the route exists and auth blocked the request.
- `400` means the route exists and the controller rejected missing parameters.
- `404` means the route is missing or the app did not load the reports router.
- `200` means the route exists and accepted the request.

## 8. Rollback

If the new deployment is unhealthy, point the service back to the previous task definition ARN:

```zsh
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$CURRENT_TD_ARN" \
  --force-new-deployment
```

## 9. Short version

For routine deployments, the minimal sequence is:

```zsh
cd /Users/joelmoffatt/VSCode/crewconnect/backend
docker build -t crewconnect-backend .
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 613426352709.dkr.ecr.us-east-2.amazonaws.com
docker tag crewconnect-backend 613426352709.dkr.ecr.us-east-2.amazonaws.com/crewconnect/backend:latest
docker push 613426352709.dkr.ecr.us-east-2.amazonaws.com/crewconnect/backend:latest
```

Then resolve the pushed digest, update the ECS task definition image to that digest-pinned URI, and force a new deployment.