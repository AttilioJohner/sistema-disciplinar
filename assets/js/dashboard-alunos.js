async function carregarAlunosDashboard() {
  try {
    const res = await fetch('/alunos');
    const alunos = await res.json();
    const tabela = document.getElementById('alunosDashboard');
    const tbody = tabela.querySelector('tbody');
    tbody.innerHTML = '';

    if (!Array.isArray(alunos) || alunos.length === 0) {
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
        <td>${a.id}</td>
        <td>${a.nome || ''}</td>
        <td>${a.turma || ''}</td>
        <td>${a.nascimento || ''}</td>
        <td>${a.responsavel || ''}</td>
        <td>${a.cpf || ''}</td>`;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Erro ao carregar alunos:', err);
  }
}

window.carregarAlunosDashboard = carregarAlunosDashboard;
