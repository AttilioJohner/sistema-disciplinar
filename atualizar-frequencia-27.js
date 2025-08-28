// Script para atualizar frequência até o dia 27
// Execute este script com: node atualizar-frequencia-27.js

const fs = require('fs');
const path = require('path');

function atualizarFrequenciaAte27() {
    console.log('📅 Atualizando sistema de frequência para reconhecer até dia 27...');
    
    // Definir os dias úteis até 27 de agosto
    const diasUteis = ['1','4','5','6','7','8','11','12','13','14','15','18','19','20','21','22','25','26','27'];
    
    console.log('🗓️ Dias úteis configurados:', diasUteis.join(', '));
    
    // Atualizar o arquivo dados-frequencia-agosto.js
    const arquivoFrequencia = path.join(__dirname, 'assets/js/dados-frequencia-agosto.js');
    
    if (!fs.existsSync(arquivoFrequencia)) {
        console.error('❌ Arquivo não encontrado:', arquivoFrequencia);
        return;
    }
    
    let conteudo = fs.readFileSync(arquivoFrequencia, 'utf8');
    
    // Substituir a linha dos dias úteis
    const novaLinhaDias = `  const diasUteis = ['${diasUteis.join("','")}'];`;
    conteudo = conteudo.replace(
        /const diasUteis = \[.*?\];/,
        novaLinhaDias
    );
    
    // Salvar o arquivo atualizado
    fs.writeFileSync(arquivoFrequencia, conteudo, 'utf8');
    
    console.log('✅ Arquivo atualizado:', arquivoFrequencia);
    console.log('📊 Sistema agora reconhece frequência até dia 27 de agosto');
    
    // Instruções para o usuário
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Substitua o dadosCSV no arquivo dados-frequencia-agosto.js');
    console.log('2. Cole seus dados CSV com colunas até o dia 27');
    console.log('3. Formato esperado: Código,Nome,turma,1,4,5,6,7,8,11,12,13,14,15,18,19,20,21,22,25,26,27');
    console.log('4. Teste a importação na página de frequência');
    
    return true;
}

// Executar se chamado diretamente
if (require.main === module) {
    atualizarFrequenciaAte27();
}

module.exports = { atualizarFrequenciaAte27 };