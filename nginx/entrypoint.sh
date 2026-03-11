#!/bin/sh
# entrypoint.sh — fetches ACM private cert at container startup
# and writes cert/key to /etc/nginx/certs/ before starting nginx.
#
# Requires:
#   ACM_CERT_ARN   — ARN of the ACM certificate
#   AWS_REGION     — AWS region
#
# The ECS task IAM role must have acm:ExportCertificate permission.
# Note: ExportCertificate only works on private CAs.
#
# For public ACM certs (which is what we have), we use AWS Certificate
# Manager Private CA or store the cert in Secrets Manager instead.
# Since our cert is public ACM, we store the cert+key in Secrets Manager
# and fetch them here.

set -e

CERT_DIR="/etc/nginx/certs"
mkdir -p "$CERT_DIR"

echo "Fetching SSL certificate from Secrets Manager..."

# Fetch cert and key from Secrets Manager
# These are stored as separate secrets during initial setup:
#   uptime-monitor-prod/ssl-cert  — full certificate chain (PEM)
#   uptime-monitor-prod/ssl-key   — private key (PEM)

aws secretsmanager get-secret-value \
    --secret-id "${SECRET_PREFIX}/ssl-cert" \
    --region "$AWS_REGION" \
    --query "SecretString" \
    --output text > "$CERT_DIR/cert.pem"

aws secretsmanager get-secret-value \
    --secret-id "${SECRET_PREFIX}/ssl-key" \
    --region "$AWS_REGION" \
    --query "SecretString" \
    --output text > "$CERT_DIR/key.pem"

chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo "SSL certificates loaded — starting nginx..."
exec nginx -g "daemon off;"
