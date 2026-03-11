variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Your root domain (e.g. uptimemonitor.com). Subdomains api. and grafana. are created automatically."
  type        = string
  default = "infradataapp.in"
}

variable "alert_email" {
  description = "Email address to receive SNS down/recovery alerts"
  type        = string
  default = "sudalaik52@gmail.com"
}

variable "image_tag" {
  description = "Docker image tag to deploy. Set to 'latest' for initial apply; CI/CD overrides with git SHA."
  type        = string
  default     = "latest"
}

# ── Networking ─────────────────────────────────────────────
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_a_cidr" {
  type    = string
  default = "10.0.1.0/24"
}

variable "public_subnet_b_cidr" {
  type    = string
  default = "10.0.2.0/24"
}

# ── DynamoDB ───────────────────────────────────────────────
variable "monitors_table" {
  type    = string
  default = "uptime-monitors"
}

variable "checks_table" {
  type    = string
  default = "uptime-checks"
}

# ── ECS schedule ───────────────────────────────────────────
variable "ecs_start_hour" {
  description = "UTC hour to start ECS service (default 8am UTC)"
  type        = number
  default     = 8
}

variable "ecs_stop_hour" {
  description = "UTC hour to stop ECS service (default 8pm UTC)"
  type        = number
  default     = 20
}
