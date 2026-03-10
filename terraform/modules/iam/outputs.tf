output "task_role_arn"        { value = aws_iam_role.task.arn }
output "execution_role_arn"   { value = aws_iam_role.execution.arn }
output "eventbridge_role_arn" { value = aws_iam_role.eventbridge.arn }
output "dns_updater_role_arn" { value = aws_iam_role.dns_updater.arn }
