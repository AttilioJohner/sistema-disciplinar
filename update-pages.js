// Script para atualizar todas as páginas para usar sistema local
const fs = require('fs');
const path = require('path');

const pagesDir = './pages';
const files = [
  'medidas-disciplinares.html',
  'controle-disciplinar.html', 
  'configuracoes.html',
  'comunicacao.html',
  'analises.html'
];

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Substituir imports do Firebase
    content = content.replace(
      /<!-- Firebase[^>]*-->[\s\S]*?<script[^>]*firebase-config\.js[^>]*><\/script>/gim,
      '<!-- Sistema Local -->\n  <script defer src="../assets/js/local-db.js"></script>\n  <script defer src="../assets/js/local-auth.js"></script>'
    );
    
    // Remover auth-guard se existir
    content = content.replace(
      /<script[^>]*auth-guard\.js[^>]*><\/script>/gim,
      ''
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Atualizado: ${file}`);
  } else {
    console.log(`❌ Não encontrado: ${file}`);
  }
});

console.log('🎯 Atualização concluída!');