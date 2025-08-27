# 🚀 Deploy Sistema Disciplinar - LionUseCloser

## 📍 SITUAÇÃO ATUAL
- **Repositório GitHub**: LionGab/LionUseCloser
- **Netlify Site**: usecloser.com.br
- **Path do Sistema**: https://usecloser.com.br/sistema-disciplinar

## 🔧 ESTRUTURA DO REPOSITÓRIO

O repositório **LionGab/LionUseCloser** deve ter esta estrutura:

```
LionUseCloser/
├── sistema-disciplinar/     # Pasta do sistema disciplinar
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   ├── pages/
│   └── components/
├── netlify/
│   └── functions/
│       └── api.js          # API serverless
├── netlify.toml            # Configuração Netlify
├── package.json
└── .env.example
```

## 📝 PASSOS PARA CONFIGURAR

### 1. Clone o repositório correto
```bash
git clone https://github.com/LionGab/LionUseCloser.git
cd LionUseCloser
```

### 2. Crie a estrutura de pastas
```bash
# Criar pasta sistema-disciplinar
mkdir -p sistema-disciplinar
mkdir -p netlify/functions

# Copiar arquivos do sistema para sistema-disciplinar/
cp -r [arquivos-do-sistema] sistema-disciplinar/
```

### 3. Adicione os arquivos na raiz do LionUseCloser

#### `netlify.toml` (raiz)
```toml
[build]
  command = "npm install && npm run build"
  publish = "."
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/sistema-disciplinar/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

[[headers]]
  for = "/sistema-disciplinar/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

#### `package.json` (raiz)
```json
{
  "name": "lionusecloser",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Build complete'",
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

### 4. Configure no Netlify Dashboard

**Site settings → Environment variables:**
```
DATABASE_URL=postgresql://[sua-url-neondb]
JWT_SECRET=[sua-chave-secreta-32-chars]
```

### 5. Commit e Push
```bash
git add .
git commit -m "feat: Sistema Disciplinar em /sistema-disciplinar"
git push origin main
```

## 🎯 URLS FINAIS

- **Home**: https://usecloser.com.br
- **Sistema Disciplinar**: https://usecloser.com.br/sistema-disciplinar
- **API**: https://usecloser.com.br/.netlify/functions/api

## 🔑 IMPORTANTE

No arquivo `sistema-disciplinar/assets/js/api-client.js`, ajuste:
```javascript
this.baseURL = '/sistema-disciplinar/api';
```

No arquivo `sistema-disciplinar/index.html`, ajuste paths:
```html
<link href="./assets/css/style.css" rel="stylesheet">
<script src="./assets/js/api-client.js"></script>
```

Em `sistema-disciplinar/pages/login.html`, ajuste redirecionamento:
```javascript
window.location.href = '/sistema-disciplinar/index.html';
```

## ✅ CHECKLIST FINAL

- [ ] Repositório LionGab/LionUseCloser clonado
- [ ] Pasta sistema-disciplinar/ criada
- [ ] Arquivos movidos para sistema-disciplinar/
- [ ] netlify.toml na raiz
- [ ] package.json na raiz
- [ ] netlify/functions/api.js criado
- [ ] Environment variables configuradas no Netlify
- [ ] Paths ajustados nos arquivos HTML/JS
- [ ] Git push feito

## 🚨 TROUBLESHOOTING

### 404 em /sistema-disciplinar
- Verificar se a pasta existe no repositório
- Confirmar netlify.toml está na raiz

### API não funciona
- Verificar DATABASE_URL no Netlify
- Confirmar que netlify/functions/api.js existe

### Login não redireciona
- Ajustar paths em login.html
- Verificar api-client.js

---

**Após seguir estes passos, o sistema estará em:**
**https://usecloser.com.br/sistema-disciplinar**