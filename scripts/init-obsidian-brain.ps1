param([Parameter(Mandatory=$true)][string]$VaultPath)

$enc   = [System.Text.UTF8Encoding]::new($true)
$today = Get-Date -Format "yyyy-MM-dd"
$cd    = Join-Path $VaultPath "Claude"
$ld    = Join-Path $cd "Daily"

New-Item -ItemType Directory -Force -Path $cd | Out-Null
New-Item -ItemType Directory -Force -Path $ld | Out-Null

function Decode($b64) {
    $bytes = [System.Convert]::FromBase64String($b64)
    [System.Text.Encoding]::UTF8.GetString($bytes).Replace("TODAY", (Get-Date -Format "yyyy-MM-dd"))
}

function Save($path, $b64) {
    [System.IO.File]::WriteAllText($path, (Decode $b64), $enc)
    Write-Host "OK: $path" -ForegroundColor Green
}

Save (Join-Path $cd "Profile.md") "LS0tCnRpdGxlOiDjg5fjg61Qcm9maWxlCnRhZ3M6IFtjbGF1ZGUsIHByb2ZpbGVdCnVwZGF0ZWQ6IFRPREFZLS0tCgojIOWwj+a+pOiytCBQcm9maWxlCgojIyDln7rmnKzjgIHlj5bpl7QKLSDlkI3liY06IOWwj+a+pOiytAotIE9TOiBXaW5kb3dzIDExCi0g6Zai5b+DOiDmoKrlvI/mipXos4fjg7vjg4bjg7Pjg5Djgqzjgrzjgrvnp7vluIHmg4XloLHjg7tBSeaUu+eUqAoKIyMg5L2/55So44OE44O844OrCi0gT2JzaWRpYW7vvIjlpJbpg6johLPvvIkKLSBDbGF1ZGUgQ29kZQotIFJldHJhdGxl77yITmV4dC5qc+agquW8j++8iQotIOalveWkqeiovOWIuAoKIyMg44Kr44Os44Oz44OA44O8Ci0gR29vZ2xlIENhbGVuZGFy77yIT3V0bG9va+OBuOenm+ihjOS6iOWumuu7ku+8iQo="

Save (Join-Path $cd "Tasks.md") "LS0tCnRpdGxlOiDpgLLooYzkuK3jgr/jgrnjgq8KdGFnczogW2NsYXVkZSwgdGFza3NdCnVwZGF0ZWQ6IFRPREFZLS0tCgojIyDntYrmmpQK77yI44Gq44GX77yJCgojIyDpgLLooYzkuK0KLSBbIF0gT2JzaWRpYW4gKyBDbGF1ZGUgQ29kZSBNQ1DpgKPmkLrjgrnjgr/jg7zjg4AKLSBbIF0gRmFjZWJvb2svSW5zdGFncmFtIOWIneacn+iovOWumuW6mu+8iDUvMTkgMTg6MDD/vIkKLSBbIF0g5qW95aSp6Ki85Yi4IOmAhua8h+WAmuiorOWumuW6mu+8iDUvMTgg5ayc77yJCi0gWyBdIE91dGxvb2vjgqvjg6zjg7PjgoDjg7zjgbjno7vooYwKCiMjIOWujOS6hgotIFt4XSBOb2RlLmpzIOOCpOODs+OCueODiOODvOODqwotIFt4XSBDbGF1ZGUgQ29kZSBDTEkg44Kk44Oz44K544OI44O844OrCi0gW3hdIE9CU0lESUFOX0FQSV9LRVkg5rC457aa5YyWCg=="

Save (Join-Path $cd "Memory.md") "LS0tCnRpdGxlOiDoqJjmhrbjg6Hjg6IKdGFnczogW2NsYXVkZSwgbWVtb3J5XQp1cGRhdGVkOiBUT0RBWQ0KLS0tCgojIOOCu+ODg+OCt+ODp+ODs+iomOaGtgoKIyMgMjAyNi0wNS0xOAotIE9ic2lkaWFuIE1DUOmAo+aQuj1zdGFydAotIExvY2FsIFJFU1QgQVBJIHBsdWdpbiArIEFQSSBrZXkgT0sKLSBOb2RlLmpzIHYyNC4xNS4wIE9LCi0gQ2xhdWRlIENvZGUgQ0xJIE9LCi0gT0JTSURJQU5fQVBJX0tFWSBXaW5kb3dzIOawuOe2muW4iAotIEdvb2dsZSBDYWxlbmRhcjoKICAtIDUvMTggMjA6MDAgTWFya2V0IG9yZGVyIHNldHRpbmcKICAtIDUvMTkgMTg6MDAgRmFjZWJvb2svSW5zdGFncmFtIHNldHVwCi0gV2FudHMgdG8gbWlncmF0ZSB0byBPdXRsb29rCg=="

Save (Join-Path $ld "$today.md") "LS0tCnRpdGxlOiBUT0RBWQp0YWdzOiBbY2xhdWRlLCBsb2ddCmRhdGU6IFRPREFZLS0tCgojIyDku4rpnafjgpPjgaPjgZ/jgaoCLSBPYnNpZGlhbuWklumDqOiEs+OCt+OCueODhuODoOOCkuWIneacn+mWlgoKIyMg44Oh44OiCg=="

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Created notes in: $cd" -ForegroundColor White
Write-Host ""
Write-Host "Next: Open Obsidian and check the Claude/ folder"
