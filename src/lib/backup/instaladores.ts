/**
 * Instaladores do backup automático no computador do usuário.
 *
 * São texto puro servido por /api/backup/instalar e rodado de uma linha só (a
 * tela de Configurações mostra o comando). Não carregam segredo: a chave chega
 * como argumento do comando. Dois cuidados de escrita: nada de "${" nem de
 * crase aqui dentro, porque estes textos vivem em template string de JS.
 */

export function instaladorMac(base: string): string {
  return String.raw`#!/bin/bash
# Backup automático do FARO (Mac). Uso: instalador CHAVE [SUBPASTA_NO_DRIVE]
TOKEN="$1"
SUB="$2"
BASE="__BASE__"
if [ -z "$TOKEN" ]; then echo "Faltou a chave. Copie o comando inteiro das Configurações do FARO."; exit 1; fi
[ -z "$SUB" ] && SUB="FARO Backups"

PASTA="$HOME/Library/Application Support/FARO-Backup"
mkdir -p "$PASTA" "$HOME/Library/Logs"

# Onde está o Google Drive neste Mac (app "Drive para computador").
DRIVE=""
for d in "$HOME/Library/CloudStorage/GoogleDrive-"*; do
  for m in "Meu Drive" "My Drive"; do
    if [ -d "$d/$m" ]; then DRIVE="$d/$m"; break 2; fi
  done
done
if [ -z "$DRIVE" ]; then
  for m in "$HOME/Google Drive/Meu Drive" "$HOME/Google Drive/My Drive" "$HOME/Google Drive"; do
    if [ -d "$m" ]; then DRIVE="$m"; break; fi
  done
fi
if [ -n "$DRIVE" ]; then
  DESTINO="$DRIVE/$SUB"
else
  DESTINO="$HOME/Documents/FARO Backups"
  echo "ATENÇÃO: não achei o Google Drive neste Mac. Os backups vão para $DESTINO."
  echo "Instale o 'Drive para computador' e rode este comando de novo para guardá-los no Drive."
fi
mkdir -p "$DESTINO" || { echo "Não consegui criar a pasta $DESTINO"; exit 1; }

{
  printf 'TOKEN=%q\n' "$TOKEN"
  printf 'BASE=%q\n' "$BASE"
  printf 'DESTINO=%q\n' "$DESTINO"
} > "$PASTA/config"
chmod 600 "$PASTA/config"

cat > "$PASTA/faro-backup.sh" <<'FIM_DO_SCRIPT'
#!/bin/bash
# Roda de hora em hora e só trabalha se ainda não existir backup de hoje.
PASTA="$HOME/Library/Application Support/FARO-Backup"
. "$PASTA/config"
LOG="$HOME/Library/Logs/faro-backup.log"
hoje=$(date +%F)

registrar() { echo "$(date '+%F %T') $1" >> "$LOG"; }
avisar() {
  registrar "$1"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$1\" with title \"Backup do FARO\"" >/dev/null 2>&1
  fi
}

mkdir -p "$DESTINO" 2>/dev/null || { avisar "Não consegui abrir a pasta de backup."; exit 1; }
if [ "$1" != "--forcar" ] && ls "$DESTINO"/faro-backup-"$hoje"-*.json >/dev/null 2>&1; then exit 0; fi

tmp=$(mktemp); cab=$(mktemp)
codigo=$(curl -sS --max-time 180 -H "Authorization: Bearer $TOKEN" -D "$cab" -o "$tmp" -w '%{http_code}' "$BASE/api/backup/auto" 2>>"$LOG")
if [ -z "$codigo" ] || [ "$codigo" = "000" ]; then
  registrar "Sem conexão com o FARO; tento de novo na próxima hora."
  rm -f "$tmp" "$cab"; exit 1
fi
if [ "$codigo" = "401" ]; then avisar "A chave do backup não vale mais. Gere o comando de novo nas Configurações do FARO."; rm -f "$tmp" "$cab"; exit 1; fi
if [ "$codigo" != "200" ]; then registrar "O FARO respondeu $codigo; tento de novo na próxima hora."; rm -f "$tmp" "$cab"; exit 1; fi

completo=$(grep -i '^x-faro-completo:' "$cab" | tr -d '\r' | awk '{print $2}')
linhas=$(grep -i '^x-faro-linhas:' "$cab" | tr -d '\r' | awk '{print $2}')
bytes=$(wc -c < "$tmp" | tr -d ' ')
if [ -z "$linhas" ]; then linhas=0; fi
if [ "$completo" != "sim" ] || [ "$bytes" -lt 1000 ]; then
  avisar "O backup veio incompleto e não foi guardado."
  rm -f "$tmp" "$cab"; exit 1
fi

arquivo="faro-backup-$(date +%F-%H%M).json"
mv "$tmp" "$DESTINO/$arquivo" || { avisar "Não consegui gravar o backup na pasta."; rm -f "$tmp" "$cab"; exit 1; }
rm -f "$cab"
curl -sS --max-time 60 -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"arquivo\":\"$arquivo\",\"bytes\":$bytes,\"linhas\":$linhas}" "$BASE/api/backup/auto" >/dev/null 2>>"$LOG" \
  || registrar "Backup guardado, mas não consegui avisar o FARO."
find "$DESTINO" -name 'faro-backup-*.json' -mtime +30 -delete 2>/dev/null
registrar "Backup guardado: $arquivo ($bytes bytes, $linhas linhas)"
FIM_DO_SCRIPT
chmod +x "$PASTA/faro-backup.sh"

if command -v launchctl >/dev/null 2>&1; then
  PLIST="$HOME/Library/LaunchAgents/br.app.faro.backup.plist"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<FIM_DO_PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>br.app.faro.backup</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$PASTA/faro-backup.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>3600</integer>
</dict></plist>
FIM_DO_PLIST
  launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1
  launchctl bootstrap "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || launchctl load "$PLIST" >/dev/null 2>&1
fi

echo "Rodando o primeiro backup agora..."
"$PASTA/faro-backup.sh" --forcar
if ls "$DESTINO"/faro-backup-"$hoje"-*.json >/dev/null 2>&1 || ls "$DESTINO"/faro-backup-*.json >/dev/null 2>&1; then
  echo "Pronto. Backup guardado em: $DESTINO"
  echo "Dali em diante o Mac tenta uma vez por hora e só faz se ainda não houver backup do dia."
else
  echo "O primeiro backup não saiu. Veja o motivo em: $HOME/Library/Logs/faro-backup.log"
  exit 1
fi
`.replace("__BASE__", base);
}

export function instaladorWindows(base: string): string {
  return String.raw`param([string]$Token, [string]$Pasta = 'FARO Backups')
# Backup automático do FARO (Windows).
$ErrorActionPreference = 'Stop'
if (-not $Token) { Write-Host 'Faltou a chave. Copie o comando inteiro das Configurações do FARO.'; return }
$base = '__BASE__'
$dir = Join-Path $env:APPDATA 'FARO-Backup'
New-Item -ItemType Directory -Force $dir | Out-Null

# Onde está o Google Drive neste computador (app "Drive para computador").
$drive = $null
foreach ($l in 'G','H','I','J','D','E','F') {
  foreach ($m in 'Meu Drive','My Drive') {
    $p = $l + ':\' + $m
    if (Test-Path $p) { $drive = $p; break }
  }
  if ($drive) { break }
}
if (-not $drive) {
  foreach ($p in ($HOME + '\Google Drive\Meu Drive'), ($HOME + '\Google Drive\My Drive'), ($HOME + '\Google Drive')) {
    if (Test-Path $p) { $drive = $p; break }
  }
}
if ($drive) { $destino = Join-Path $drive $Pasta }
else {
  $destino = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'FARO Backups'
  Write-Host ('ATENÇÃO: não achei o Google Drive. Os backups vão para ' + $destino)
}
New-Item -ItemType Directory -Force $destino | Out-Null
@{ token = $Token; base = $base; destino = $destino } | ConvertTo-Json | Set-Content (Join-Path $dir 'config.json') -Encoding UTF8

$runner = @'
$dir = Join-Path $env:APPDATA 'FARO-Backup'
$c = Get-Content (Join-Path $dir 'config.json') -Raw | ConvertFrom-Json
$log = Join-Path $dir 'backup.log'
function Registrar($t) { Add-Content $log ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $t) }
$hoje = Get-Date -Format 'yyyy-MM-dd'
New-Item -ItemType Directory -Force $c.destino | Out-Null
if ((Get-ChildItem $c.destino -Filter ('faro-backup-' + $hoje + '-*.json') -ErrorAction SilentlyContinue) -and ($args[0] -ne '--forcar')) { return }
$tmp = [IO.Path]::GetTempFileName()
try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Headers @{ Authorization = ('Bearer ' + $c.token) } -Uri ($c.base + '/api/backup/auto') -OutFile $tmp -PassThru
} catch {
  $cod = $null; if ($_.Exception.Response) { $cod = [int]$_.Exception.Response.StatusCode }
  if ($cod -eq 401) { Registrar 'A chave do backup não vale mais. Gere o comando de novo nas Configurações do FARO.' }
  else { Registrar 'Sem conexão com o FARO; tento de novo na próxima hora.' }
  Remove-Item $tmp -ErrorAction SilentlyContinue; return
}
$completo = $r.Headers['X-Faro-Completo']; $linhas = $r.Headers['X-Faro-Linhas']
$bytes = (Get-Item $tmp).Length
if (($completo -ne 'sim') -or ($bytes -lt 1000)) { Registrar 'O backup veio incompleto e não foi guardado.'; Remove-Item $tmp; return }
$arquivo = 'faro-backup-' + (Get-Date -Format 'yyyy-MM-dd-HHmm') + '.json'
Move-Item $tmp (Join-Path $c.destino $arquivo) -Force
try {
  $corpo = @{ arquivo = $arquivo; bytes = $bytes; linhas = [int]$linhas } | ConvertTo-Json
  Invoke-RestMethod -Method Post -TimeoutSec 60 -Headers @{ Authorization = ('Bearer ' + $c.token) } -ContentType 'application/json' -Body $corpo -Uri ($c.base + '/api/backup/auto') | Out-Null
} catch { Registrar 'Backup guardado, mas não consegui avisar o FARO.' }
Get-ChildItem $c.destino -Filter 'faro-backup-*.json' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -ErrorAction SilentlyContinue
Registrar ('Backup guardado: ' + $arquivo + ' (' + $bytes + ' bytes)')
'@
$arquivoRunner = Join-Path $dir 'faro-backup.ps1'
Set-Content $arquivoRunner $runner -Encoding UTF8

$argumento = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $arquivoRunner + '"'
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumento
$gatilhos = @(
  (New-ScheduledTaskTrigger -AtLogOn),
  (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650))
)
$cfg = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'FARO Backup' -Action $acao -Trigger $gatilhos -Settings $cfg -Force | Out-Null

Write-Host 'Rodando o primeiro backup agora...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $arquivoRunner --forcar
if (Get-ChildItem $destino -Filter 'faro-backup-*.json' -ErrorAction SilentlyContinue) {
  Write-Host ('Pronto. Backup guardado em: ' + $destino)
  Write-Host 'Dali em diante o computador tenta uma vez por hora e só faz se ainda não houver backup do dia.'
} else {
  Write-Host ('O primeiro backup não saiu. Veja o motivo em: ' + (Join-Path $dir 'backup.log'))
}
`.replace("__BASE__", base);
}
