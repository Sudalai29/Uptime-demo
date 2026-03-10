output "monitors_table_arn" { value = aws_dynamodb_table.monitors.arn }
output "checks_table_arn"   { value = aws_dynamodb_table.checks.arn }
output "monitors_table_name" { value = aws_dynamodb_table.monitors.name }
output "checks_table_name"   { value = aws_dynamodb_table.checks.name }
