terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Remote state — S3 bucket must exist before first apply.
  # Create it manually once:
  #   aws s3 mb s3://uptime-monitor-tfstate-<your-account-id> --region us-east-1
  #   aws s3api put-bucket-versioning \
  #     --bucket uptime-monitor-tfstate-<your-account-id> \
  #     --versioning-configuration Status=Enabled
  backend "s3" {
    bucket = "uptime-monitor-smd29"   # override via -backend-config in CI/CD
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "uptime-monitor"
      Environment = terraform.workspace
      ManagedBy   = "terraform"
    }
  }
}

# ACM certificates used by CloudFront must always be in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "uptime-monitor"
      Environment = terraform.workspace
      ManagedBy   = "terraform"
    }
  }
}

locals {
  env    = terraform.workspace                  # "prod" or "dev"
  prefix = "uptime-monitor-${terraform.workspace}"  # "uptime-monitor-prod"
}

# ── Modules ────────────────────────────────────────────────

module "networking" {
  source = "./modules/networking"
  prefix = local.prefix
  vpc_cidr             = var.vpc_cidr
  public_subnet_a_cidr = var.public_subnet_a_cidr
  public_subnet_b_cidr = var.public_subnet_b_cidr
  aws_region           = var.aws_region
}

module "dynamodb" {
  source          = "./modules/dynamodb"
  prefix          = local.prefix
  monitors_table  = var.monitors_table
  checks_table    = var.checks_table
}

module "ecr" {
  source = "./modules/ecr"
  prefix = local.prefix
}

module "sns" {
  source      = "./modules/sns"
  prefix      = local.prefix
  alert_email = var.alert_email
}

module "iam" {
  source              = "./modules/iam"
  prefix              = local.prefix
  aws_region          = var.aws_region
  aws_account_id      = data.aws_caller_identity.current.account_id
  monitors_table_arn  = module.dynamodb.monitors_table_arn
  checks_table_arn    = module.dynamodb.checks_table_arn
  sns_topic_arn       = module.sns.topic_arn
  log_group_arn       = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/${local.prefix}"
}


module "ecs" {
  source               = "./modules/ecs"
  prefix               = local.prefix
  aws_region           = var.aws_region
  vpc_id               = module.networking.vpc_id
  public_subnet_a_id       = module.networking.public_subnet_a_id
  ecs_security_group_id    = module.networking.ecs_security_group_id
  ecr_api_url          = module.ecr.api_repo_url
  ecr_grafana_url      = module.ecr.grafana_repo_url
  ecr_nginx_url        = module.ecr.nginx_repo_url
  task_role_arn        = module.iam.task_role_arn
  execution_role_arn   = module.iam.execution_role_arn
  monitors_table       = var.monitors_table
  checks_table         = var.checks_table
  sns_topic_arn        = module.sns.topic_arn
  allowed_origins      = "https://${var.domain_name}"
  image_tag            = var.image_tag
}

module "eventbridge" {
  source       = "./modules/eventbridge"
  prefix       = local.prefix
  cluster_arn  = module.ecs.cluster_arn
  service_name = module.ecs.service_name
  start_hour   = var.ecs_start_hour
  stop_hour    = var.ecs_stop_hour
  eventbridge_role_arn = module.iam.eventbridge_role_arn
}

module "dns_updater" {
  source           = "./modules/dns_updater"
  prefix           = local.prefix
  aws_region       = var.aws_region
  aws_account_id   = data.aws_caller_identity.current.account_id
  cluster_name     = module.ecs.cluster_name
  hosted_zone_id   = module.route53_acm.hosted_zone_id
  api_domain       = "api.${var.domain_name}"
  grafana_domain       = "grafana.${var.domain_name}"
  dns_updater_role_arn = module.iam.dns_updater_role_arn
}

module "s3_cloudfront" {
  source              = "./modules/s3_cloudfront"
  prefix              = local.prefix
  domain_name         = var.domain_name
  acm_certificate_arn = module.route53_acm.certificate_arn
}

module "route53_acm" {
  source      = "./modules/route53_acm"
  providers   = { aws.us_east_1 = aws.us_east_1 }
  prefix      = local.prefix
  domain_name = var.domain_name
  aws_region  = var.aws_region
  cloudfront_domain = module.s3_cloudfront.cloudfront_domain
}

# ── Data sources ───────────────────────────────────────────
data "aws_caller_identity" "current" {}
