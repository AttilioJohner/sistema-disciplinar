# 🚀 Deploy Sistema Disciplinar - usecloser.com.br

## ✅ CHECKLIST RÁPIDO

### 1. **Configurar NeonDB**
1. Acesse [NeonDB Console](https://console.neon.tech)
2. Copie sua `DATABASE_URL` (formato: `postgresql://user:pass@host/dbname`)
3. Guarde para usar no Netlify

### 2. **Configurar Netlify Environment Variables**
No Netlify Dashboard → Site Settings → Environment Variables:

```bash
DATABASE_URL=postgresql://seu_usuario:sua_senha@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=uma-senha-secreta-com-pelo-menos-32-caracteres-aqui
```

### 3. **Deploy via Git**
```bash
# Commit tudo
git add .
git commit -m "feat: Sistema com NeonDB para usecloser.com.br"
git push origin main
```

### 4. **No Netlify Dashboard**
1. Import from Git → GitHub
2. Repository: `AttilioJohner/sistema-disciplinar`
3. Deploy settings já configuradas no netlify.toml
4. Deploy!

### 5. **Configurar Banco de Dados**
Após o deploy, no terminal local:
```bash
# Instalar dependências
npm install

# Criar arquivo .env local
echo "DATABASE_URL=sua_url_aqui" > .env
echo "JWT_SECRET=sua_senha_secreta" >> .env

# Rodar migrações
npm run db:migrate

# Popular com dados iniciais
npm run db:seed
```

## 📧 CREDENCIAIS PADRÃO

Após rodar o seed, você terá:
- **Admin**: admin@escola.com / admin123
- **Professor**: professor1@escola.com / prof123
- **Gestor**: gestor@escola.com / gestor123

## 🌐 URLS DO SISTEMA

- **Produção**: https://usecloser.com.br
- **API**: https://usecloser.com.br/.netlify/functions/api
- **Netlify Dashboard**: https://app.netlify.com/teams/liongab

## 🔧 COMANDOS ÚTEIS

```bash
# Desenvolvimento local
npm run dev

# Build
npm run build

# Migrações do banco
npm run db:migrate

# Popular dados de teste
npm run db:seed
```

## 📊 ESTRUTURA DO BANCO (NeonDB)

### Tabelas criadas automaticamente:
- **users** - Usuários do sistema (admin, professor, gestor)
- **alunos** - Cadastro de alunos
- **medidas** - Medidas disciplinares
- **frequencia** - Registro de frequências

## 🔒 SEGURANÇA

- ✅ JWT para autenticação
- ✅ Senhas com bcrypt
- ✅ HTTPS automático (Netlify)
- ✅ Headers de segurança configurados
- ✅ PostgreSQL com SSL obrigatório

## 📱 ENDPOINTS DA API

### Públicos
- `POST /api/login` - Login no sistema

### Protegidos (requer token JWT)
- `GET /api/alunos` - Listar alunos
- `POST /api/alunos` - Criar aluno
- `GET /api/medidas` - Listar medidas
- `POST /api/medidas` - Criar medida
- `GET /api/frequencia` - Listar frequências
- `POST /api/frequencia` - Registrar frequências
- `GET /api/dashboard` - Estatísticas do dashboard

## 🐛 TROUBLESHOOTING

### Erro de conexão com banco
- Verifique DATABASE_URL no Netlify Environment Variables
- Confirme que o NeonDB está ativo

### Erro 401 (Não autorizado)
- Token expirado - fazer login novamente
- Verificar se o usuário tem role adequado

### Build falha no Netlify
- Verificar logs em Netlify Dashboard → Deploys
- Geralmente é falta de environment variables

## 🎉 PRONTO!

Após seguir estes passos, seu sistema estará rodando em:
**https://usecloser.com.br**

---

*Última atualização: Dezembro 2024*