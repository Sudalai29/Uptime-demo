# ── Hosted Zone ───────────────────────────────────────────
resource "aws_route53_zone" "main" {
  name = var.domain_name
  tags = { Name = var.domain_name }
}

# ── ACM Certificate ────────────────────────────────────────
# Must be in us-east-1 for CloudFront — provider alias handles this.
resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}",   # covers api. and grafana. subdomains
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = var.domain_name }
}

# ── DNS validation records for ACM ────────────────────────
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ── Frontend A record → CloudFront ────────────────────────
resource "aws_route53_record" "frontend" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain
    zone_id                = "Z2FDTNDATAQYW2"   # CloudFront hosted zone ID (always this value)
    evaluate_target_health = false
  }
}

# ── API + Grafana A records ────────────────────────────────
# Placeholder IPs — updated automatically by the dns_updater Lambda
# every time the ECS task starts.
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"
  ttl     = 60
  records = ["1.2.3.4"]   # placeholder — Lambda updates this on task start

  lifecycle {
    ignore_changes = [records]   # prevent Terraform from reverting Lambda's updates
  }
}

resource "aws_route53_record" "grafana" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "grafana.${var.domain_name}"
  type    = "A"
  ttl     = 60
  records = ["1.2.3.4"]   # placeholder — Lambda updates this on task start

  lifecycle {
    ignore_changes = [records]
  }
}
