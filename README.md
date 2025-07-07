# Sistema de Feedback de Funcionários

Sistema web responsivo para registro e gerenciamento de feedbacks de funcionários, com integração ao Google Sheets.

## 📋 Funcionalidades

### 🔐 Autenticação
- Login com dois níveis de acesso (usuário comum e administrador)
- Autenticação JWT com tokens seguros
- Sessões persistentes

### 📝 Registro de Feedbacks
- **Feedback Diário**: Avaliação com notas de 0 a 5 em atributos específicos por setor
- **Ocorrência Positiva**: Registro de eventos positivos
- **Ocorrência Negativa**: Registro de situações que precisam melhorar

### 🏢 Gestão de Setores e Funcionários
- 6 setores pré-configurados: Açougue, Padaria, Frente de Loja, Mercearia, Administrativo, Lanchonete
- Atributos de avaliação específicos por setor
- Cadastro e gerenciamento de funcionários

### 📊 Integração Google Sheets
- Sincronização automática de feedbacks
- Planilha estruturada com todos os dados
- Controle de sincronização

### 📱 Interface Responsiva
- Design otimizado para mobile
- Cores: branco principal com detalhes em vermelho e amarelo
- Interface intuitiva e limpa

## 🚀 Instalação

### Pré-requisitos
- Python 3.11+
- pip
- Git

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd feedback-system
```

2. **Crie e ative o ambiente virtual**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\\Scripts\\activate  # Windows
```

3. **Instale as dependências**
```bash
pip install -r requirements.txt
```

4. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

5. **Configure Google Sheets (opcional)**
- Siga as instruções em `GOOGLE_SHEETS_SETUP.md`
- Coloque o arquivo `credentials.json` na raiz do projeto

6. **Execute a aplicação**
```bash
python src/main.py
```

A aplicação estará disponível em `http://localhost:5000`

## 👥 Usuários Padrão

O sistema vem com usuários pré-configurados para teste:

- **Administrador**
  - Usuário: `admin`
  - Senha: `admin123`
  - Acesso: Todas as funcionalidades

- **Usuário Comum**
  - Usuário: `usuario`
  - Senha: `usuario123`
  - Acesso: Registro de feedbacks e visualização do próprio histórico

## 🏗️ Estrutura do Projeto

```
feedback-system/
├── src/
│   ├── models/
│   │   └── user.py          # Modelos de dados (User, Setor, Funcionario, Feedback)
│   ├── routes/
│   │   ├── user.py          # Rotas de autenticação e usuários
│   │   ├── setores.py       # Rotas de setores e funcionários
│   │   ├── feedback.py      # Rotas de feedbacks
│   │   └── sheets.py        # Rotas de integração Google Sheets
│   ├── static/
│   │   ├── index.html       # Interface principal
│   │   ├── styles.css       # Estilos responsivos
│   │   └── app.js           # Lógica JavaScript
│   ├── database/
│   │   └── app.db           # Banco SQLite
│   ├── auth.py              # Sistema de autenticação JWT
│   ├── google_sheets.py     # Integração Google Sheets
│   ├── init_data.py         # Dados iniciais do sistema
│   └── main.py              # Aplicação principal Flask
├── .env                     # Variáveis de ambiente
├── requirements.txt         # Dependências Python
├── credentials.json         # Credenciais Google Sheets (não incluído)
├── GOOGLE_SHEETS_SETUP.md   # Instruções Google Sheets
└── README.md               # Esta documentação
```

## 🔧 API Endpoints

### Autenticação
- `POST /api/login` - Login de usuário
- `GET /api/usuario/tipo` - Tipo do usuário logado

### Usuários
- `GET /api/users` - Listar usuários (admin)
- `POST /api/users` - Criar usuário (admin)
- `GET /api/users/{id}` - Obter usuário
- `PUT /api/users/{id}` - Atualizar usuário
- `DELETE /api/users/{id}` - Deletar usuário (admin)

### Setores e Funcionários
- `GET /api/setores` - Listar setores
- `GET /api/funcionarios` - Listar funcionários
- `GET /api/funcionarios?setor_id={id}` - Funcionários por setor
- `GET /api/atributos?setor_id={id}` - Atributos de avaliação por setor

### Feedbacks
- `POST /api/feedback` - Criar feedback
- `GET /api/feedback` - Listar feedbacks
- `GET /api/feedback/{id}` - Obter feedback específico
- `PUT /api/feedback/{id}` - Atualizar feedback
- `DELETE /api/feedback/{id}` - Deletar feedback
- `GET /api/feedback/stats` - Estatísticas de feedbacks

### Google Sheets
- `POST /api/google-sheets-sync` - Sincronizar feedbacks
- `GET /api/google-sheets/status` - Status de sincronização
- `POST /api/google-sheets/create` - Criar nova planilha
- `POST /api/google-sheets/test` - Testar conexão

## 📱 Fluxo de Uso

### Para Usuários Comuns

1. **Login**: Acesse com suas credenciais
2. **Novo Feedback**: Clique em "Novo Feedback"
3. **Selecionar Tipo**: Escolha entre Diário, Positiva ou Negativa
4. **Selecionar Setor**: Escolha o setor do funcionário
5. **Selecionar Funcionário**: Escolha o funcionário específico
6. **Preencher Feedback**:
   - **Diário**: Avalie cada atributo de 0 a 5
   - **Ocorrências**: Descreva a situação
7. **Salvar**: Confirme o feedback

### Para Administradores

Além das funcionalidades de usuário comum:

- **Administração**: Acesse o painel administrativo
- **Sincronizar Google Sheets**: Envie feedbacks para planilha
- **Estatísticas**: Visualize relatórios do sistema
- **Gerenciar Usuários**: Criar, editar e remover usuários

## 🎨 Design

### Cores
- **Principal**: Branco (#FFFFFF)
- **Destaque**: Vermelho (#e74c3c)
- **Secundário**: Amarelo/Laranja (#f39c12)
- **Texto**: Cinza escuro (#333333)

### Responsividade
- Design mobile-first
- Breakpoints para tablet e desktop
- Touch-friendly para dispositivos móveis
- Navegação intuitiva

## 🔒 Segurança

- Autenticação JWT com tokens seguros
- Validação de dados no backend
- Controle de acesso baseado em roles
- Sanitização de inputs
- CORS configurado adequadamente

## 📊 Google Sheets

### Estrutura da Planilha
- **ID**: Identificador único do feedback
- **Data/Hora**: Timestamp do feedback
- **Tipo Feedback**: diário, positiva ou negativa
- **Setor**: Setor do funcionário
- **Funcionário**: Nome do funcionário
- **Autor**: Quem criou o feedback
- **Avaliações/Descrição**: Conteúdo do feedback
- **Detalhes**: Informações formatadas

### Configuração
1. Siga as instruções em `GOOGLE_SHEETS_SETUP.md`
2. Configure as credenciais do Google Cloud
3. Compartilhe a planilha com o Service Account
4. Use os endpoints da API para sincronizar

## 🚀 Deploy

### Opções de Deploy

1. **Heroku**
2. **Railway**
3. **DigitalOcean App Platform**
4. **AWS Elastic Beanstalk**
5. **Google Cloud Run**

### Preparação para Deploy

1. **Atualize requirements.txt**
```bash
pip freeze > requirements.txt
```

2. **Configure variáveis de ambiente**
- `SECRET_KEY`: Chave secreta da aplicação
- `JWT_SECRET_KEY`: Chave secreta JWT
- `GOOGLE_SHEETS_CREDENTIALS_FILE`: Caminho para credenciais
- `GOOGLE_SHEETS_SPREADSHEET_ID`: ID da planilha

3. **Configure banco de dados**
- Para produção, considere PostgreSQL ou MySQL
- Atualize `DATABASE_URL` no `.env`

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de autenticação Google Sheets**
   - Verifique se as APIs estão habilitadas
   - Confirme se o arquivo credentials.json está correto
   - Teste a conexão com `/api/google-sheets/test`

2. **Erro de CORS**
   - Verifique se CORS está configurado no Flask
   - Confirme se a origem está permitida

3. **Banco de dados não encontrado**
   - Execute a aplicação uma vez para criar o banco
   - Verifique permissões de escrita no diretório

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação
- Verifique os logs da aplicação

---

**Desenvolvido com ❤️ para facilitar o feedback e melhorar o ambiente de trabalho.**

