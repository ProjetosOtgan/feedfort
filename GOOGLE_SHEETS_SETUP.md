# Configuração do Google Sheets

## Pré-requisitos

1. Conta Google com acesso ao Google Cloud Console
2. Projeto no Google Cloud Platform

## Passos para Configuração

### 1. Criar Service Account

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione seu projeto ou crie um novo
3. Vá para "IAM & Admin" > "Service Accounts"
4. Clique em "Create Service Account"
5. Preencha os dados:
   - Nome: `feedback-system-sheets`
   - Descrição: `Service account para sistema de feedback`
6. Clique em "Create and Continue"
7. Adicione a role "Editor" ou "Owner"
8. Clique em "Done"

### 2. Gerar Chave JSON

1. Na lista de Service Accounts, clique no email da conta criada
2. Vá para a aba "Keys"
3. Clique em "Add Key" > "Create new key"
4. Selecione "JSON" e clique em "Create"
5. O arquivo será baixado automaticamente

### 3. Habilitar APIs

1. No Google Cloud Console, vá para "APIs & Services" > "Library"
2. Procure e habilite as seguintes APIs:
   - Google Sheets API
   - Google Drive API

### 4. Configurar no Sistema

1. Renomeie o arquivo JSON baixado para `credentials.json`
2. Coloque o arquivo na raiz do projeto (mesmo diretório do main.py)
3. Atualize o arquivo `.env` com o ID da planilha (opcional):
   ```
   GOOGLE_SHEETS_SPREADSHEET_ID=seu_spreadsheet_id_aqui
   ```

### 5. Criar Planilha (Opcional)

Você pode:
- Usar o endpoint `/api/google-sheets/create` para criar uma nova planilha
- Ou criar manualmente no Google Sheets e usar o ID na configuração

### 6. Compartilhar Planilha

1. Abra a planilha no Google Sheets
2. Clique em "Compartilhar"
3. Adicione o email do Service Account (encontrado no arquivo credentials.json)
4. Dê permissão de "Editor"

## Endpoints Disponíveis

- `POST /api/google-sheets-sync` - Sincronizar feedbacks
- `GET /api/google-sheets/status` - Status de sincronização
- `POST /api/google-sheets/create` - Criar nova planilha
- `POST /api/google-sheets/test` - Testar conexão
- `GET /api/google-sheets/config` - Ver configuração atual
- `POST /api/google-sheets/config` - Atualizar configuração

## Estrutura da Planilha

A planilha terá as seguintes colunas:
- ID: Identificador único do feedback
- Data/Hora: Quando o feedback foi criado
- Tipo Feedback: diário, positiva ou negativa
- Setor: Setor do funcionário
- Funcionário: Nome do funcionário
- Autor: Quem criou o feedback
- Avaliações/Descrição: Notas ou descrição do feedback
- Detalhes: Informações adicionais formatadas

## Troubleshooting

### Erro de Autenticação
- Verifique se o arquivo `credentials.json` está no local correto
- Confirme se as APIs estão habilitadas
- Verifique se o Service Account tem as permissões necessárias

### Erro de Acesso à Planilha
- Confirme se a planilha foi compartilhada com o Service Account
- Verifique se o ID da planilha está correto
- Teste a conexão usando o endpoint `/api/google-sheets/test`

