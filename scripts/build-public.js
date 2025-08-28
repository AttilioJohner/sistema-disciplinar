#!/usr/bin/env node
// Script de build para o Sistema Disciplinar
// Cria a pasta dist com os arquivos necessários para deploy

const fs = require('fs');
const path = require('path');

console.log('🏗️ Iniciando build do Sistema Disciplinar...');

// Criar diretório dist
const distDir = path.join(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Criar subdiretório sistema-disciplinar
const sistemaDir = path.join(distDir, 'sistema-disciplinar');
fs.mkdirSync(sistemaDir, { recursive: true });

console.log('📁 Copiando arquivos principais...');

// Lista de arquivos e pastas para copiar
const filesToCopy = [
  'index.html',
  'assets/',
  'components/',
  'pages/', 
  'data/',
  '.nojekyll'
];

// Função para copiar recursivamente
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Arquivo não encontrado: ${src}`);
    return;
  }
  
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copiar arquivos para o subdiretório sistema-disciplinar
filesToCopy.forEach(item => {
  const srcPath = path.join(process.cwd(), item);
  const destPath = path.join(sistemaDir, item);
  
  try {
    copyRecursive(srcPath, destPath);
    console.log(`✅ Copiado: ${item}`);
  } catch (error) {
    console.error(`❌ Erro ao copiar ${item}:`, error.message);
  }
});

console.log('📄 Criando arquivo de redirecionamento na raiz...');

// Criar arquivo HTML de redirecionamento na raiz
const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sistema Disciplinar</title>
  <meta http-equiv="refresh" content="0; url=/sistema-disciplinar/">
  <script>
    window.location.href = '/sistema-disciplinar/';
  </script>
</head>
<body>
  <p>Redirecionando para o <a href="/sistema-disciplinar/">Sistema Disciplinar</a>...</p>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'index.html'), redirectHtml);

console.log('🔧 Criando arquivo _redirects para Netlify...');

// Criar arquivo _redirects para Netlify
const redirectsContent = `# Redirecionamentos do Sistema Disciplinar
/  /sistema-disciplinar  301
/sistema-disciplinar/api/*  /.netlify/functions/api/:splat  200
/sistema-disciplinar/*  /sistema-disciplinar/index.html  200
`;

fs.writeFileSync(path.join(distDir, '_redirects'), redirectsContent);

console.log('📊 Build concluído com sucesso!');
console.log(`📁 Arquivos gerados em: ${distDir}`);
console.log('🚀 Pronto para deploy no Netlify');

// Verificar tamanho dos arquivos
const sizeCheck = (dir) => {
  let totalSize = 0;
  let fileCount = 0;
  
  const scanDir = (dirPath) => {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        scanDir(filePath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    });
  };
  
  scanDir(dir);
  return { totalSize, fileCount };
};

const { totalSize, fileCount } = sizeCheck(distDir);
const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

console.log(`📈 Estatísticas do build:`);
console.log(`   - Arquivos: ${fileCount}`);
console.log(`   - Tamanho total: ${sizeMB} MB`);

process.exit(0);