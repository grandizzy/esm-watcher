#!/usr/bin/env bash

aws dynamodb --region us-west-2 create-table --cli-input-json file://create_table.json --endpoint-url http://localhost:8000