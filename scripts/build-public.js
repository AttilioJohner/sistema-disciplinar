const fs = require('fs');
const path = require('path');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

console.log('🏗️  Construindo /public para produção...');
ensureDir('public');

const itemsToCopy = ['index.html','assets','pages','components'];

function copyRecursive(src, dest){
  const st = fs.statSync(src);
  if(st.isDirectory()){
    ensureDir(dest);
    for(const f of fs.readdirSync(src)){
      copyRecursive(path.join(src,f), path.join(dest,f));
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

for(const item of itemsToCopy){
  if(fs.existsSync(item)){
    console.log(`📂 Copiando ${item}...`);
    copyRecursive(item, path.join('public', item));
  } else {
    console.log(`⚠️  ${item} não encontrado, pulando...`);
  }
}

// 404 personalizado para GitHub Pages e Netlify
const notFound = path.join('public','404.html');
if(!fs.existsSync(notFound)){
  const html404 = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>404 - Página Não Encontrada | Sistema Disciplinar</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,segoe ui,Roboto,sans-serif;margin:0;padding:40px;text-align:center;background:#f5f5f5}
    .container{max-width:400px;margin:0 auto;background:white;padding:40px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
    h1{color:#d73527;margin-bottom:20px}
    p{color:#666;margin-bottom:30px}
    a{color:#0078d4;text-decoration:none;padding:12px 24px;background:#f0f8ff;border-radius:6px;display:inline-block}
    a:hover{background:#e6f3ff}
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>Página não encontrada</p>
    <a href="/">← Voltar ao Dashboard</a>
  </div>
</body>
</html>`;
  fs.writeFileSync(notFound, html404);
}

// Varredura para bloquear arquivos indevidos no build
const banned = [/debug/i, /^test/i, /limpar/i];
function scan(dir){
  for(const f of fs.readdirSync(dir)){
    const p = path.join(dir,f);
    const st = fs.statSync(p);
    if(st.isDirectory()) scan(p);
    else if(banned.some(rx => rx.test(f))){
      throw new Error(`Arquivo proibido encontrado em /public: ${p}`);
    }
  }
}
scan('public');

console.log('✅ Build concluído! /public pronto para deploy.');