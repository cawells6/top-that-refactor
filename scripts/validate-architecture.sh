#!/bin/bash

# Architecture Validation Script
# Run this before commits to catch architecture violations

echo "🏗️  Architecture Validation"
echo "========================="

# 1. Check for layer boundary violations
echo "Checking layer boundaries..."
if grep -r "socket\.emit" src/client/ui/ --include="*.ts"; then
  echo "❌ UI layer is directly accessing Transport layer"
  echo "   UI should call Application layer instead"
  exit 1
fi

# 2. Check for contract mismatches
echo "Checking validation contracts..."
client_validation=$(grep -o "numHumans.*numCPUs.*<.*2" src/client/ --include="*.ts" | wc -l)
server_validation=$(grep -o "numHumans.*numCPUs.*<.*2" src/server/ --include="*.ts" | wc -l)

if [ "$client_validation" != "$server_validation" ]; then
  echo "❌ Client and server validation rules don't match"
  echo "   Check validation.ts and serverValidation.ts"
  exit 1
fi

# 3. Check test mocking consistency
echo "Checking test mocking..."
for test_file in tests/*.test.ts; do
  # If test mocks socket but code uses acknowledgmentUtils, flag it
  if grep -q "mock.*socket\.emit" "$test_file" && grep -q "emitJoinGame" "${test_file/.test.ts/.ts}"; then
    echo "❌ Test mocking wrong layer in $test_file"
    echo "   Code uses acknowledgmentUtils but test mocks socket"
    exit 1
  fi
done

# 4. Check for missing DOM elements in tests
echo "Checking test DOM setup..."
for test_file in tests/*.test.ts; do
  if grep -q "getElementById.*error-container" "${test_file/.test.ts/.ts}" && ! grep -q "error-container" "$test_file"; then
    echo "❌ Missing DOM element in test: $test_file"
    echo "   Code expects 'error-container' but test doesn't provide it"
    exit 1
  fi
done

echo "✅ Architecture validation passed!"
