/* Menu em mosaicos: separadores, perfil e botão Voltar. Não altera a lógica existente. */
(function () {
  var TAB_DE_PAGINA = {
    inicio: 'inicio', packs: 'inicio',
    colecaohub: 'colecao', cadernetas: 'colecao', colecao: 'colecao',
    mercado: 'mercado', amigos: 'amigos', definicoes: null
  };
  var VOLTAR_PARA = { packs: 'inicio', cadernetas: 'colecaohub', colecao: 'colecaohub', definicoes: 'inicio' };
  var historico = ['inicio'];

  var orig = window.mostrarPagina;
  window.mostrarPagina = function (nome, el) {
    orig(nome, el);
    document.body.setAttribute('data-pg', nome);
    var tab = TAB_DE_PAGINA[nome];
    document.querySelectorAll('.mz-tab').forEach(function (t) {
      t.classList.toggle('ativo', t.getAttribute('data-tab') === tab);
    });
    if (nome === 'packs') { try { carregarPacksOferecidos(); } catch (e) {} }
    if (nome === 'amigos') window.mzAmigosHub();
    if (nome === 'mercado') window.mzMercadoHub();
    if (historico[historico.length - 1] !== nome) historico.push(nome);
    var c = document.querySelector('.content'); if (c) c.scrollTop = 0;
  };

  window.mzTab = function (t) {
    if (t === 'inicio') window.mostrarPagina('inicio');
    else if (t === 'colecao') window.mostrarPagina('colecaohub');
    else if (t === 'mercado') {
      window.mostrarPagina('mercado');
      try { carregarMercado(); renderTrocaPedidoGrid(); } catch (e) {}
    } else if (t === 'amigos') {
      window.mostrarPagina('amigos');
      try { carregarAmigos(); } catch (e) {}
    }
  };

  /* Botão "Voltar" nas páginas interiores */
  Object.keys(VOLTAR_PARA).forEach(function (nome) {
    var pg = document.getElementById('pagina-' + nome);
    if (!pg) return;
    var b = document.createElement('div');
    b.className = 'mz-voltar';
    b.textContent = '← Voltar';
    b.onclick = function () { window.mostrarPagina(VOLTAR_PARA[nome]); };
    pg.insertBefore(b, pg.firstChild);
  });

  /* Menu da foto de perfil */
  var togglePerfil = window.togglePerfilMenu;
  window.togglePerfilMenu = function (e) {
    var m = document.getElementById('perfil-menu');
    if (m && !m.classList.contains('show')) m.classList.remove('pm-modo-form');
    togglePerfil(e);
  };
  window.pmAlterarNome = function () {
    document.getElementById('perfil-menu').classList.add('pm-modo-form');
    var i = document.getElementById('perfil-nome-input'); if (i) { i.focus(); i.select(); }
  };
  window.pmAlterarFoto = function () {
    document.getElementById('perfil-menu').classList.add('pm-modo-form');
  };
  window.pmDefinicoes = function () {
    document.getElementById('perfil-menu').classList.remove('show');
    window.mostrarPagina('definicoes');
    try { mostrarDefinicoes(); } catch (e) {}
  };

  /* ----- Mercado ----- */
  function ver(id, on) { var e = document.getElementById(id); if (e) e.style.display = on ? '' : 'none'; }
  window.mzMercadoHub = function () { ver('mercado-hub', true); ver('mercado-painel', false); };
  window.mzMercado = function (tab) {
    ver('mercado-hub', false); ver('mercado-painel', true);
    try { mudarTabMercado(tab); renderTrocaPedidoGrid(); } catch (e) {}
  };

  /* ----- Amigos ----- */
  window.mzAmigosHub = function () { ver('amigos-hub', true); ver('amigos-painel', false); };
  window.mzAmigos = function (sub) {
    ver('amigos-hub', false); ver('amigos-painel', true);
    ['codigo', 'qr', 'lista', 'chat'].forEach(function (k) { ver('am-' + k, k === sub); });
    try { if (sub === 'chat') mzChatInicio(); else carregarAmigos(); } catch (e) {}
  };
  window.mzCopiarCodigo = function () {
    var c = document.getElementById('meu-codigo-valor').textContent;
    try { navigator.clipboard.writeText(c); } catch (e) {}
    var b = event && event.target; if (b) { var t = b.textContent; b.textContent = 'Copiado ✔'; setTimeout(function () { b.textContent = t; }, 1500); }
  };
  var cod = document.getElementById('meu-codigo-valor');
  if (cod) new MutationObserver(function () {
    var m = document.getElementById('mz-codigo-mini'); if (m) m.textContent = cod.textContent;
  }).observe(cod, { childList: true, characterData: true, subtree: true });

  var qrGrande = document.getElementById('meu-qr-canvas');
  if (qrGrande) new MutationObserver(function () {
    var m = document.getElementById('mz-qr-mini'); if (m) m.src = qrGrande.src;
  }).observe(qrGrande, { attributes: true, attributeFilter: ['src'] });

  window._mzPed = 0; window._mzMsg = 0;
  window.mzPonto = function () {
    var p = document.getElementById('mz-ponto-amigos');
    if (p) p.classList.toggle('on', (window._mzPed || 0) + (window._mzMsg || 0) > 0);
  };

  /* ----- Pedidos de amizade nas Atividades recentes ----- */
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  async function carregarPedidosAtividade() {
    try {
      var r = await sb.auth.getUser(); var user = r.data && r.data.user; if (!user) return;
      var q = await sb.from('amigos').select('id,user_id').eq('amigo_id', user.id).eq('status', 'pendente');
      var pedidos = q.data || [];
      var cont = document.getElementById('mz-pedidos-ativ');
      var ponto = document.getElementById('mz-ponto-amigos');
      window._mzPed = pedidos.length; window.mzPonto();
      if (!cont) return;
      var html = '';
      for (var i = 0; i < pedidos.length; i++) {
        var pr = await sb.from('profiles').select('display_name,avatar_url').eq('id', pedidos[i].user_id).single();
        var nome = (pr.data && pr.data.display_name) || 'Utilizador';
        var av = pr.data && pr.data.avatar_url;
        html += '<div class="mz-pedido"><div class="mz-pedido-ava">' + (av ? '<img src="' + esc(av) + '">' : esc(nome[0].toUpperCase())) +
          '</div><div class="mz-pedido-txt"><strong>' + esc(nome) + '</strong> pediu-te amizade</div>' +
          '<div class="mz-pedido-btns"><button class="mz-btn-ok" data-id="' + pedidos[i].id + '" data-u="' + pedidos[i].user_id + '">Aceitar</button>' +
          '<button class="mz-btn-no" data-id="' + pedidos[i].id + '">Recusar</button></div></div>';
      }
      cont.innerHTML = html;
    } catch (e) {}
  }
  document.addEventListener('click', async function (ev) {
    var ok = ev.target.closest('.mz-btn-ok'), no = ev.target.closest('.mz-btn-no');
    if (!ok && !no) return;
    var b = ok || no; b.disabled = true;
    try {
      if (ok) await aceitarPedido(ok.dataset.id, ok.dataset.u);
      else await recusarPedido(no.dataset.id);
    } catch (e) {}
    carregarPedidosAtividade();
  });
  window.carregarPedidosAtividade = carregarPedidosAtividade;
  setTimeout(carregarPedidosAtividade, 2500);
  setInterval(carregarPedidosAtividade, 20000);

  document.body.setAttribute('data-pg', 'inicio');

  /* abrir um separador pedido por outra página (ex.: dashboard.html#mercado) */
  var h = (location.hash || '').replace('#', '');
  if (['inicio', 'colecao', 'mercado', 'amigos'].indexOf(h) >= 0 && h !== 'inicio') {
    setTimeout(function () { window.mzTab(h); }, 600);
  }
})();
