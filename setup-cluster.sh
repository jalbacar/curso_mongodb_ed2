#!/bin/bash
# Crear red para el cluster
docker network create mongo-cluster

# Levantar 3 contenedores de Mongo
docker run -d --name mongo1 --net mongo-cluster -p 27017:27017 mongo:6.0 mongod --replSet rs0 --bind_ip_all
docker run -d --name mongo2 --net mongo-cluster -p 27018:27017 mongo:6.0 mongod --replSet rs0 --bind_ip_all
docker run -d --name mongo3 --net mongo-cluster -p 27019:27017 mongo:6.0 mongod --replSet rs0 --bind_ip_all

# Esperar unos segundos e iniciar el Replica Set
sleep 5
docker exec mongo1 mongosh --eval 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "mongo1:27017"}, {_id: 1, host: "mongo2:27017"}, {_id: 2, host: "mongo3:27017"}]})'