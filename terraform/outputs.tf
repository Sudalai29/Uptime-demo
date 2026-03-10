output "frontend_url" {
  description = "CloudFront URL for the React frontend"
  value       = "https://${var.domain_name}"
}

output "api_url" {
  description = "API endpoint URL"
  value       = "https://api.${var.domain_name}"
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "https://grafana.${var.domain_name}"
}

output "ecr_api_repo_url" {
  description = "ECR URL for the API image — used in CI/CD docker push"
  value       = module.ecr.api_repo_url
}

output "ecr_grafana_repo_url" {
  description = "ECR URL for the Grafana image — used in CI/CD docker push"
  value       = module.ecr.grafana_repo_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name — used in CI/CD deploy commands"
  value       = module.ecs.cluster_name
}

output "ecs_service_name" {
  description = "ECS service name — used in CI/CD force-new-deployment"
  value       = module.ecs.service_name
}

output "s3_bucket_name" {
  description = "S3 bucket for React frontend — used in CI/CD s3 sync"
  value       = module.s3_cloudfront.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used in CI/CD cache invalidation"
  value       = module.s3_cloudfront.distribution_id
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = module.route53_acm.hosted_zone_id
}

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = module.sns.topic_arn
}

output "nameservers" {
  description = "Route 53 nameservers — update these at your domain registrar"
  value       = module.route53_acm.nameservers
}
