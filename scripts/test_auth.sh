#!/usr/bin/env bash
# =============================================================================
# scripts/test_auth.sh — Quick smoke-test for the YAPP auth endpoints.
# Usage: bash scripts/test_auth.sh
# =============================================================================

set -euo pipefail

BASE_URL="http://localhost:8080/api/auth"

echo ""
echo "============================================================"
echo "  STEP 1 — Register"
echo "============================================================"
curl -s -X POST "$BASE_URL/register" \
     -H "Content-Type: application/json" \
     -d '{
           "name":            "Test Student",
           "email":           "student@test.edu",
           "password":        "Test1234!",
           "organisation_id": 1
         }' | tee /tmp/yapp_register.json
echo ""

echo ""
echo "============================================================"
echo "  STEP 2 — Login"
echo "============================================================"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
     -H "Content-Type: application/json" \
     -d '{
           "email":    "student@test.edu",
           "password": "Test1234!"
         }')

echo "$LOGIN_RESPONSE"
echo ""

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "------------------------------------------------------------"
if [ -n "$ACCESS_TOKEN" ]; then
  echo "  JWT access_token:"
  echo "  $ACCESS_TOKEN"
else
  echo "  Could not extract access_token — check the response above."
fi
echo "------------------------------------------------------------"
echo ""
