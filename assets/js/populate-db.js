// Script para popular o banco local com dados de agosto 2025
async function popularBancoLocal() {
  console.log('🔄 Populando banco local com dados de agosto 2025...');
  
  // Aguardar carregamento do banco local
  await window.localDb.waitForLoad();
  
  // Carregar dados de frequência de agosto
  if (typeof carregarDadosFrequenciaAgosto === 'function') {
    const dadosAgosto = carregarDadosFrequenciaAgosto();
    
    console.log(`📊 Processando ${dadosAgosto.length} registros...`);
    
    // Processar cada aluno
    for (let i = 0; i < dadosAgosto.length; i++) {
      const aluno = dadosAgosto[i];
      
      // Processar dias de frequência
      const diasFrequencia = {};
      let totalPresencas = 0;
      let totalFaltas = 0;
      let totalAtestados = 0;
      let dataUltimaFalta = null;
      
      const diasUteis = ['1','4','5','6','7','8','11','12','13','14','15','18','19','20','21','22','25','26','27','28','29'];
      
      diasUteis.forEach(dia => {
        const valor = aluno[dia];
        if (valor) {
          diasFrequencia[dia] = valor;
          
          if (valor === 'P') {
            totalPresencas++;
          } else if (valor === 'F') {
            totalFaltas++;
            dataUltimaFalta = new Date(2025, 7, parseInt(dia)); // Agosto 2025
          } else if (valor === 'A') {
            totalAtestados++;
          }
        }
      });
      
      const totalDias = totalPresencas + totalFaltas + totalAtestados;
      const percentualPresenca = totalDias > 0 ? (totalPresencas / totalDias * 100) : 0;
      
      // Criar registro no banco local
      const registro = {
        id: `freq_${aluno.codigo}_${Date.now()}_${i}`,
        codigo: aluno.codigo,
        nome: aluno.nome,
        turma: aluno.turma,
        diasFrequencia: diasFrequencia,
        presencas: totalPresencas,
        faltas: totalFaltas,
        atestados: totalAtestados,
        percentualPresenca: percentualPresenca,
        dataUltimaFalta: dataUltimaFalta ? dataUltimaFalta.toISOString() : null,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };
      
      // Adicionar ao banco local
      window.localDb.data.frequencia_diaria[registro.id] = registro;
    }
    
    // Remover registro de exemplo
    delete window.localDb.data.frequencia_diaria.sample_loading;
    
    // Atualizar metadata
    window.localDb.data.metadata.total_registros = dadosAgosto.length;
    window.localDb.data.metadata.ultimo_backup = new Date().toISOString();
    
    console.log(`✅ ${dadosAgosto.length} registros adicionados ao banco local!`);
    
    // Disparar evento para atualizar a interface
    window.dispatchEvent(new CustomEvent('dadosPopulados', { 
      detail: { total: dadosAgosto.length } 
    }));
    
    return true;
  } else {
    console.error('❌ Função carregarDadosFrequenciaAgosto não encontrada');
    return false;
  }
}

// Auto-executar quando os dados estiverem carregados
window.addEventListener('localDbReady', () => {
  // Verificar se já existem dados
  const existingData = Object.keys(window.localDb.data.frequencia_diaria || {})
    .filter(key => key !== 'sample_loading');
  
  if (existingData.length === 0) {
    console.log('📝 Banco vazio, aguardando função de dados...');
    
    // Aguardar um pouco para o carregamento dos outros scripts
    setTimeout(() => {
      if (typeof carregarDadosFrequenciaAgosto === 'function') {
        console.log('🔄 Iniciando população do banco...');
        popularBancoLocal();
      } else {
        console.log('⚠️ Função carregarDadosFrequenciaAgosto não encontrada ainda');
        // Tentar novamente após mais tempo
        setTimeout(() => {
          if (typeof carregarDadosFrequenciaAgosto === 'function') {
            popularBancoLocal();
          }
        }, 3000);
      }
    }, 1000);
  } else {
    console.log(`📚 Banco já possui ${existingData.length} registros`);
    // Disparar evento mesmo se já tem dados
    window.dispatchEvent(new CustomEvent('dadosPopulados', { 
      detail: { total: existingData.length } 
    }));
  }
});

// Função para limpar e repopular
window.limparERepopularBanco = async function() {
  console.log('🗑️ Limpando banco local...');
  
  await window.localDb.waitForLoad();
  
  // Limpar frequência
  window.localDb.data.frequencia_diaria = {};
  
  // Repopular
  return await popularBancoLocal();
};

// Expor função
window.popularBancoLocal = popularBancoLocal;