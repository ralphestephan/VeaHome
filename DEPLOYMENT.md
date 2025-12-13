# VeaHome AWS Deployment Guide

## Prerequisites

1. **AWS Account** with the following services enabled:
   - ECR (Elastic Container Registry)
   - ECS (Elastic Container Service) with Fargate
   - RDS (PostgreSQL) or use the Docker Compose PostgreSQL
   - Secrets Manager
   - CloudWatch Logs

2. **Expo Account** for mobile app builds (https://expo.dev)

3. **GitHub Secrets** configured in your repository

## Step 1: AWS Infrastructure Setup

### 1.1 Create ECR Repository

```bash
aws ecr create-repository --repository-name veahome-backend --region us-east-1
```

### 1.2 Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name veahome-cluster --region us-east-1
```

### 1.3 Create RDS PostgreSQL Database

```bash
aws rds create-db-instance \
  --db-instance-identifier veahome-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15 \
  --master-username veahome \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --region us-east-1
```

### 1.4 Create Secrets in AWS Secrets Manager

```bash
# Database URL
aws secretsmanager create-secret \
  --name veahome/database-url \
  --secret-string "postgresql://veahome:PASSWORD@your-rds-endpoint:5432/veahome"

# JWT Secret
aws secretsmanager create-secret \
  --name veahome/jwt-secret \
  --secret-string "your-super-secure-jwt-secret"
```

### 1.5 Create IAM Roles

Create `ecsTaskExecutionRole` with these policies:
- `AmazonECSTaskExecutionRolePolicy`
- `SecretsManagerReadWrite` (for accessing secrets)

Create `ecsTaskRole` with these policies:
- `AWSIoTDataAccess` (for IoT communication)
- Custom policy for other AWS services as needed

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description |
|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `EXPO_TOKEN` | Your Expo access token |

## Step 3: Update Task Definition

Edit `.aws/task-definition.json` and replace:
- `YOUR_ACCOUNT_ID` with your AWS account ID
- Update the secrets ARNs with your actual secret ARNs

## Step 4: Create ECS Service

```bash
aws ecs create-service \
  --cluster veahome-cluster \
  --service-name veahome-backend-service \
  --task-definition veahome-backend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Step 5: Deploy

Push to the `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "Add AWS deployment configuration"
git push origin main
```

## Alternative: Deploy with Docker Compose on EC2

### 1. Launch EC2 Instance

- AMI: Amazon Linux 2023
- Instance type: t3.small (or larger)
- Security group: Allow ports 22 (SSH), 80, 443, 3000

### 2. Connect and Setup

```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone your repository
git clone https://github.com/ralphestephan/VeaHome.git
cd VeaHome

# Create .env file
cp .env.example .env
nano .env  # Edit with your values

# Start services
docker-compose up -d
```

### 3. Setup Nginx Reverse Proxy (optional)

```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure nginx
sudo nano /etc/nginx/conf.d/veahome.conf
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo systemctl reload nginx
```

## Mobile App Configuration

Update the API endpoint in your app:

Edit `src/services/api.ts` and update the base URL:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api' 
  : 'https://your-api-domain.com/api';
```

## Monitoring

- View logs: AWS CloudWatch → Log groups → `/ecs/veahome-backend`
- View metrics: AWS CloudWatch → Metrics → ECS

## Troubleshooting

### Container won't start
```bash
aws logs get-log-events --log-group-name /ecs/veahome-backend --log-stream-name ecs/veahome-backend/TASK_ID
```

### Database connection issues
- Check security group allows traffic from ECS to RDS
- Verify DATABASE_URL secret is correct
- Check RDS is publicly accessible or in same VPC

### Health check failing
- Ensure `/health` endpoint exists in your backend
- Check container logs for startup errors
