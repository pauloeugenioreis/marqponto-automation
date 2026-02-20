# ============================================================
# Configura tarefas agendadas para batida de ponto automática
# Executa de segunda a sexta nos horários de Brasília:
#   10:00, 13:00, 14:00, 19:00
#
# Execute como Administrador:
#   powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
# ============================================================

$projectDir = "C:\ProjetosGit\Pessoal\agentMarqPontoApp"
$nodePath = "C:\Users\Paulo\AppData\Local\nvm\v22.17.0\node.exe"
$scriptPath = "src\index.js"

$horarios = @("10:00", "13:00", "14:00", "19:00")
$nomes = @("Entrada", "Almoco_Saida", "Almoco_Retorno", "Saida")

Write-Host "=== Configurando agendamento de ponto ===" -ForegroundColor Cyan
Write-Host "Diretório: $projectDir"
Write-Host "Node: $nodePath"
Write-Host ""

# Verifica se o Node existe
if (-Not (Test-Path $nodePath)) {
    Write-Host "ERRO: Node não encontrado em $nodePath" -ForegroundColor Red
    Write-Host "Verifique o caminho do Node com: nvm which 22.17.0" -ForegroundColor Yellow
    exit 1
}

for ($i = 0; $i -lt $horarios.Count; $i++) {
    $horario = $horarios[$i]
    $nome = $nomes[$i]
    $taskName = "MarqPonto_$nome"

    Write-Host "Criando tarefa: $taskName às $horario (Seg-Sex)..." -ForegroundColor Green

    # Remove tarefa existente se houver
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "  Tarefa anterior removida" -ForegroundColor Yellow
    }

    # Ação: executar node src/index.js
    $action = New-ScheduledTaskAction `
        -Execute $nodePath `
        -Argument $scriptPath `
        -WorkingDirectory $projectDir

    # Gatilho: segunda a sexta no horário especificado
    $trigger = New-ScheduledTaskTrigger `
        -Weekly `
        -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday `
        -At $horario

    # Configurações: permite rodar com bateria, não parar se demorar
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

    # Registra a tarefa (roda com o usuário logado)
    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description "Batida de ponto MarqPonto - $nome ($horario)" `
        -RunLevel Limited

    Write-Host "  OK!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Tarefas criadas com sucesso! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verificando tarefas:" -ForegroundColor Cyan
Get-ScheduledTask | Where-Object { $_.TaskName -like "MarqPonto_*" } | Format-Table TaskName, State, @{N="NextRun"; E={(Get-ScheduledTaskInfo $_).NextRunTime}} -AutoSize

Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Yellow
Write-Host "  Ver tarefas:    Get-ScheduledTask | Where-Object { `$_.TaskName -like 'MarqPonto_*' }"
Write-Host "  Testar agora:   Start-ScheduledTask -TaskName 'MarqPonto_Entrada'"
Write-Host "  Remover todas:  Get-ScheduledTask | Where-Object { `$_.TaskName -like 'MarqPonto_*' } | Unregister-ScheduledTask"
