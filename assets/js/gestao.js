// gestao.js — CRUD de Alunos com Firestore (Compat SDK)
// Requisitos no HTML:
// - <form id="alunoForm"> com inputs name="id", "nome", "turma", "nascimento", "responsavel", "telefone", "email"
// - <tbody id="alunosTableBody"></tbody>
// - Botões: #btnSalvar, #btnCancelar (opcional), e input de busca #busca (opcional)
// - Elementos auxiliares (opcional): #totalAlunos, #toast
// - firebase-config.js deve ter inicializado window.db e window.isFirebaseReady

(function () {
  'use strict';

  // === CONFIG LOCAL ===
  const COLLECTION = 'alunos';
  const REQUIRED_FIELDS_CREATE = ['id', 'nome', 'turma'];
  const REQUIRED_FIELDS_UPDATE = ['nome', 'turma'];

  // === STATE ===
  let db = null;
  let unsubLista = null;
  let alunosCache = []; // Mantém snapshot local para filtros rápidos
  let editingId = null; // null -> modo criação; string -> modo edição

  // === ELEMENTOS ===
  const els = {};

  document.addEventListener('DOMContentLoaded', async () => {
    await ensureFirebase();
    mapElements();
    bindEvents();
    startLiveList();
  });

  // Aguarda Firebase disponível via window.isFirebaseReady/window.db
  async function ensureFirebase() {
    const maxWaitMs = 8000;
    const start = Date.now();
    while (!(window.isFirebaseReady && window.isFirebaseReady() && window.db)) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error('Firebase não inicializado. Verifique a ordem dos scripts e o firebase-config.js.');
      }
      await sleep(100);
    }
    db = window.db;
  }

  function mapElements() {
    els.form = document.getElementById('alunoForm');
    els.tbody = document.getElementById('alunosTableBody');
    els.btnSalvar = document.getElementById('btnSalvar') || queryByType(els.form, 'submit');
    els.btnCancelar = document.getElementById('btnCancelar');
    els.busca = document.getElementById('busca');
    els.total = document.getElementById('totalAlunos');
    els.toast = document.getElementById('toast');
  }

  function bindEvents() {
    if (els.form) {
      els.form.addEventListener('submit', onSubmitForm);
    }
    if (els.btnCancelar) {
      els.btnCancelar.addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
      });
    }
    if (els.busca) {
      els.busca.addEventListener('input', () => renderTable());
    }
    if (els.tbody) {
      // Delegação para Editar/Excluir
      els.tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (!action || !id) return;
        if (action === 'edit') {
          onEdit(id);
        } else if (action === 'delete') {
          onDelete(id);
        }
      });
    }
  }

  function startLiveList() {
    // Real-time listener ordenando por nome (se existir). Documentos sem o campo aparecem primeiro.
    unsubLista = db.collection(COLLECTION).orderBy('nome').onSnapshot(
      (snap) => {
        alunosCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderTable();
      },
      (err) => {
        console.error('Erro ao ouvir lista:', err);
        toast('Erro ao carregar alunos. Verifique as regras do Firestore.', 'erro');
      }
    );
  }

  // === CRUD ===
  async function onSubmitForm(ev) {
    ev.preventDefault();
    const data = getFormData();

    try {
      if (editingId) {
        validateRequired(data, REQUIRED_FIELDS_UPDATE);
        // Não permitir troca de docId durante edição
        if (data.id && data.id !== editingId) {
          // Se usuário tentou mudar o campo id, ignoramos (docId é fixo no update)
          data.id = editingId;
        }
        await updateAluno(editingId, data);
        toast('Aluno atualizado com sucesso!');
      } else {
        validateRequired(data, REQUIRED_FIELDS_CREATE);
        const docId = String(data.id).trim();
        await createAluno(docId, data);
        toast('Aluno cadastrado com sucesso!');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      toast(err.message || 'Falha ao salvar aluno.', 'erro');
    }
  }

  async function createAluno(docId, data) {
    // Confere duplicidade
    const ref = db.collection(COLLECTION).doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      throw new Error(`Já existe um aluno com ID "${docId}".`);
    }
    const payload = sanitizeData(data, { forCreate: true });
    await ref.set(payload, { merge: false });
  }

  async function updateAluno(docId, data) {
    const ref = db.collection(COLLECTION).doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Aluno com ID "${docId}" não encontrado para atualização.`);
    }
    const payload = sanitizeData(data, { forUpdate: true });
    await ref.update(payload);
  }

  async function onEdit(id) {
    try {
      const ref = db.collection(COLLECTION).doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        toast('Registro não encontrado.', 'erro');
        return;
      }
      fillForm({ id, ...snap.data() });
      editingId = id;
      toggleFormMode('edit');
      scrollIntoViewSmooth(els.form);
    } catch (err) {
      console.error(err);
      toast('Falha ao carregar aluno para edição.', 'erro');
    }
  }

  async function onDelete(id) {
    const ok = confirm(`Excluir definitivamente o aluno ID "${id}"?`);
    if (!ok) return;
    try {
      await db.collection(COLLECTION).doc(id).delete();
      toast('Aluno excluído.');
      // Se estava editando esse ID, limpa o formulário
      if (editingId === id) resetForm();
    } catch (err) {
      console.error(err);
      toast('Falha ao excluir aluno.', 'erro');
    }
  }

  // === RENDER ===
  function renderTable() {
    if (!els.tbody) return;
    const termo = normalize((els.busca && els.busca.value) || '');

    const lista = alunosCache.filter((a) => {
      if (!termo) return true;
      const alvo = normalize(
        [a.id, a.nome, a.turma, a.nascimento, a.responsavel, a.telefone, a.email]
          .filter(Boolean)
          .join(' ')
      );
      return alvo.includes(termo);
    });

    els.tbody.innerHTML = lista
      .map((a) => {
        return `
          <tr>
            <td>${escapeHtml(a.id || '')}</td>
            <td>${escapeHtml(a.nome || '')}</td>
            <td>${escapeHtml(a.turma || '')}</td>
            <td>${escapeHtml(a.nascimento || '')}</td>
            <td>${escapeHtml(a.responsavel || '')}</td>
            <td>${escapeHtml(a.telefone || '')}</td>
            <td>${escapeHtml(a.email || '')}</td>
            <td style="white-space:nowrap">
              <button type="button" class="btn btn-sm" data-action="edit" data-id="${encodeURIComponent(
                a.id
              )}">Editar</button>
              <button type="button" class="btn btn-sm btn-danger" data-action="delete" data-id="${encodeURIComponent(
                a.id
              )}">Excluir</button>
            </td>
          </tr>`;
      })
      .join('');

    if (els.total) {
      els.total.textContent = String(lista.length);
    }
  }

  // === FORM HELPERS ===
  function getFormData() {
    if (!els.form) return {};
    const fd = new FormData(els.form);
    const data = Object.fromEntries(fd.entries());
    // Normalizações simples
    if (data.id != null) data.id = String(data.id).trim();
    if (data.nome != null) data.nome = cleanSpaces(data.nome);
    if (data.turma != null) data.turma = cleanSpaces(data.turma).toUpperCase();
    if (data.telefone != null) data.telefone = data.telefone.trim();
    if (data.email != null) data.email = data.email.trim().toLowerCase();
    return data;
  }

  function fillForm(data) {
    if (!els.form) return;
    for (const [k, v] of Object.entries(data)) {
      const input = els.form.querySelector(`[name="${cssEscape(k)}"]`);
      if (input) input.value = v == null ? '' : String(v);
    }
  }

  function resetForm() {
    if (els.form) els.form.reset();
    editingId = null;
    toggleFormMode('create');
  }

  function toggleFormMode(mode) {
    const idInput = els.form && els.form.querySelector('[name="id"]');
    if (mode === 'edit') {
      if (idInput) {
        idInput.disabled = true; // docId não muda
        idInput.classList.add('is-disabled');
      }
      if (els.btnSalvar) els.btnSalvar.textContent = 'Atualizar';
    } else {
      if (idInput) {
        idInput.disabled = false;
        idInput.classList.remove('is-disabled');
      }
      if (els.btnSalvar) els.btnSalvar.textContent = 'Salvar';
    }
  }

  function validateRequired(data, fields) {
    const faltando = fields.filter((f) => !data[f] || String(data[f]).trim() === '');
    if (faltando.length) {
      throw new Error('Preencha os campos obrigatórios: ' + faltando.join(', '));
    }
  }

  function sanitizeData(data, { forCreate = false, forUpdate = false } = {}) {
    const allowed = ['id', 'nome', 'turma', 'nascimento', 'responsavel', 'telefone', 'email'];
    const out = {};
    for (const k of allowed) {
      if (data[k] != null && data[k] !== '') out[k] = data[k];
    }

    // Campos de auditoria
    const ts = firebase.firestore.FieldValue.serverTimestamp();
    if (forCreate) {
      out.createdAt = ts;
      out.updatedAt = ts;
    }
    if (forUpdate) {
      out.updatedAt = ts;
    }

    return out;
  }

  // === UTILITÁRIOS ===
  function toast(msg, tipo = 'ok') {
    // Se existir #toast, usa-o; senão, fallback para alert no error
    if (els.toast) {
      els.toast.textContent = msg;
      els.toast.dataset.tipo = tipo; // permita CSS [data-tipo="erro"]
      els.toast.classList.add('show');
      setTimeout(() => els.toast && els.toast.classList.remove('show'), 3500);
    } else if (tipo === 'erro') {
      alert(msg);
    } else {
      console.log('[OK]', msg);
    }
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function queryByType(root, type) {
    return root ? root.querySelector(`[type="${cssEscape(type)}"]`) : null;
  }

  function cleanSpaces(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Polyfill para CSS.escape (evita erro em navegadores mais antigos)
  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (m) => `\\${m}`);
  }

  function scrollIntoViewSmooth(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      el.scrollIntoView();
    }
  }

  // === LIMPEZA ===
  window.addEventListener('beforeunload', () => {
    if (typeof unsubLista === 'function') unsubLista();
  });
})();
