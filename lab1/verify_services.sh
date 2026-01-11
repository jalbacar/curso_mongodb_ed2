#!/bin/bash
# verify_services.sh
# Verifica que los contenedores mongo1, mongo2 y mongo3 estén corriendo y saludables.

echo "🔍 Comprobando estado de los servicios Docker..."

NODES=("mongo1" "mongo2" "mongo3")

for node in "${NODES[@]}"
do
    STATUS=$(docker inspect -f '{{.State.Health.Status}}' $node 2>/dev/null)
    if [ "$STATUS" == "healthy" ]; then
        echo "✅ $node: SALUDABLE"
    else
        echo "❌ $node: NO DISPONIBLE (Estado: $STATUS)"
    fi
done

echo "------------------------------------------------"
docker-compose ps
