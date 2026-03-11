# ACM certificates for CloudFront must be issued in us-east-1
# regardless of the primary deployment region.
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}
