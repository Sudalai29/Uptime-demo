resource "aws_dynamodb_table" "monitors" {
  name         = var.monitors_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = { Name = var.monitors_table }
}

resource "aws_dynamodb_table" "checks" {
  name         = var.checks_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "monitor_id"
  range_key    = "checked_at"

  attribute {
    name = "monitor_id"
    type = "S"
  }

  attribute {
    name = "checked_at"
    type = "S"
  }

  # Auto-expire old checks after 90 days to keep costs near zero
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = { Name = var.checks_table }
}
