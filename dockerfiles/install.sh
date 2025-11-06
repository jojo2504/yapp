#!/usr/bin/env sh
DIR="$(dirname "$(realpath "$0")")"

for file in $DIR/*.dockerfile; do
  # dir=$(dirname "$file")
  IFS='/' read -ra ADDR <<< "$file"
  ADDR=${ADDR[-1]}
  IFS='.' read -ra ADDR <<< "$ADDR"
  ADDR=${ADDR[0]}
  
  echo "building $ADDR dockerfile"
  docker build -f "$file" -t "$ADDR-sandbox" .
done