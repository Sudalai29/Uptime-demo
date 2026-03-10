output "cluster_arn"    { value = aws_ecs_cluster.main.arn }
output "cluster_name"   { value = aws_ecs_cluster.main.name }
output "service_name"   { value = aws_ecs_service.app.name }
output "log_group_arn"  { value = aws_cloudwatch_log_group.ecs.arn }
output "log_group_name" { value = aws_cloudwatch_log_group.ecs.name }
