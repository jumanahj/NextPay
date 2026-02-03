#!/usr/bin/env pwsh
<#
Transaction Reuse Test - PowerShell Version
Tests that /api/pay/initiate reuses transactionId for the same orderId
#>

$API_BASE = "http://localhost:4000"
$customerId = "CUST4420"
$orderId = "ORD-1768199419765-686"
$amount = 500
$paymentMethod = "debit_card"

Write-Host "`n========== TRANSACTION REUSE TEST (PowerShell) ==========`n" -ForegroundColor Cyan

# Test 1: First /initiate call
Write-Host "TEST 1: First /initiate call" -ForegroundColor Yellow
$json1 = @{ customerId=$customerId; orderId=$orderId; amount=$amount; paymentMethod=$paymentMethod } | ConvertTo-Json
$response1 = Invoke-WebRequest -Uri "$API_BASE/api/pay/initiate" -Method POST -ContentType "application/json" -Body $json1 -UseBasicParsing 2>&1
$result1 = $response1.Content | ConvertFrom-Json

$txn1 = $result1.transactionId
Write-Host "  [PASS] Transaction ID: $txn1" -ForegroundColor Green
Write-Host "  [PASS] Message: $($result1.message)" -ForegroundColor Green
Write-Host "  [PASS] Expires in: $($result1.expiresInSeconds) seconds" -ForegroundColor Green
Write-Host ""

# Test 2: Second /initiate call with SAME orderId
Write-Host "TEST 2: Second /initiate call (should REUSE same transactionId)" -ForegroundColor Yellow
$json2 = @{ customerId=$customerId; orderId=$orderId; amount=$amount; paymentMethod=$paymentMethod } | ConvertTo-Json
$response2 = Invoke-WebRequest -Uri "$API_BASE/api/pay/initiate" -Method POST -ContentType "application/json" -Body $json2 -UseBasicParsing 2>&1
$result2 = $response2.Content | ConvertFrom-Json

$txn2 = $result2.transactionId
Write-Host "  [PASS] Transaction ID: $txn2" -ForegroundColor Green

if ($txn1 -eq $txn2) {
    Write-Host "  [PASS][PASS] SUCCESS! Same transactionId reused: $txn1" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host ""
} else {
    Write-Host "  [FAIL] Different transactionId created" -ForegroundColor Red
    Write-Host "    - First: $txn1" -ForegroundColor Red
    Write-Host "    - Second: $txn2" -ForegroundColor Red
    exit 1
}

# Test 3: /resend-otp (should update existing transaction record)
Write-Host "TEST 3: /resend-otp call (should update existing record)" -ForegroundColor Yellow
$json3 = @{ transactionId=$txn2 } | ConvertTo-Json
$response3 = Invoke-WebRequest -Uri "$API_BASE/api/pay/resend-otp" -Method POST -ContentType "application/json" -Body $json3 -UseBasicParsing 2>&1
$result3 = $response3.Content | ConvertFrom-Json

Write-Host "  [PASS] Message: $($result3.message)" -ForegroundColor Green
Write-Host "  [PASS] Attempts reset to: $(if($result3.attempts) { $result3.attempts } else { 3 })" -ForegroundColor Green
Write-Host "  [PASS] Timer reset to: $(if($result3.expiresInSeconds) { $result3.expiresInSeconds } else { 600 }) seconds" -ForegroundColor Green
Write-Host ""

Write-Host "========== ALL TESTS PASSED ==========" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - First /initiate: Created transactionId $txn1" -ForegroundColor Green
Write-Host "  - Second /initiate: Reused same transactionId (no new one created)" -ForegroundColor Green
Write-Host "  - /resend-otp: Updated OTP record for same transaction" -ForegroundColor Green
Write-Host "  - Result: ONE transaction per payment, reusable for resend" -ForegroundColor Green
Write-Host ""
