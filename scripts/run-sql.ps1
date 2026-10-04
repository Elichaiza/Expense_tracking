# מריץ קובץ SQL על פרויקט ה-Supabase דרך ה-Management API.
# שימוש: powershell -File scripts/run-sql.ps1 supabase/migrations/003_incomes.sql
# הטוקן נקרא מ-.supabase-token (לא עולה לגיט) ולעולם לא מודפס.
param([Parameter(Mandatory = $true)][string]$File)

$ref = "qqgiajlqtkrthcweojpa"
$tokenFile = Join-Path $PSScriptRoot "..\.supabase-token"
if (-not (Test-Path $tokenFile)) { throw "missing .supabase-token" }
$token = (Get-Content $tokenFile -Raw).Trim()
$sql = [string](Get-Content $File -Raw -Encoding UTF8)

$body = [Text.Encoding]::UTF8.GetBytes((@{ query = $sql } | ConvertTo-Json -Compress))
try {
  $res = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" `
    -Method Post -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json; charset=utf-8" -Body $body
  "OK"
  if ($res) { $res | ConvertTo-Json -Depth 5 }
} catch {
  "FAILED: " + $_.Exception.Message
  if ($_.ErrorDetails) { $_.ErrorDetails.Message }
  exit 1
}

