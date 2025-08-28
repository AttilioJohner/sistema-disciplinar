// Dados de Frequência de Agosto 2025 (ATUALIZADO)
// Sistema configurado para processar dados até dia 27

function carregarDadosFrequenciaAgosto() {
  console.log('🗓️ Carregando dados de frequência de Agosto 2025 (até dia 27)...');
  
  // COLE AQUI SEUS DADOS CSV COM FREQUÊNCIA ATÉ DIA 27
  // Formato: Código,Nome,turma,1,4,5,6,7,8,11,12,13,14,15,18,19,20,21,22,25,26,27
  const dadosCSV = `2639458,Alberto de Jesus Sousa Pereira,6A,P,P,P,P,P,P,P,P,P,P,P,P,F,P,P,P,P,P,P
2590632,Ana Clara da Silva Coelho,6A,P,P,P,P,P,P,P,P,P,P,P,P,P,P,F,P,P,P,P
2230465,Ana Júlia da Silva,6A,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,F,P,P,P
2208832,Aysha Micaelly dos Santos B. Lemos,6A,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,F,P,P
2308886,Azaff Gabriel Souza Pereira da Cunha,6A,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,F,P
2257848,Bruna Santos Oliveira,6A,P,P,P,P,P,F,F,P,P,P,P,P,F,P,P,P,P,P,F
2235078,Davi de Lima Trevisan Araújo,6A,P,P,P,P,F,P,P,P,P,P,F,P,P,P,F,P,P,P,P
2590882,Eduarda Gomes da Silva,6A,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P`;

  const linhas = dadosCSV.trim().split('\n');
  
  // Dias úteis de agosto até dia 27 (incluindo 21, 22, 25, 26, 27)
  const diasUteis = ['1','4','5','6','7','8','11','12','13','14','15','18','19','20','21','22','25','26','27'];
  
  const dados = linhas.map(linha => {
    const valores = linha.split(',');
    const objeto = {
      codigo: valores[0],
      nome: valores[1],
      turma: valores[2]
    };
    
    // Mapear todos os dias úteis até 27
    diasUteis.forEach((dia, index) => {
      objeto[dia] = valores[3 + index] || '';
    });
    
    return objeto;
  });
  
  console.log(`📈 ${dados.length} registros processados do CSV (até dia 27)`);
  console.log(`📅 Dias configurados: ${diasUteis.join(', ')}`);
  
  return dados;
}

// Função para teste - verificar se dados estão sendo processados corretamente
function testarDadosFrequencia() {
  const dados = carregarDadosFrequenciaAgosto();
  
  if (dados.length === 0) {
    console.error('❌ Nenhum dado de frequência encontrado!');
    return false;
  }
  
  const primeiroAluno = dados[0];
  const diasDisponiveis = Object.keys(primeiroAluno).filter(key => 
    !['codigo', 'nome', 'turma'].includes(key)
  ).sort((a, b) => parseInt(a) - parseInt(b));
  
  console.log('✅ Teste dos dados de frequência:');
  console.log(`   - Total de alunos: ${dados.length}`);
  console.log(`   - Primeiro aluno: ${primeiroAluno.nome} (${primeiroAluno.codigo})`);
  console.log(`   - Dias disponíveis: ${diasDisponiveis.join(', ')}`);
  console.log(`   - Último dia: ${Math.max(...diasDisponiveis.map(d => parseInt(d)))}`);
  
  // Verificar se temos dados até o dia 27
  const temDia27 = diasDisponiveis.includes('27');
  if (temDia27) {
    console.log('✅ Sistema configurado corretamente até dia 27!');
  } else {
    console.warn('⚠️ Dados não chegam até dia 27. Último dia:', Math.max(...diasDisponiveis.map(d => parseInt(d))));
  }
  
  return true;
}

// Exposição das funções
window.carregarDadosFrequenciaAgosto = carregarDadosFrequenciaAgosto;
window.testarDadosFrequencia = testarDadosFrequencia;

// Teste automático quando o arquivo for carregado
console.log('🔧 Arquivo de frequência até dia 27 carregado. Execute testarDadosFrequencia() para verificar.');