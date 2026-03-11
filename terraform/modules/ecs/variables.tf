variable "prefix"                  { type = string }
variable "aws_region"              { type = string }
variable "vpc_id"                  { type = string }
variable "public_subnet_a_id"      { type = string }
variable "ecs_security_group_id"   { type = string }
variable "ecr_api_url"             { type = string }
variable "ecr_grafana_url"         { type = string }
variable "task_role_arn"           { type = string }
variable "execution_role_arn"      { type = string }
variable "monitors_table"          { type = string }
variable "checks_table"            { type = string }
variable "sns_topic_arn"           { type = string }
variable "allowed_origins"         { type = string }
variable "image_tag" {
  type    = string
  default = "latest"
}
variable "ecr_nginx_url" { type = string }
