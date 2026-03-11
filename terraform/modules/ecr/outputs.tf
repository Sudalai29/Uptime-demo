output "api_repo_url"     { value = aws_ecr_repository.api.repository_url }
output "grafana_repo_url" { value = aws_ecr_repository.grafana.repository_url }
output "api_repo_name"    { value = aws_ecr_repository.api.name }
output "grafana_repo_name" { value = aws_ecr_repository.grafana.name }
output "nginx_repo_url"  { value = aws_ecr_repository.nginx.repository_url }
output "nginx_repo_name" { value = aws_ecr_repository.nginx.name }
