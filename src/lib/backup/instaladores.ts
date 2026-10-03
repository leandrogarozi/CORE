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
# Backup automático do FARO (Mac). Uso: instalador CHAVE [PASTA_DOS_BACKUPS] [PASTA_DO_APRENDIZADO]
TOKEN="$1"
SUB="$2"
SUB_APR="$3"
BASE="__BASE__"
if [ -z "$TOKEN" ]; then echo "Faltou a chave. Copie o comando inteiro das Configurações do FARO."; exit 1; fi
[ -z "$SUB" ] && SUB="FARO Backups"
[ -z "$SUB_APR" ] && SUB_APR="FARO Aprendizado"

PASTA="$HOME/Library/Application Support/FARO-Backup"

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
DRIVE_ACHADO="$DRIVE"
[ -z "$DRIVE_ACHADO" ] && DRIVE_ACHADO="nenhum"
# Só usa o Drive se a pasta PAI já existir lá. Criar o caminho inteiro por conta
# própria geraria uma árvore de pastas nova e repetida no Drive.
if [ -n "$DRIVE" ] && { [ ! -d "$DRIVE/$(dirname "$SUB")" ] || [ ! -d "$DRIVE/$(dirname "$SUB_APR")" ]; }; then
  echo "ATENÇÃO: não achei no seu Drive a pasta $(dirname "$SUB")."
  echo "Confira se ela já foi baixada pelo 'Drive para computador' (pasta aberta e sincronizada)."
  DRIVE=""
fi
if [ -n "$DRIVE" ]; then
  DESTINO="$DRIVE/$SUB"
  DESTINO_APR="$DRIVE/$SUB_APR"
else
  DESTINO="$HOME/Documents/FARO Backups"
  DESTINO_APR="$HOME/Documents/FARO Aprendizado"
  echo "Os backups vão para $DESTINO (fora do Drive). Corrija o que apareceu acima e rode o comando de novo."
fi

# Ensaio: com FARO_SIMULAR=1 o instalador só MOSTRA o que faria e sai, sem criar
# pasta, arquivo, agendamento nem fazer nenhuma chamada ao FARO.
if [ "$FARO_SIMULAR" = "1" ]; then
  echo "=== ENSAIO: nada foi criado nem instalado ==="
  echo "Drive encontrado em: $DRIVE_ACHADO"
  echo "Pasta dos backups (.json):  $DESTINO"
  echo "Pasta dos aprendizados:     $DESTINO_APR"
  for d in "$DESTINO" "$DESTINO_APR"; do
    if [ -d "$d" ]; then echo "  já existe: $d"; else echo "  seria criada (só o último nível): $d"; fi
    pai=$(dirname "$d")
    echo "  pasta pai: $pai"
    if command -v xattr >/dev/null 2>&1 && [ -d "$pai" ]; then
      xattr -l "$pai" 2>/dev/null | grep -i drivefs | sed 's/^/    atributo do Drive: /'
    fi
  done
  echo "Seriam criados em: $PASTA (config com a chave, script) e o agendamento br.app.faro.backup."
  exit 0
fi

mkdir -p "$PASTA" "$HOME/Library/Logs"
mkdir -p "$DESTINO" "$DESTINO_APR" || { echo "Não consegui criar as pastas de destino"; exit 1; }

{
  printf 'TOKEN=%q\n' "$TOKEN"
  printf 'BASE=%q\n' "$BASE"
  printf 'DESTINO=%q\n' "$DESTINO"
  printf 'DESTINO_APR=%q\n' "$DESTINO_APR"
} > "$PASTA/config"
chmod 600 "$PASTA/config"

cat > "$PASTA/faro-backup.sh" <<'FIM_DO_SCRIPT'
#!/bin/bash
# Roda a cada 15 minutos. Faz duas coisas, cada uma no máximo uma vez por dia:
#  1) o backup completo (.json), guardando os 7 mais recentes;
#  2) os textos de aprendizado (sinapses e livros), também quando o botão do FARO pede.
PASTA="$HOME/Library/Application Support/FARO-Backup"
. "$PASTA/config"
LOG="$HOME/Library/Logs/faro-backup.log"
hoje=$(date +%F)
FORCAR=0
[ "$1" = "--forcar" ] && FORCAR=1

registrar() { echo "$(date '+%F %T') $1" >> "$LOG"; }
avisar() {
  registrar "$1"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display notification \"$1\" with title \"Backup do FARO\"" >/dev/null 2>&1
  fi
}

# Baixa $1 (caminho da API) para $2 e deixa os cabeçalhos em $3. Devolve 0 só com resposta 200.
baixar() {
  local codigo
  codigo=$(curl -sS --max-time 180 -H "Authorization: Bearer $TOKEN" -D "$3" -o "$2" -w '%{http_code}' "$BASE$1" 2>>"$LOG")
  if [ -z "$codigo" ] || [ "$codigo" = "000" ]; then registrar "Sem conexão com o FARO; tento de novo daqui a pouco."; return 1; fi
  if [ "$codigo" = "401" ]; then avisar "A chave do backup não vale mais. Gere o comando de novo nas Configurações do FARO."; return 1; fi
  if [ "$codigo" != "200" ]; then registrar "O FARO respondeu $codigo em $1; tento de novo daqui a pouco."; return 1; fi
  return 0
}

# Quem decide se já houve backup hoje (em QUALQUER computador) é o servidor: ele
# sabe a hora do último backup registrado. Não confio em listar a pasta do Drive:
# no Mac a listagem de pasta sincronizada pode vir vazia quando o programa roda
# em segundo plano, e isso fazia um backup novo a cada 15 minutos.
ESTADO=$(curl -sS --max-time 30 -H "Authorization: Bearer $TOKEN" "$BASE/api/backup/pedido" 2>/dev/null)

backup_completo() {
  mkdir -p "$DESTINO" 2>/dev/null || { avisar "Não consegui abrir a pasta de backup."; return 1; }
  if [ $FORCAR = 0 ]; then
    if [ -f "$PASTA/backup-ultimo" ] && [ "$(cat "$PASTA/backup-ultimo")" = "$hoje" ]; then return 0; fi
    if [ -z "$ESTADO" ]; then registrar "Sem conexão com o FARO; tento de novo daqui a pouco."; return 1; fi
    if echo "$ESTADO" | grep -q '"backupHoje":true'; then echo "$hoje" > "$PASTA/backup-ultimo"; return 0; fi
  fi
  local tmp cab completo linhas bytes arquivo
  tmp=$(mktemp); cab=$(mktemp)
  if ! baixar /api/backup/auto "$tmp" "$cab"; then rm -f "$tmp" "$cab"; return 1; fi
  completo=$(grep -i '^x-faro-completo:' "$cab" | tr -d '\r' | awk '{print $2}')
  linhas=$(grep -i '^x-faro-linhas:' "$cab" | tr -d '\r' | awk '{print $2}')
  bytes=$(wc -c < "$tmp" | tr -d ' ')
  if [ -z "$linhas" ]; then linhas=0; fi
  if [ "$completo" != "sim" ] || [ "$bytes" -lt 1000 ]; then
    avisar "O backup veio incompleto e não foi guardado."
    rm -f "$tmp" "$cab"; return 1
  fi
  arquivo="faro-backup-$(date +%F-%H%M).json"
  mv "$tmp" "$DESTINO/$arquivo" || { avisar "Não consegui gravar o backup na pasta."; rm -f "$tmp" "$cab"; return 1; }
  rm -f "$cab"
  echo "$hoje" > "$PASTA/backup-ultimo"
  curl -sS --max-time 60 -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"arquivo\":\"$arquivo\",\"bytes\":$bytes,\"linhas\":$linhas}" "$BASE/api/backup/auto" >/dev/null 2>>"$LOG" \
    || registrar "Backup guardado, mas não consegui avisar o FARO."
  # Fica com os 7 mais recentes.
  ls -1t "$DESTINO"/faro-backup-*.json 2>/dev/null | tail -n +8 | while IFS= read -r velho; do rm -f -- "$velho"; done
  registrar "Backup guardado: $arquivo ($bytes bytes, $linhas linhas)"
}

aprendizado() {
  mkdir -p "$DESTINO_APR" 2>/dev/null || { avisar "Não consegui abrir a pasta do aprendizado."; return 1; }
  local pedido=0 feito_hoje=0
  [ "$FORCAR" = 1 ] && pedido=1
  [ -f "$PASTA/aprendizado-ultimo" ] && [ "$(cat "$PASTA/aprendizado-ultimo")" = "$hoje" ] && feito_hoje=1
  if [ $pedido = 0 ]; then
    if echo "$ESTADO" | grep -q '"pendente":true'; then pedido=1; fi
  fi
  if [ $pedido = 0 ] && [ $feito_hoje = 1 ]; then return 0; fi

  local zip cab dir n novos
  zip=$(mktemp); cab=$(mktemp); dir=$(mktemp -d)
  if ! baixar /api/backup/aprendizado "$zip" "$cab"; then rm -rf "$dir"; rm -f "$zip" "$cab"; return 1; fi
  # No Mac o "ditto" é quem abre zip com acento no nome do jeito certo (é o que o Finder usa).
  if command -v ditto >/dev/null 2>&1; then ditto -x -k "$zip" "$dir" 2>>"$LOG"; else unzip -oq "$zip" -d "$dir" 2>>"$LOG"; fi
  if [ $? -ne 0 ]; then avisar "Não consegui abrir o zip do aprendizado."; rm -rf "$dir"; rm -f "$zip" "$cab"; return 1; fi
  n=0; novos=0
  # Copia só o que mudou, para o Drive não criar uma versão nova de tudo todo dia.
  # Nunca apaga nada: arquivo de item removido no FARO continua na pasta.
  while IFS= read -r -d '' f; do
    rel=$(printf '%s' "$f" | sed "s|^$dir/||")
    alvo="$DESTINO_APR/$rel"
    n=$((n+1))
    mkdir -p "$(dirname "$alvo")"
    if [ ! -f "$alvo" ] || ! cmp -s "$f" "$alvo"; then cp "$f" "$alvo"; novos=$((novos+1)); fi
  done < <(find "$dir" -type f -print0)
  rm -rf "$dir"; rm -f "$zip" "$cab"
  echo "$hoje" > "$PASTA/aprendizado-ultimo"
  curl -sS --max-time 60 -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"arquivos\":$n}" "$BASE/api/backup/aprendizado" >/dev/null 2>>"$LOG" \
    || registrar "Aprendizado guardado, mas não consegui avisar o FARO."
  registrar "Aprendizado guardado: $n arquivos ($novos novos ou alterados)"
}

backup_completo
aprendizado
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
  <key>StartInterval</key><integer>900</integer>
</dict></plist>
FIM_DO_PLIST
  launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1
  launchctl bootstrap "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || launchctl load "$PLIST" >/dev/null 2>&1
fi

echo "Rodando o primeiro backup e o envio dos aprendizados agora..."
"$PASTA/faro-backup.sh" --forcar
if ls "$DESTINO"/faro-backup-"$hoje"-*.json >/dev/null 2>&1 || ls "$DESTINO"/faro-backup-*.json >/dev/null 2>&1; then
  echo "Pronto. Backup guardado em: $DESTINO"
  echo "Aprendizados (textos) em: $DESTINO_APR"
  echo "Dali em diante o Mac confere a cada 15 minutos: faz o backup do dia e envia os aprendizados quando você pedir pelo botão."
else
  echo "O primeiro backup não saiu. Veja o motivo em: $HOME/Library/Logs/faro-backup.log"
  exit 1
fi
`.replace("__BASE__", base);
}

export function instaladorWindows(base: string): string {
  return String.raw`param([string]$Token, [string]$Pasta = 'FARO Backups', [string]$PastaAprendizado = 'FARO Aprendizado')
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
if ($drive -and ((-not (Test-Path (Join-Path $drive (Split-Path $Pasta -Parent)))) -or (-not (Test-Path (Join-Path $drive (Split-Path $PastaAprendizado -Parent)))))) {
  Write-Host ('ATENÇÃO: não achei no seu Drive a pasta ' + (Split-Path $Pasta -Parent) + '. Confira se o Drive para computador já a sincronizou.')
  $drive = $null
}
if ($drive) { $destino = Join-Path $drive $Pasta; $destinoApr = Join-Path $drive $PastaAprendizado }
else {
  $destino = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'FARO Backups'
  $destinoApr = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'FARO Aprendizado'
  Write-Host ('Os backups vão para ' + $destino + ' (fora do Drive). Corrija o que apareceu acima e rode o comando de novo.')
}
New-Item -ItemType Directory -Force $destino | Out-Null
New-Item -ItemType Directory -Force $destinoApr | Out-Null
@{ token = $Token; base = $base; destino = $destino; destinoApr = $destinoApr } | ConvertTo-Json | Set-Content (Join-Path $dir 'config.json') -Encoding UTF8

$runner = @'
param([string]$Modo = '')
$dir = Join-Path $env:APPDATA 'FARO-Backup'
$c = Get-Content (Join-Path $dir 'config.json') -Raw | ConvertFrom-Json
$log = Join-Path $dir 'backup.log'
$hoje = Get-Date -Format 'yyyy-MM-dd'
$forcar = ($Modo -eq 'forcar')
function Registrar($t) { Add-Content $log ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $t) }
$cab = @{ Authorization = ('Bearer ' + $c.token) }

# Quem decide se já houve backup hoje (em qualquer computador) é o servidor.
$estado = $null
try { $estado = Invoke-RestMethod -TimeoutSec 30 -Headers $cab -Uri ($c.base + '/api/backup/pedido') } catch { }
$marcaBackup = Join-Path $dir 'backup-ultimo'

function BackupCompleto {
  New-Item -ItemType Directory -Force $c.destino | Out-Null
  if (-not $forcar) {
    if ((Test-Path $marcaBackup) -and ((Get-Content $marcaBackup -Raw).Trim() -eq $hoje)) { return }
    if (-not $estado) { Registrar 'Sem conexão com o FARO; tento de novo daqui a pouco.'; return }
    if ($estado.backupHoje) { Set-Content $marcaBackup $hoje; return }
  }
  $tmp = [IO.Path]::GetTempFileName()
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Headers $cab -Uri ($c.base + '/api/backup/auto') -OutFile $tmp -PassThru
  } catch {
    $cod = $null; if ($_.Exception.Response) { $cod = [int]$_.Exception.Response.StatusCode }
    if ($cod -eq 401) { Registrar 'A chave do backup não vale mais. Gere o comando de novo nas Configurações do FARO.' }
    else { Registrar 'Sem conexão com o FARO; tento de novo daqui a pouco.' }
    Remove-Item $tmp -ErrorAction SilentlyContinue; return
  }
  $completo = $r.Headers['X-Faro-Completo']; $linhas = $r.Headers['X-Faro-Linhas']
  $bytes = (Get-Item $tmp).Length
  if (($completo -ne 'sim') -or ($bytes -lt 1000)) { Registrar 'O backup veio incompleto e não foi guardado.'; Remove-Item $tmp; return }
  $arquivo = 'faro-backup-' + (Get-Date -Format 'yyyy-MM-dd-HHmm') + '.json'
  Move-Item $tmp (Join-Path $c.destino $arquivo) -Force
  Set-Content $marcaBackup $hoje
  try {
    $corpo = @{ arquivo = $arquivo; bytes = $bytes; linhas = [int]$linhas } | ConvertTo-Json
    Invoke-RestMethod -Method Post -TimeoutSec 60 -Headers $cab -ContentType 'application/json' -Body $corpo -Uri ($c.base + '/api/backup/auto') | Out-Null
  } catch { Registrar 'Backup guardado, mas não consegui avisar o FARO.' }
  # Fica com os 7 mais recentes.
  Get-ChildItem $c.destino -Filter 'faro-backup-*.json' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7 | Remove-Item -ErrorAction SilentlyContinue
  Registrar ('Backup guardado: ' + $arquivo + ' (' + $bytes + ' bytes)')
}

function Aprendizado {
  New-Item -ItemType Directory -Force $c.destinoApr | Out-Null
  $marca = Join-Path $dir 'aprendizado-ultimo'
  $feitoHoje = (Test-Path $marca) -and ((Get-Content $marca -Raw).Trim() -eq $hoje)
  $pedido = $forcar
  if (-not $pedido) {
    if ($estado -and $estado.pendente) { $pedido = $true }
  }
  if ((-not $pedido) -and $feitoHoje) { return }
  $zip = [IO.Path]::GetTempFileName() + '.zip'
  try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 180 -Headers $cab -Uri ($c.base + '/api/backup/aprendizado') -OutFile $zip | Out-Null
  } catch { Registrar 'Não consegui baixar os aprendizados; tento de novo daqui a pouco.'; return }
  $tmpDir = Join-Path ([IO.Path]::GetTempPath()) ('faro-aprendizado-' + [Guid]::NewGuid().ToString('N'))
  Expand-Archive -Path $zip -DestinationPath $tmpDir -Force
  $n = 0; $novos = 0
  # Copia só o que mudou e nunca apaga nada na pasta.
  Get-ChildItem $tmpDir -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($tmpDir.Length + 1)
    $alvo = Join-Path $c.destinoApr $rel
    New-Item -ItemType Directory -Force (Split-Path $alvo) | Out-Null
    $n++
    if ((-not (Test-Path $alvo)) -or ((Get-FileHash $_.FullName).Hash -ne (Get-FileHash $alvo).Hash)) { Copy-Item $_.FullName $alvo -Force; $novos++ }
  }
  Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item $zip -ErrorAction SilentlyContinue
  Set-Content $marca $hoje
  try { Invoke-RestMethod -Method Post -TimeoutSec 60 -Headers $cab -ContentType 'application/json' -Body (@{ arquivos = $n } | ConvertTo-Json) -Uri ($c.base + '/api/backup/aprendizado') | Out-Null } catch { Registrar 'Aprendizado guardado, mas não consegui avisar o FARO.' }
  Registrar ('Aprendizado guardado: ' + $n + ' arquivos (' + $novos + ' novos ou alterados)')
}

BackupCompleto
Aprendizado
'@
$arquivoRunner = Join-Path $dir 'faro-backup.ps1'
Set-Content $arquivoRunner $runner -Encoding UTF8

$argumento = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $arquivoRunner + '"'
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumento
$gatilhos = @(
  (New-ScheduledTaskTrigger -AtLogOn),
  (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15) -RepetitionDuration (New-TimeSpan -Days 3650))
)
$cfg = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'FARO Backup' -Action $acao -Trigger $gatilhos -Settings $cfg -Force | Out-Null

Write-Host 'Rodando o primeiro backup e o envio dos aprendizados agora...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $arquivoRunner -Modo forcar
if (Get-ChildItem $destino -Filter 'faro-backup-*.json' -ErrorAction SilentlyContinue) {
  Write-Host ('Pronto. Backup guardado em: ' + $destino)
  Write-Host ('Aprendizados (textos) em: ' + $destinoApr)
  Write-Host 'Dali em diante o computador confere a cada 15 minutos: faz o backup do dia e envia os aprendizados quando você pedir pelo botão.'
} else {
  Write-Host ('O primeiro backup não saiu. Veja o motivo em: ' + (Join-Path $dir 'backup.log'))
}
`.replace("__BASE__", base);
}
