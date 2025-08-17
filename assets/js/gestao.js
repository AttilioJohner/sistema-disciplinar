// gestao.js — CRUD de Alunos com Firestore (Compat SDK) + Modo Debug
// Requisitos no HTML:
// - <form id="alunoForm"> com inputs name="id", "nome", "turma", "nascimento", "responsavel", "telefone", "email"
// - <tbody id="alunosTableBody"></tbody>
// - Botões: #btnSalvar, #btnCancelar (opcional), e input de busca #busca (opcional)
// - Elementos auxiliares (opcional): #totalAlunos, #toast
// - firebase-config.js deve ter inicializado window.db e window.isFirebaseReady

(function () {
  'use strict';

  // =====================
  // CONFIG & FLAGS
  // =====================
  const COLLECTION = 'alunos';
  const REQUIRED_FIELDS_CREATE = ['id', 'nome', 'turma'];
  const REQUIRED_FIELDS_UPDATE = ['nome', 'turma'];

  let DEBUG_VERBOSE = false; // ligue/desligue logs verbosos via debugGestao.setVerbose(true/false)

  // =====================
  // STATE
  // =====================
  let db = null;
  let unsubLista = null;
  let alunosCache = []; // snapshot local para filtros
  let editingId = null; // null -> criação; string -> edição

  // =====================
  // ELEMENTOS
  // =====================
  const els = {};

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await ensureFirebase();
      mapElements();
      bindEvents();
      startLiveList();
      debugLog('gestao.js inicializado com sucesso');
    } catch (e) {
      console.error(e);
      toast(e.message || 'Falha ao iniciar gestao.js', 'erro');
    }
  });

  // Aguarda Firebase disponível via window.isFirebaseReady/window.db
  async function ensureFirebase() {
    const maxWaitMs = 12000;
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

    if (!els.form) debugWarn('#alunoForm não encontrado');
    if (!els.tbody) debugWarn('#alunosTableBody não encontrado');
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
        const idRaw = btn.dataset.id;
        const id = idRaw ? decodeURIComponent(idRaw) : idRaw;
        if (!action || !id) return;
        if (action === 'edit') {
          onEdit(id);
        } else if (action === 'delete') {
          onDelete(id);
        }
      });
    }
  }

  // =====================
  // LISTENER EM TEMPO REAL
  // =====================
  function startLiveList() {
    stopLiveList();

    const handler = (snap) => {
      alunosCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      debugLog('onSnapshot size:', snap.size);
      renderTable();
    };

    const errorHandler = (err) => {
      console.error('Erro ao ouvir lista:', err);
      toast('Erro ao carregar alunos. Verifique as regras do Firestore.', 'erro');

      // Fallback: tenta sem orderBy em caso de índice/precondição/perm.
      if (err && (err.code === 'failed-precondition' || err.code === 'permission-denied')) {
        debugWarn('Reanexando listener sem orderBy (fallback).');
        stopLiveList();
        unsubLista = db.collection(COLLECTION).onSnapshot(handler, (e2) => {
          console.error('Erro no fallback do listener:', e2);
        });
      }
    };

    try {
      unsubLista = db.collection(COLLECTION).orderBy('nome').onSnapshot(handler, errorHandler);
    } catch (e) {
      debugWarn('Falha imediata ao anexar listener com orderBy. Tentando sem orderBy...');
      unsubLista = db.collection(COLLECTION).onSnapshot(handler, errorHandler);
    }
  }

  function stopLiveList() {
    if (typeof unsubLista === 'function') {
      try { unsubLista(); } catch (_) {}
    }
    unsubLista = null;
  }

  // =====================
  // CRUD
  // =====================
  async function onSubmitForm(ev) {
    ev.preventDefault();
    const data = getFormData();

    try {
      if (editingId) {
        validateRequired(data, REQUIRED_FIELDS_UPDATE);
        // Não permitir troca de docId durante edição
        if (data.id && data.id !== editingId) {
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
    const ref = db.collection(COLLECTION).doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      throw new Error('Já existe um aluno com ID "' + docId + '".');
    }
    const payload = sanitizeData(data, { forCreate: true });
    await ref.set(payload, { merge: false });
    debugLog('CREATE ok', { id: docId, payload });
  }

  async function updateAluno(docId, data) {
    const ref = db.collection(COLLECTION).doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error('Aluno com ID "' + docId + '" não encontrado para atualização.');
    }
    const payload = sanitizeData(data, { forUpdate: true });
    await ref.update(payload);
    debugLog('UPDATE ok', { id: docId, payload });
  }

  async function onEdit(id) {
    try {
      const ref = db.collection(COLLECTION).doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        toast('Registro não encontrado.', 'erro');
        return;
      }
      fillForm({ id: id, ...snap.data() });
      editingId = id;
      toggleFormMode('edit');
      scrollIntoViewSmooth(els.form);
      debugLog('EDIT load', { id: id });
    } catch (err) {
      console.error(err);
      toast('Falha ao carregar aluno para edição.', 'erro');
    }
  }

  async function onDelete(id) {
    const ok = confirm('Excluir definitivamente o aluno ID "' + id + '"?');
    if (!ok) return;
    try {
      await db.collection(COLLECTION).doc(id).delete();
      toast('Aluno excluído.');
      if (editingId === id) resetForm();
      debugLog('DELETE ok', { id: id });
    } catch (err) {
      console.error(err);
      toast('Falha ao excluir aluno.', 'erro');
    }
  }

  // =====================
  // RENDER
  // =====================
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

    if (lista.length === 0) {
      els.tbody.innerHTML = '<tr><td colspan="8" class="no-data">Nenhum aluno cadastrado.</td></tr>';
    } else {
      els.tbody.innerHTML = lista
        .map((a) => {
          return (
            '<tr>' +
              '<td>' + escapeHtml(a.id || '') + '</td>' +
              '<td>' + escapeHtml(a.nome || '') + '</td>' +
              '<td>' + escapeHtml(a.turma || '') + '</td>' +
              '<td>' + escapeHtml(a.nascimento || '') + '</td>' +
              '<td>' + escapeHtml(a.responsavel || '') + '</td>' +
              '<td>' + escapeHtml(a.telefone || '') + '</td>' +
              '<td>' + escapeHtml(a.email || '') + '</td>' +
              '<td style="white-space:nowrap">' +
                '<button type="button" class="btn btn-small" data-action="edit" data-id="' + encodeURIComponent(a.id) + '">Editar</button>' +
                '<button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="' + encodeURIComponent(a.id) + '">Excluir</button>' +
              '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

    if (els.total) {
      els.total.textContent = String(lista.length);
    }
  }

  // =====================
  // FORM HELPERS
  // =====================
  function getFormData() {
    if (!els.form) return {};
    const fd = new FormData(els.form);
    const data = Object.fromEntries(fd.entries());
    if (data.id != null) data.id = String(data.id).trim();
    if (data.nome != null) data.nome = cleanSpaces(data.nome);
    if (data.turma != null) data.turma = cleanSpaces(data.turma).toUpperCase();
    if (data.telefone != null) data.telefone = data.telefone.trim();
    if (data.email != null) data.email = data.email.trim().toLowerCase();
    return data;
  }

  function fillForm(data) {
    if (!els.form) return;
    for (const k in data) {
      if (!Object.prototype.hasOwnProperty.call(data, k)) continue;
      const v = data[k];
      const input = els.form.querySelector('[name="' + cssEscape(k) + '"]');
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
    const faltando = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!data[f] || String(data[f]).trim() === '') faltando.push(f);
    }
    if (faltando.length) {
      throw new Error('Preencha os campos obrigatórios: ' + faltando.join(', '));
    }
  }

  function sanitizeData(data, opts) {
    opts = opts || {}; var forCreate = !!opts.forCreate; var forUpdate = !!opts.forUpdate;
    var allowed = ['id', 'nome', 'turma', 'nascimento', 'responsavel', 'telefone', 'email'];
    var out = {};
    for (var i = 0; i < allowed.length; i++) {
      var k = allowed[i];
      if (data[k] != null && data[k] !== '') out[k] = data[k];
    }
    var ts = firebase.firestore.FieldValue.serverTimestamp();
    if (forCreate) { out.createdAt = ts; out.updatedAt = ts; }
    if (forUpdate) { out.updatedAt = ts; }
    return out;
  }

  // =====================
  // DEBUG TOOLS (console: debugGestao.*)
  // =====================
  function buildDebugAPI() {
    const api = {
      help: function() {
        console.log('\ndebugGestao disponível. Funções úteis:\n\n'
          + 'debugGestao.info()               -> resumo do ambiente DOM/Firebase\n'
          + 'debugGestao.setVerbose(true)     -> liga logs verbosos\n'
          + 'debugGestao.checkFirebase()      -> testa leitura/escrita básicas\n'
          + 'debugGestao.readOnce()           -> lê uma vez (sem listener) e mostra documentos\n'
          + 'debugGestao.test.writeSample()   -> grava aluno DEBUG_SAMPLE\n'
          + 'debugGestao.test.clearSample()   -> apaga aluno DEBUG_SAMPLE\n'
          + 'debugGestao.toggleLive(false)    -> desliga listener em tempo real\n'
          + 'debugGestao.toggleLive(true)     -> religa listener em tempo real\n'
          + 'debugGestao.getCache()           -> retorna array alunoCache atual\n'
          + 'debugGestao.forceRender()        -> força re-render da tabela\n');
      },
      setVerbose: function(v) { DEBUG_VERBOSE = !!v; console.log('DEBUG_VERBOSE =', DEBUG_VERBOSE); },
      info: function() {
        const info = {
          hasForm: !!els.form,
          hasTbody: !!els.tbody,
          buscaId: !!els.busca,
          totalId: !!els.total,
          toastId: !!els.toast,
          firebaseReady: !!(window.isFirebaseReady && window.isFirebaseReady()),
          apps: (firebase && firebase.apps) ? firebase.apps.length : 'n/a',
          hasDb: !!db,
          collection: COLLECTION,
          user: (firebase && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser.email : null,
          cacheSize: alunosCache.length,
          listenerAttached: !!unsubLista
        };
        console.table(info);
        return info;
      },
      checkFirebase: async function() {
        const out = { ready: false, read: null, write: null };
        try {
          out.ready = !!(window.isFirebaseReady && window.isFirebaseReady() && db);
          const r = await db.collection(COLLECTION).limit(1).get();
          out.read = { ok: true, size: r.size };
        } catch (e) {
          out.read = { ok: false, code: e.code, msg: e.message };
        }
        try {
          await db.collection(COLLECTION).doc('DEBUG_CHECK').set({
            nome: 'Debug Check', turma: 'DZ',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          out.write = { ok: true };
          await db.collection(COLLECTION).doc('DEBUG_CHECK').delete();
        } catch (e2) {
          out.write = { ok: false, code: e2.code, msg: e2.message };
        }
        console.table(out);
        return out;
      },
      readOnce: async function() {
        try {
          const snap = await db.collection(COLLECTION).orderBy('nome').limit(25).get();
          const rows = snap.docs.map(function(d){ return { id: d.id, ...d.data() }; });
          console.log('readOnce ->', rows.length, 'doc(s)');
          console.dir(rows);
          alunosCache = rows;
          renderTable();
          return rows;
        } catch (e) {
          console.error('readOnce err:', e.code, e.message);
        }
      },
      test: {
        writeSample: async function() {
          const id = 'DEBUG_SAMPLE';
          await db.collection(COLLECTION).doc(id).set({
            id: id,
            nome: 'Aluno de Teste',
            turma: '1A',
            nascimento: '2010-01-01',
            responsavel: 'Resp Teste',
            telefone: '(00) 00000-0000',
            email: 'debug@example.com',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          console.log('DEBUG_SAMPLE gravado');
        },
        clearSample: async function() {
          await db.collection(COLLECTION).doc('DEBUG_SAMPLE').delete();
          console.log('DEBUG_SAMPLE removido');
        }
      },
      toggleLive: function(on) {
        if (on) { startLiveList(); console.log('listener ligado'); }
        else { stopLiveList(); console.log('listener desligado'); }
      },
      getCache: function() { return alunosCache.map(function(x){ return Object.assign({}, x); }); },
      forceRender: function() { renderTable(); }
    };
    return api;
  }

  // expõe API de debug no window
  window.debugGestao = buildDebugAPI();
  // dica rápida no console
  setTimeout(function(){ if (typeof console !== 'undefined' && window.debugGestao) window.debugGestao.help(); }, 500);

  // =====================
  // UTILITÁRIOS
  // =====================
  function toast(msg, tipo) {
    if (tipo == null) tipo = 'ok';
    if (els.toast) {
      els.toast.textContent = msg;
      els.toast.dataset.tipo = tipo; // CSS [data-tipo="erro"]
      els.toast.classList.add('show');
      setTimeout(function(){ if (els.toast) els.toast.classList.remove('show'); }, 3500);
    } else if (tipo === 'erro') {
      alert(msg);
    } else {
      console.log('[OK]', msg);
    }
  }

  function debugLog(){ if (DEBUG_VERBOSE) console.log.apply(console, ['[GESTAO]'].concat([].slice.call(arguments))); }
  function debugWarn(){ if (DEBUG_VERBOSE) console.warn.apply(console, ['[GESTAO]'].concat([].slice.call(arguments))); }

  function sleep(ms) { return new Promise(function(res){ setTimeout(res, ms); }); }

  function queryByType(root, type) { return root ? root.querySelector('[type="' + cssEscape(type) + '"]') : null; }

  function cleanSpaces(str) { return String(str || '').replace(/\s+/g, ' ').trim(); }

  function normalize(str) {
    // remove acentos via faixa unicode combinante
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Polyfill simples para CSS.escape que evita contrabarras
  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    var out = '';
    var s = String(value);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i);
      var c = s.charAt(i);
      if ((ch >= 48 && ch <= 57) || (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || c === '_' || c === '-') {
        out += c;
      } else {
        out += '_' + ch.toString(16);
      }
    }
    return out;
  }

  function scrollIntoViewSmooth(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (_) { el.scrollIntoView(); }
  }

  // LIMPEZA
  window.addEventListener('beforeunload', function(){ stopLiveList(); });
})();
