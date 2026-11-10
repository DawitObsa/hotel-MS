$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '..\backend\.env'
if (-not (Test-Path -LiteralPath $envPath)) {
  throw 'backend/.env was not found. Run npm run setup:env first.'
}

$envContents = Get-Content -LiteralPath $envPath -Raw
if ($envContents -notmatch '(?m)^ADMIN_SETUP_KEY=(.+)$') {
  throw 'ADMIN_SETUP_KEY is missing from backend/.env.'
}
$setupKey = $Matches[1].Trim()
if (-not $setupKey -or $setupKey -like 'replace-*') {
  throw 'Set a real ADMIN_SETUP_KEY in backend/.env before creating the administrator.'
}

$name = Read-Host 'Administrator name [Hospital Administrator]'
if ([string]::IsNullOrWhiteSpace($name)) {
  $name = 'Hospital Administrator'
}

$email = Read-Host 'Administrator email [devaobsa@gmail.com]'
if ([string]::IsNullOrWhiteSpace($email)) {
  $email = 'devaobsa@gmail.com'
}

$securePassword = Read-Host 'Choose an administrator password (at least 12 characters)' -AsSecureString
$confirmPassword = Read-Host 'Confirm the password' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$confirmPointer = [IntPtr]::Zero

try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $confirmPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmPassword)
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPointer)

  if ($password.Length -lt 12) {
    throw 'The password must be at least 12 characters.'
  }
  if ($password -cne $confirmation) {
    throw 'The passwords do not match.'
  }

  $requestBody = @{
    setupKey = $setupKey
    name = $name
    email = $email
    password = $password
  } | ConvertTo-Json -Compress

  $result = Invoke-RestMethod `
    -Uri 'http://localhost:4000/api/auth/bootstrap' `
    -Method Post `
    -ContentType 'application/json' `
    -Body $requestBody

  Write-Host "Administrator created for $($result.email). You can now sign in."
} catch {
  Write-Error "Administrator setup failed: $($_.Exception.Message)"
  exit 1
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  if ($confirmPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPointer)
  }
  $securePassword.Dispose()
  $confirmPassword.Dispose()
  $password = $null
  $confirmation = $null
  $requestBody = $null
  $setupKey = $null
}
