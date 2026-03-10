# ── Stop ECS at night ─────────────────────────────────────
resource "aws_scheduler_schedule" "stop" {
  name       = "${var.prefix}-stop"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  # Runs every day at var.stop_hour UTC
  schedule_expression          = "cron(0 ${var.stop_hour} * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ecs:updateService"
    role_arn = var.eventbridge_role_arn

    input = jsonencode({
      Cluster      = var.cluster_arn
      Service      = var.service_name
      DesiredCount = 0
    })
  }
}

# ── Start ECS in the morning ───────────────────────────────
resource "aws_scheduler_schedule" "start" {
  name       = "${var.prefix}-start"
  group_name = "default"

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression          = "cron(0 ${var.start_hour} * * ? *)"
  schedule_expression_timezone = "UTC"

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:ecs:updateService"
    role_arn = var.eventbridge_role_arn

    input = jsonencode({
      Cluster      = var.cluster_arn
      Service      = var.service_name
      DesiredCount = 1
    })
  }
}
