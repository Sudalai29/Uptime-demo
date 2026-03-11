FROM nginx:1.25-alpine

# Install AWS CLI for cert fetching at startup
RUN apk add --no-cache aws-cli

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy and set entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Open 80 and 443
EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
