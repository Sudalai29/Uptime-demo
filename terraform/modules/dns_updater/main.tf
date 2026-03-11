# Zip the Lambda function code
data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/lambda_function.py"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "dns_updater" {
  function_name    = "${var.prefix}-dns-updater"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  handler          = "lambda_function.handler"
  runtime          = "python3.11"
  role             = var.dns_updater_role_arn
  timeout          = 60   # enough for 6 retries × 5s

  environment {
    variables = {
      CLUSTER_NAME   = var.cluster_name
      HOSTED_ZONE_ID = var.hosted_zone_id
      API_DOMAIN     = var.api_domain
      GRAFANA_DOMAIN = var.grafana_domain
    }
  }

  tags = { Name = "${var.prefix}-dns-updater" }
}

# ── CloudWatch log group for Lambda ───────────────────────
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.prefix}-dns-updater"
  retention_in_days = 7
}

# ── EventBridge rule — fires on ECS task state change ─────
resource "aws_cloudwatch_event_rule" "ecs_task_running" {
  name        = "${var.prefix}-task-running"
  description = "Fires when an ECS task in the cluster reaches RUNNING state"

  event_pattern = jsonencode({
    source      = ["aws.ecs"]
    "detail-type" = ["ECS Task State Change"]
    detail = {
      clusterArn = [{ prefix = "arn:aws:ecs:${var.aws_region}:${var.aws_account_id}:cluster/${var.cluster_name}" }]
      lastStatus = ["RUNNING"]
    }
  })
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.ecs_task_running.name
  target_id = "dns-updater-lambda"
  arn       = aws_lambda_function.dns_updater.arn
}

# Allow EventBridge to invoke the Lambda
resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dns_updater.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ecs_task_running.arn
}
