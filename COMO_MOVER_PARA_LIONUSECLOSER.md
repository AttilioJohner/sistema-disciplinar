# 📦 COMO MOVER ESTE PROJETO PARA LionGab/LionUseCloser

## 🎯 OBJETIVO
Mover o sistema-disciplinar para funcionar em:
**https://usecloser.com.br/sistema-disciplinar**

## 📝 PASSO A PASSO SIMPLES

### 1️⃣ Clone o repositório do Netlify
```bash
git clone https://github.com/LionGab/LionUseCloser.git
cd LionUseCloser
```

### 2️⃣ Crie a estrutura necessária
```bash
# Criar pasta para o sistema disciplinar
mkdir -p sistema-disciplinar

# Criar pasta para as funções serverless
mkdir -p netlify/functions
```

### 3️⃣ Copie os arquivos deste projeto
```bash
# Copie estas pastas para LionUseCloser/sistema-disciplinar/
- assets/
- pages/
- components/
- index.html

# Copie a API para LionUseCloser/netlify/functions/
- netlify/functions/api.js

# Copie scripts para LionUseCloser/scripts/
- scripts/migrate.js
- scripts/seed.js
```

### 4️⃣ Adicione estes arquivos na RAIZ do LionUseCloser

**LionUseCloser/package.json:**
```json
{
  "name": "lionusecloser",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'No build needed'",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.7.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.4.5"
  }
}
```

**LionUseCloser/netlify.toml:**
```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/sistema-disciplinar/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

### 5️⃣ Configure as variáveis no Netlify
No Netlify Dashboard → Site Settings → Environment Variables:
```
DATABASE_URL = [sua URL do NeonDB]
JWT_SECRET = [uma senha de 32+ caracteres]
```

### 6️⃣ Commit e Push
```bash
git add .
git commit -m "feat: Sistema Disciplinar adicionado"
git push origin main
```

## ✅ ESTRUTURA FINAL

```
LionUseCloser/
├── sistema-disciplinar/
│   ├── index.html
│   ├── assets/
│   ├── pages/
│   └── components/
├── netlify/
│   └── functions/
│       └── api.js
├── scripts/
│   ├── migrate.js
│   └── seed.js
├── netlify.toml
└── package.json
```

## 🚀 PRONTO!

Após o push, o Netlify fará o deploy automático e o sistema estará em:
**https://usecloser.com.br/sistema-disciplinar**

## 🔧 CONFIGURAR O BANCO

Depois do deploy:
```bash
# No seu computador
npm install
npm run db:migrate
npm run db:seed
```

## 📧 LOGINS PADRÃO
- admin@escola.com / admin123
- professor1@escola.com / prof123
- gestor@escola.com / gestor123