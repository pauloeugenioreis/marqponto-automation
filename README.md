# MarqPonto - Automação de Batida de Ponto

Automatiza o registro de ponto na plataforma **MarqPonto** com login simples, notificações por **Telegram** e controle de datas via bot.

## Funcionalidades

- Login automático no MarqPonto
- Registro automático do ponto
- **Bot Telegram** — receba notificações e controle o ponto pelo celular
- **Deploy em VPS** — execução via cron nativo, sem delay
- **GitHub Actions** — execução manual na nuvem (dispatch)
- Agendamento local via Windows Task Scheduler (opcional)
- **Modo Dry Run** — testa login sem clicar no botão de ponto
- **Retry automático** — até 3 tentativas com intervalo de 30s em caso de falha
- Logs em arquivo e console (rotativo, 5MB × 5 arquivos)
- **Limpeza mensal de logs** — remove arquivos em `logs/` com mais de 30 dias (rodada automaticamente na primeira execução de cada mês)
- Modo debug com screenshots

## Bot Telegram — Comandos

Quando **SISTEMA_PONTO** está definido (ex: `Irede`), os comandos usam o prefixo em minúsculas com underscore: `/irede_desativar`, `/irede_reativar`, etc. Caso contrário, use `/desativar`, `/reativar`, etc.

| Comando (com prefixo, ex: Irede) | Comando (sem prefixo) | Ação |
|---|---|---|
| `/irede_desativar DD/MM/YYYY` | `/desativar DD/MM/YYYY` | Pula o ponto nessa data |
| `/irede_reativar DD/MM/YYYY` | `/reativar DD/MM/YYYY` | Cancela um desativar |
| `/irede_status` | `/status` | Verifica se hoje está ativo |
| `/irede_listar` | `/listar` | Mostra datas desativadas |

**Notificações automáticas:**
- ✅ Ponto registrado com sucesso
- ❌ Erro ao bater ponto (após 3 tentativas)
- ⚠️ Tentativa falhou, retentando em 30s
- ⏸️ Ponto desativado para hoje

O horário exibido nas mensagens do Telegram é o de **Manaus** (America/Manaus).

> **Nota:** As datas desativadas são persistidas em um GitHub Gist, sem limite de tempo. Datas passadas são removidas automaticamente.

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar credenciais

Copie o template e preencha com seus dados:

```bash
cp .env.example .env
```

Edite o `.env` (o arquivo `.env.example` traz o template completo):

```env
# Nome do sistema (prefixo nas mensagens e nos comandos do Telegram, ex: "Irede" → "Irede - Ponto registrado!" e /irede_desativar)
SISTEMA_PONTO=Irede

# Credenciais MarqPonto
MARQPONTO_USER=seu.email@empresa.com.br
MARQPONTO_PASS=sua_senha

# URLs do MarqPonto
LOGIN_URL=https://web.marqponto.com.br/
PONTO_URL=https://web.marqponto.com.br/clock-ins

# Telegram (notificações e comandos)
TELEGRAM_BOT_TOKEN=token_do_botfather
TELEGRAM_CHAT_ID=seu_chat_id

# GitHub Gist (persistência de datas desativadas)
GH_GIST_TOKEN=token_com_scope_gist
GIST_ID=id_do_gist_secreto

# Geolocalização (por dia da semana — Seg/Ter/Qua e Qui/Sex podem ter coordenadas diferentes)
GEO_LAT_SEG_TER_QUA=-3.0920902438448383
GEO_LNG_SEG_TER_QUA=-60.00604977562166
GEO_LAT_QUI_SEX=-3.054679
GEO_LNG_QUI_SEX=-60.032772

# Apenas para VPS (deixe em branco localmente)
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

> **PUPPETEER_EXECUTABLE_PATH**: Necessário apenas em servidores Linux (DigitalOcean, Oracle Cloud, etc). Localmente e no GitHub Actions, deixe em branco — o Puppeteer usa o Chromium bundled.

> **Telegram**: Crie um bot com @BotFather e obtenha seu Chat ID com @userinfobot.

> **Gist**: Crie um token em github.com/settings/tokens/new (scope: gist) e um Gist secreto com arquivo `app-marqponto-disabled-dates.json` contendo `[]`.

> **Geolocalização**: Pegue as coordenadas no Google Maps (botão direito → copie as coordenadas do seu escritório).

### 3. Executar

```bash
# Modo normal (headless)
npm start

# Ver o browser aberto
npm run start:visible

# Debug (browser aberto + screenshots em logs/)
npm run debug

# Dry Run (faz tudo menos clicar no botão de ponto)
# Windows PowerShell:
$env:DRY_RUN="true"; node src/index.js
# Linux/Mac:
DRY_RUN=true node src/index.js
```

## GitHub Actions + cron-job.org (execução automática na nuvem)

Esta abordagem usa três componentes em conjunto:

- **GitHub Container Registry (GHCR)** — armazena a imagem Docker com o timezone correto (America/Manaus)
- **GitHub Actions** (`workflow_dispatch`) — executa o script quando acionado
- **console.cron-job.org** — dispara o workflow nos horários exatos via API do GitHub (gratuito, sem delay)

> **Por que não usar o `schedule` nativo do Actions?** O GitHub pode atrasar execuções agendadas em até 60 minutos em contas gratuitas. O cron-job.org resolve isso chamando a API no horário certo.

---

### Passo 1 — Criar um Personal Access Token (PAT) no GitHub

O mesmo token serve para duas coisas: **fazer push da imagem Docker** e **o cron-job.org acionar o workflow**.

1. Acesse [github.com](https://github.com) → clique no seu **avatar** (canto superior direito) → **Settings**
2. Role até o final da página → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Clique em **Generate new token (classic)**
4. Preencha:
   - **Note:** `marqponto-automation`
   - **Expiration:** escolha conforme preferir (sem expiração é o mais prático para automação)
   - **Scopes:** marque:
     - ✅ `repo` — permite acionar o `workflow_dispatch` via API
     - ✅ `write:packages` — permite enviar a imagem Docker para o GHCR
5. Clique em **Generate token**
6. **Copie o token imediatamente** — ele não será exibido novamente. Guarde em local seguro.

> Este é o `SEU_TOKEN_GITHUB` usado nos comandos abaixo.

---

### Passo 2 — Criar as credenciais e configurar no repositório

#### 2.1 — Criar o bot Telegram e obter o token e Chat ID

O bot é usado para enviar notificações (ponto registrado, erros) e receber comandos (`/desativar`, `/status`, etc.).

**Criar o bot:**
1. Abra o Telegram e pesquise por **@BotFather**
2. Envie `/newbot`
3. Escolha um nome para exibição (ex: `Meu Ponto Bot`)
4. Escolha um username único terminado em `bot` (ex: `meuponto_bot`)
5. O BotFather retornará o **token** no formato `123456789:ABCdef...` — copie e guarde

**Obter o Chat ID:**
1. Pesquise por **@userinfobot** no Telegram
2. Inicie uma conversa com `/start`
3. Ele retornará seu **Id** numérico (ex: `987654321`) — este é o `TELEGRAM_CHAT_ID`

> Antes de usar, envie qualquer mensagem para o seu bot (ex: `/start`), caso contrário ele pode retornar "chat not found".

---

#### 2.2 — Criar o GitHub Gist para persistência das datas desativadas

O Gist armazena as datas em que o ponto foi desativado via comando Telegram (ex: feriados, folgas).

**Criar o Gist:**
1. Acesse [gist.github.com](https://gist.github.com)
2. No campo **Filename**, digite exatamente: `app-marqponto-disabled-dates.json`
3. No conteúdo, coloque: `[]`
4. Selecione **Secret gist** (não público)
5. Clique em **Create secret gist**
6. Na URL do Gist criado (ex: `https://gist.github.com/SEU_USUARIO/abc123def456`), o trecho após o último `/` é o `GIST_ID` — copie e guarde

**O token para o Gist** (`GH_GIST_TOKEN`): pode usar o mesmo PAT criado no **Passo 1** (ele já tem scope `repo` que inclui acesso a Gists), ou criar um token separado com scope apenas `gist` em **github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)**.

---

#### 2.3 — Adicionar os Secrets e Variables no repositório

No seu repositório (fork), acesse **Settings → Secrets and variables → Actions**.

**Secrets** (dados sensíveis — ficam ocultos nos logs):

| Secret | Valor |
|---|---|
| `MARQPONTO_USER` | Seu e-mail MarqPonto |
| `MARQPONTO_PASS` | Sua senha |
| `TELEGRAM_BOT_TOKEN` | Token obtido no Passo 2.1 |
| `TELEGRAM_CHAT_ID` | Chat ID obtido no Passo 2.1 |
| `GH_GIST_TOKEN` | PAT do Passo 1 (ou token com scope `gist`) |
| `GIST_ID` | ID do Gist criado no Passo 2.2 |

**Variables** (dados não-sensíveis — visíveis nos logs):

| Variable | Exemplo |
|---|---|
| `SISTEMA_PONTO` | `Irede` |
| `LOGIN_URL` | `https://web.marqponto.com.br` |
| `PONTO_URL` | `https://web.marqponto.com.br/clock-ins` |
| `GEO_LAT_SEG_TER_QUA` | `-3.0920902438448383` |
| `GEO_LNG_SEG_TER_QUA` | `-60.00604977562166` |
| `GEO_LAT_QUI_SEX` | `-3.054679` |
| `GEO_LNG_QUI_SEX` | `-60.032772` |
| `DRY_RUN` | (opcional) `true` para simular sem clicar no botão |

---

### Passo 3 — Build e push da imagem Docker para o GHCR

Execute os comandos abaixo na **raiz do projeto**, com Docker instalado e rodando.  
Substitua `SEU_USUARIO_GITHUB` pelo seu usuário do GitHub (tudo em **minúsculas**).

```bash
# 1. Autentique no GHCR com o token criado no Passo 1
echo "SEU_TOKEN_GITHUB" | docker login ghcr.io -u SEU_USUARIO_GITHUB --password-stdin

# 2. Build da imagem (com timezone America/Manaus configurado)
docker build -f Dockerfile.actions -t marqponto-automation:tz-manaus .

# 3. Tag apontando para o GHCR
docker tag marqponto-automation:tz-manaus ghcr.io/SEU_USUARIO_GITHUB/marqponto-automation:tz-manaus

# 4. Envio da imagem para o GHCR
docker push ghcr.io/SEU_USUARIO_GITHUB/marqponto-automation:tz-manaus
```

---

### Passo 4 — Vincular o package ao repositório (evita erro `unauthorized`)

Após o push, o package é criado na sua conta, mas o Actions ainda não tem permissão de acessá-lo.

1. Acesse [github.com](https://github.com) → clique no seu **avatar** → **Your profile** → aba **Packages**
2. Clique no package `marqponto-automation`
3. No lado direito → **Package settings**
4. Em **Manage Actions access**, clique em **Add repository** e selecione o repositório `marqponto-automation`
5. Defina a permissão como **Read**

> Sem este passo, o `docker pull` dentro do Actions falhará com `unauthorized` ou `denied`.

---

### Passo 5 — Testar o workflow manualmente

Antes de configurar o cron, confirme que tudo funciona:

1. No repositório, acesse a aba **Actions**
2. Na lista à esquerda, clique em **"Batida de Ponto MarqPonto"**
3. Clique em **Run workflow** → **Run workflow**
4. Aguarde a execução e verifique os logs

Se houver falha, baixe os screenshots de debug na seção **Artifacts** da execução para diagnosticar.

---

### Passo 6 — Configurar o cron-job.org para disparar o workflow

O cron-job.org chamará a API do GitHub para acionar o workflow exatamente nos horários desejados.

#### 6.1 Criar a conta e o cronjob

1. Acesse [console.cron-job.org](https://console.cron-job.org) e crie uma conta gratuita
2. Clique em **Create cronjob**

#### 6.2 Configurar a requisição

Preencha os campos conforme abaixo (substitua `SEU_USUARIO_GITHUB` e `SEU_TOKEN_GITHUB`):

**URL:**
```
https://api.github.com/repos/SEU_USUARIO_GITHUB/marqponto-automation/actions/workflows/ponto.yml/dispatches
```

**Method:** `POST`

**Headers** (adicione um a um em "Request headers"):
```
Authorization: Bearer SEU_TOKEN_GITHUB
Accept: application/vnd.github+json
Content-Type: application/json
X-GitHub-Api-Version: 2022-11-28
```

**Request body:**
```json
{"ref": "main"}
```

#### 6.3 Definir os horários

Crie **um cronjob separado para cada batida**, marcando apenas dias **1–5 (Seg–Sex)**.

**Configurar o timezone (importante):** no formulário do cronjob, clique em **Advanced** e defina o campo **Timezone** como `America/Manaus`. Assim os horários abaixo são inseridos diretamente no horário de Manaus, sem precisar converter para UTC:

| Horário (Manaus) | Batida |
|---|---|
| 08:00 | Entrada |
| 12:00 | Saída almoço |
| 13:01 | Retorno almoço |
| 17:00 | Saída |

> O horário **13:01** (e não 13:00) evita colisão com o cronjob das 13:00 caso o de saída do almoço atrase.

#### 6.4 Testar antes de salvar

Após preencher, clique em **Test run** — a resposta deve ser `204 No Content`, confirmando que a API acionou o workflow com sucesso.

> O workflow acionado aparecerá em tempo real na aba **Actions** do seu repositório.

## Deploy em VPS (DigitalOcean, Oracle Cloud, etc.) — Recomendado

Método recomendado de execução — cron nativo, sem delay.

1. Crie uma VM com **Ubuntu 24.04 LTS** (mínimo 1GB RAM para Puppeteer)
2. Instale Node.js + Chromium:
   ```bash
   apt update && apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
   apt install -y nodejs chromium-browser
   ```
3. Configure SSH key para o GitHub ([veja como](#configurar-ssh-key)):
   ```bash
   ssh-keygen -t ed25519 -C "seu@email.com" -f ~/.ssh/id_ed25519 -N ""
   cat ~/.ssh/id_ed25519.pub  # adicione em github.com → Settings → SSH keys
   ```
4. Clone e configure:
   ```bash
   cd /opt
   git clone git@github.com:<usuario>/<repo>.git app
   cd app
   npm ci
   cp .env.example .env
   nano .env  # preencha as variáveis + PUPPETEER_EXECUTABLE_PATH
   ```
5. Verifique o path do Chromium:
   ```bash
   which chromium-browser || which chromium
   # Use o resultado como valor de PUPPETEER_EXECUTABLE_PATH no .env
   ```
6. Teste antes de configurar o cron:
   ```bash
   DRY_RUN=true node src/index.js
   ```
7. Configure o cron (horários em UTC, Brasília = UTC-3):
   ```bash
   crontab -e
   # Adicione:
   0 13 * * 1-5 cd /opt/app && /usr/bin/node src/index.js >> /opt/app/logs/cron.log 2>&1
   0 16 * * 1-5 cd /opt/app && /usr/bin/node src/index.js >> /opt/app/logs/cron.log 2>&1
   0 17 * * 1-5 cd /opt/app && /usr/bin/node src/index.js >> /opt/app/logs/cron.log 2>&1
   0 22 * * 1-5 cd /opt/app && /usr/bin/node src/index.js >> /opt/app/logs/cron.log 2>&1
   ```

| Cron (UTC) | Brasília | Manaus | Batida |
|---|---|---|---|
| 0 13 | 10:00 | 09:00 | Entrada |
| 0 16 | 13:00 | 12:00 | Saída almoço |
| 0 17 | 14:00 | 13:00 | Retorno almoço |
| 0 22 | 19:00 | 18:00 | Saída |

> **Dica:** Para definir o fuso da VM: Brasília — `timedatectl set-timezone America/Sao_Paulo` | Manaus — `timedatectl set-timezone America/Manaus`

## Agendamento local (Windows — opcional)

Execute como Administrador:

```powershell
powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
```

Cria tarefas às 10:00, 13:00, 14:00 e 19:00 (Seg-Sex, horário de Brasília).

## Estrutura

```
├── .env.example              # Template de configuração
├── .github/
│   └── workflows/
│       └── ponto.yml         # GitHub Actions workflow (dispatch manual)
├── .gitignore
├── package.json
├── setup-schedule.ps1        # Agendamento Windows
├── README.md
└── src/
    ├── bot.js                # Comandos Telegram + verificação de datas
    ├── config.js             # Configurações centralizadas (.env)
    ├── gist-storage.js       # Persistência de datas desativadas via GitHub Gist
    ├── index.js              # Script principal (login → ponto + retry)
    ├── log-cleanup.js        # Limpeza mensal de arquivos em logs/ (retenção 30 dias)
    ├── logger.js             # Logger com Winston (console + arquivo rotativo)
    └── notify.js             # Notificações Telegram (horário em Manaus)
```

## Troubleshooting

- **Seletores errados?** Execute com `npm run debug` e veja os screenshots em `logs/`
- **Timeout?** Aumente o valor de `timeout` em `src/config.js` (padrão: 60s)
- **Telegram "chat not found"?** Mande qualquer mensagem para o bot antes de usar
- **GitHub Actions falha?** Verifique os secrets e os logs na aba Actions
- **VPS: Chromium não encontrado?** Rode `which chromium-browser || which chromium` e ajuste `PUPPETEER_EXECUTABLE_PATH` no `.env`
- **VPS: Erro intermitente?** O retry automático tenta até 3 vezes. Verifique os logs em `/opt/app/logs/cron.log`
- **Botão de ponto não encontrado?** O script busca pelo ID `register-point-button`. Se a estrutura da página mudar, verifique os screenshots em modo debug.

## Aviso

Este script é para uso pessoal. Use com responsabilidade e de acordo com as políticas da sua empresa.
