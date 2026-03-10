FROM grafana/grafana:10.2.3

# Bake in datasource provisioning, dashboard provisioning, and dashboard JSON
# so the ECR image is fully self-contained — no volume mounts needed in ECS.
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/   /var/lib/grafana/dashboards/
