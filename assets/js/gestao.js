// assets/js/gestao-alunos.js
// Requisitos: firebase compat + firebase-config.js + firestore-compat carregados
(function(){
  // ---------- Helpers ----------
  const col = () => firebase.firestore().collection('alunos');
  const el  = (id) => document.getElementById(id);

  function msgOk(t){ if (typeof showMessage==='function') showMessage(t,'success'); else alert(t); }
  function msgErr(t){ if (typeof showMessage==='function') showMessage(t,'error'); else alert(t); }
  function msgInfo(t){ if (typeof showMessage==='function') showMessage(t,'loading'); else console.log(t); }

  function toTimestampOrNull(yyyy_mm_dd){
    if (!yyyy_mm_dd) return null;
    const d = new Date(yyyy_mm_dd + 'T00:00:00');
    return isNaN(d.getTime()) ? null : firebase.firestore.Timestamp.fromDate(d);
  }

  function formatarData(v){
    try {
      if (!v) return '-';
      if (v.toDate) return v.toDate().toLocaleDateString('pt-BR');
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v).toLocaleDateString('pt-BR');
      const d = new Date(v);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
    } catch { return '-'; }
  }

  // mascara simples p/ telefone
  function maskTelefone(value){
    const digits = (value || '').replace(/\D/g,'').slice(0,11);
    if (digits.length >= 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (digits.length >= 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    if (digits.length >= 6)  return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    if (digits.length >= 2)  return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    return digits;
  }

  // ---------- Estado ----------
  let lastDoc = null;
  let firstDoc = null;
  let stack = [];
  let cache = [];

  // ---------- Form ----------
  function readForm(){
    const matricula = el('matriculaAluno').value.trim(); // docId
    const nome = el('nomeAluno').value.trim();
    const turma = el('turmaAluno').value.trim();
    const nascimento = el('nascimentoAluno').value;
    const responsavel = el('responsavelAluno').value.trim();
    const telefone = el('telefoneResponsavel').value.trim();
    const email = el('emailResponsavel').value.trim();
    const ativo = el('statusAluno').value === 'true';

    return {
      id: el('fId').value.trim(), // só é usado no modo edição
      docId: matricula,
      data: {
        matricula,
        nome,
        turma,
        nascimento: toTimestampOrNull(nascimento),
        responsavel: responsavel || null,
        telefoneResponsavel: telefone || null,
        emailResponsavel: email || null,
        ativo
      }
    };
  }

  function fillForm(docId, data){
    el('fId').value = docId || '';
    el('matriculaAluno').value = data?.matricula || docId || '';
    el('nomeAluno').value = data?.nome || '';
    el('turmaAluno').value = data?.turma || '';
    el('responsavelAluno').value = data?.responsavel || '';
    el('telefoneResponsavel').value = data?.telefoneResponsavel || '';
    el('emailResponsavel').value = data?.emailResponsavel || '';
    if (data?.nascimento?.toDate) {
      el('nascimentoAluno').value = data.nascimento.toDate().toISOString().slice(0,10);
    } else {
      el('nascimentoAluno').value = '';
    }
    el('statusAluno').value = data?.ativo ? 'true' : 'false';
  }

  function resetForm(){
    fillForm('', {});
    el('formTitulo').textContent = 'Novo aluno';
    el('btnSalvar').textContent = 'Cadastrar';
  }

  // ---------- CRUD ----------
  async function salvarAluno(e){
    e.preventDefault();
    const { id, docId, data } = readForm();

    if (!docId) return msgErr('Informe a matrícula (ID).');
    if (!data.nome) return msgErr('Informe o nome.');
    if (!data.turma) return msgErr('Informe a turma.');

    try {
      msgInfo('Salvando...');
      if (id) {
        // edição: mantém docId fixo (id)
        await col().doc(id).set({ ...data, dataAtualizacao: firebase.firestore.Timestamp.fromDate(new Date()) }, { merge: true });
      } else {
        // criação com docId = matrícula
        await col().doc(docId).set({ ...data, dataCadastro: firebase.firestore.Timestamp.fromDate(new Date()) }, { merge: false });
      }
      msgOk('Dados salvos!');
      resetForm();
      carregarPagina('first');
    } catch (e) {
      console.error(e);
      msgErr('Erro ao salvar: ' + (e.message || e));
    }
  }

  async function editarAluno(id){
    try {
      const d = await col().doc(id).get();
      if (!d.exists) return msgErr('Registro não encontrado.');
      fillForm(d.id, d.data());
      el('formTitulo').textContent = 'Editar aluno';
      el('btnSalvar').textContent = 'Salvar alterações';
      el('matriculaAluno').disabled = true; // não permitir trocar docId
      el('formAluno').scrollIntoView({ behavior: 'smooth' });
    } catch(e){
      console.error(e); msgErr('Erro ao carregar aluno.');
    }
  }

  async function excluirAluno(id){
    if (!confirm('Excluir este aluno?')) return;
    try {
      await col().doc(id).delete();
      msgOk('Aluno excluído.');
      carregarPagina();
    } catch(e){
      console.error(e); msgErr('Erro ao excluir.');
    }
  }

  async function inativarAluno(id){
    if (!confirm('Inativar este aluno?')) return;
    try {
      await col().doc(id).update({ ativo: false, dataInativacao: firebase.firestore.Timestamp.fromDate(new Date()) });
      msgOk('Aluno inativado.');
      carregarPagina();
    } catch(e){ console.error(e); msgErr('Erro ao inativar.'); }
  }

  // ---------- Lista / Paginação ----------
  function rowHTML(id, d){
    const dn = d.nascimento?.toDate ? d.nascimento.toDate().toLocaleDateString('pt-BR') : '-';
    return `
      <tr>
        <td>${id}</td>
        <td>${d.nome || '-'}</td>
        <td>${d.turma || '-'}</td>
        <td>${dn}</td>
        <td>${d.responsavel || '-'}</td>
        <td>
          ${(d.telefoneResponsavel || '-')}${d.emailResponsavel ? `<br>${d.emailResponsavel}` : ''}
        </td>
        <td>${d.ativo ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-small" data-edit="${id}">Editar</button>
          <button class="btn btn-small" data-inativar="${id}">Inativar</button>
          <button class="btn btn-small btn-danger" data-del="${id}">Excluir</button>
        </td>
      </tr>
    `;
  }

  async function carregarPagina(direction='first'){
    const busca = el('busca').value.trim().toLowerCase();
    let q = col().orderBy('nome').limit(12);

    if (direction === 'next' && lastDoc) q = q.startAfter(lastDoc);
    if (direction === 'prev') {
      if (stack.length >= 2) {
        stack.pop();
        const anchor = stack[stack.length - 1];
        q = col().orderBy('nome').limit(12).startAt(anchor);
      } else {
        q = col().orderBy('nome').limit(12);
      }
    }

    const tbody = el('alunosTableBody');
    tbody.innerHTML = `<tr><td class="muted" colspan="8">Carregando...</td></tr>`;

    const snap = await q.get();
    if (snap.empty) {
      tbody.innerHTML = `<tr><td class="muted" colspan="8">Nenhum aluno encontrado.</td></tr>`;
      firstDoc = lastDoc = null; cache = [];
      return;
    }

    cache = [];
    snap.forEach(d => {
      const data = d.data();
      const ok = !busca
        || (data.nome && data.nome.toLowerCase().includes(busca))
        || (data.matricula && String(data.matricula).toLowerCase().includes(busca));
      if (ok) cache.push({ id: d.id, data });
    });

    tbody.innerHTML = cache.map(r => rowHTML(r.id, r.data)).join('') || `<tr><td class="muted" colspan="8">Sem resultados.</td></tr>`;

    firstDoc = snap.docs[0];
    lastDoc = snap.docs[snap.docs.length - 1];
    if (direction === 'first') stack = [firstDoc];
    if (direction === 'next') stack.push(firstDoc);

    // bind ações
    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editarAluno(b.getAttribute('data-edit'))));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => excluirAluno(b.getAttribute('data-del'))));
    tbody.querySelectorAll('[data-inativar]').forEach(b => b.addEventListener('click', () => inativarAluno(b.getAttribute('data-inativar'))));
  }

  // ---------- Exportar CSV ----------
  function exportarCSV(){
    if (!cache.length) return msgErr('Nenhum aluno carregado para exportar');
    const rows = cache.map(a => ({
      Matricula: a.id,
      Nome: a.data.nome || '',
      Turma: a.data.turma || '',
      Nascimento: a.data.nascimento?.toDate ? a.data.nascimento.toDate().toISOString().slice(0,10) : '',
      Responsavel: a.data.responsavel || '',
      Telefone: a.data.telefoneResponsavel || '',
      Email: a.data.emailResponsavel || '',
      Status: a.data.ativo ? 'Ativo' : 'Inativo'
    }));
    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers].concat(rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alunos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    // proteger rota (se tiver auth-guard)
    if (window.requireAuth) {
      requireAuth({
        loginPath: 'login.html',
        onAuth: () => carregarPagina('first')
      });
    } else {
      carregarPagina('first');
    }

    // eventos do form
    el('btnSalvar').addEventListener('click', salvarAluno);
    el('btnCancelar').addEventListener('click', (e)=>{ e.preventDefault(); el('matriculaAluno').disabled = false; resetForm(); });

    // busca/paginação/export
    el('btnBuscar').addEventListener('click', () => carregarPagina('first'));
    el('btnLimparBusca').addEventListener('click', () => { el('busca').value=''; carregarPagina('first'); });
    el('btnProx').addEventListener('click', () => carregarPagina('next'));
    el('btnAnt').addEventListener('click', () => carregarPagina('prev'));
    el('btnExportar').addEventListener('click', exportarCSV);

    // máscara telefone
    el('telefoneResponsavel').addEventListener('input', (e)=> e.target.value = maskTelefone(e.target.value));
  });

  // expõe se precisar em outros scripts
  window.carregarPaginaAlunos = carregarPagina;
})();
