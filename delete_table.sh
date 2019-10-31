#!/usr/bin/env bash

aws dynamodb --region us-west-2 delete-table --table-name EsmSum --endpoint-url http://localhost:8000