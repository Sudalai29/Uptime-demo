output "api_repo_url"     { value = aws_ecr_repository.api.repository_url }
output "grafana_repo_url" { value = aws_ecr_repository.grafana.repository_url }
output "api_repo_name"    { value = aws_ecr_repository.api.name }
output "grafana_repo_name" { value = aws_ecr_repository.grafana.name }
