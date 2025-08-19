async function carregarAlunosDashboard() {
  try {
    // Verificar se banco local está disponível
    if (!window.db) {
      console.error('Banco local não carregado');
      return;
    }

    // Buscar alunos no banco local
    const snapshot = await db.collection("alunos").get();
    const alunos = [];
    snapshot.forEach(doc => {
      alunos.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const tabela = document.getElementById('alunosDashboard');
    const tbody = tabela.querySelector('tbody');
    tbody.innerHTML = '';

    if (alunos.length === 0) {
      const colCount = tabela.querySelectorAll('thead th').length;
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = colCount;
      td.textContent = 'Nenhum aluno cadastrado.';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    alunos.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.codigo || a.id}</td>
        <td>${a.nome_completo || a.nome || ''}</td>
        <td>${a.turma || ''}</td>
        <td>${a.nascimento || ''}</td>
        <td>${a.responsavel || ''}</td>
        <td>${a.cpf_responsavel || a.cpf || ''}</td>`;
      tbody.appendChild(tr);
    });

    console.log(`${alunos.length} alunos carregados do Firebase`);
  } catch (err) {
    console.error('Erro ao carregar alunos:', err);
  }
}

window.carregarAlunosDashboard = carregarAlunosDashboard;
