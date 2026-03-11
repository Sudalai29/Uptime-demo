resource "aws_ecs_cluster" "main" {
  name = var.prefix

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = var.prefix }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.prefix}"
  retention_in_days = 7   # cost saving — 7 days is plenty for a portfolio
  tags              = { Name = "/ecs/${var.prefix}" }
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"    # 0.5 vCPU — enough for api + grafana
  memory                   = "1024"   # 1 GB
  task_role_arn            = var.task_role_arn
  execution_role_arn       = var.execution_role_arn

  container_definitions = jsonencode([

    # ── FastAPI container ──────────────────────────────────
    {
      name      = "api"
      image     = "${var.ecr_api_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = 8000
        protocol      = "tcp"
      }]

      environment = [
        { name = "LOCAL_MODE",              value = "false" },
        { name = "AWS_REGION",              value = var.aws_region },
        { name = "MONITORS_TABLE",          value = var.monitors_table },
        { name = "CHECKS_TABLE",            value = var.checks_table },
        { name = "SNS_TOPIC_ARN",           value = var.sns_topic_arn },
        { name = "ALLOWED_ORIGINS",         value = var.allowed_origins },
        { name = "CHECK_INTERVAL_MINUTES",  value = "5" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.prefix}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    },

    # ── Grafana container ──────────────────────────────────
    {
      name      = "grafana"
      image     = "${var.ecr_grafana_url}:${var.image_tag}"
      essential = false   # app still runs if Grafana crashes

      portMappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]

      environment = [
        { name = "GF_SECURITY_ADMIN_USER",         value = "admin" },
        { name = "GF_SECURITY_ADMIN_PASSWORD",      value = "arn:aws:secretsmanager:us-east-1:732073082694:secret:uptime-monitor-prod/grafana-admin-password-xutFbp" },
        { name = "GF_AUTH_ANONYMOUS_ENABLED",       value = "true" },
        { name = "GF_AUTH_ANONYMOUS_ORG_ROLE",      value = "Viewer" },
        { name = "GF_USERS_VIEWERS_CAN_EDIT",       value = "false" },
        { name = "GF_USERS_ALLOW_SIGN_UP",          value = "false" },
        { name = "GF_AUTH_DISABLE_LOGIN_FORM",      value = "false" },
        { name = "GF_SECURITY_DISABLE_GRAVATAR",    value = "true" },
        { name = "GF_AWS_DEFAULT_REGION",           value = var.aws_region },
        { name = "GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH", value = "/var/lib/grafana/dashboards/uptime-monitor.json" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.prefix}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "grafana"
        }
      }
    },

    # ── nginx sidecar — SSL termination ───────────────────
    {
      name      = "nginx"
      image     = "${var.ecr_nginx_url}:${var.image_tag}"
      essential = true

      portMappings = [
        { containerPort = 443, protocol = "tcp" },
        { containerPort = 80,  protocol = "tcp" }
      ]

      environment = [
        { name = "AWS_REGION",     value = var.aws_region },
        { name = "SECRET_PREFIX",  value = var.prefix },
      ]

      dependsOn = [
        { containerName = "api",     condition = "HEALTHY" },
        { containerName = "grafana", condition = "START" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.prefix}"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nginx"
        }
      }
    }
  ])

  tags = { Name = var.prefix }
}

resource "aws_ecs_service" "app" {
  name            = var.prefix
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Allow EventBridge to scale desired_count to 0 (stop) without Terraform fighting it
  lifecycle {
    ignore_changes = [desired_count]
  }

  network_configuration {
    subnets          = [var.public_subnet_a_id]
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }

  tags = { Name = var.prefix }
}
