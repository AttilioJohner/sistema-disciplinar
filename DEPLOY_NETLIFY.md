# 🚀 Deploy no Netlify - Sistema Disciplinar

## 📋 CONFIGURAÇÃO AUTOMÁTICA

O projeto está configurado para deploy automático no Netlify:

### 1. **Configuração Pronta** ✅
- `netlify.toml` configurado
- Build script otimizado  
- Headers de segurança
- Redirects para SPA
- 404 personalizado

---

## 🌐 COMO FAZER O DEPLOY

### **Opção 1: Deploy via Git (Recomendado)**

1. **Commit as mudanças**:
   ```bash
   git add .
   git commit -m "config: Netlify deploy configuration"
   git push origin main
   ```

2. **Acessar Netlify**:
   - Vá em https://netlify.com
   - Login/Cadastro
   - "New site from Git"

3. **Conectar repositório**:
   - GitHub: `AttilioJohner/sistema-disciplinar`
   - Branch: `main`
   - Build command: `npm run build` (auto-detectado)
   - Publish directory: `public` (auto-detectado)

4. **Deploy automático**: ✅ Pronto!

### **Opção 2: Deploy via CLI**
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=public
```

### **Opção 3: Drag & Drop Manual**
```bash
npm run build
# Arrastar pasta /public para netlify.com/drop
```

---

## ⚙️ CONFIGURAÇÕES NO NETLIFY

### **Environment Variables** (se necessário)
```
FIREBASE_API_KEY = sua_api_key
FIREBASE_PROJECT_ID = sistema-disciplinar
```

### **Custom Domain** (opcional)
- Site settings → Domain management
- Add custom domain

---

## 🔧 VANTAGENS DO NETLIFY

- ✅ **Deploy automático** via Git push
- ✅ **HTTPS gratuito** com Let's Encrypt  
- ✅ **CDN global** para performance
- ✅ **Preview deploys** para PRs
- ✅ **Rollback** fácil para versões anteriores
- ✅ **Forms & Functions** se precisar

---

## 🚨 IMPORTANTE

**Após deploy no Netlify**, ainda precisa configurar:

1. **Firebase Console**: Custom claims para usuários
2. **Firestore Rules**: Deploy das regras de segurança  
3. **Firestore Indexes**: Índices para performance

**Documentação completa**: `README.md` e `FIRESTORE_INDEXES.md`

---

## 📱 URL FINAL

Após deploy: `https://amazing-name-123456.netlify.app`

**Custom domain**: Configure em Site Settings se desejar.