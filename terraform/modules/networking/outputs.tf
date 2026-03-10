output "vpc_id"             { value = aws_vpc.main.id }
output "public_subnet_a_id" { value = aws_subnet.public_a.id }
output "public_subnet_b_id" { value = aws_subnet.public_b.id }
output "ecs_security_group_id" { value = aws_security_group.ecs.id }
