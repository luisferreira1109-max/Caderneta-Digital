/* Mercado: Comprar, Vender, Trocas e Histórico com o novo desenho (fundo branco). */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clubeNome(c) { return c === 'fcps' ? 'FC Paço de Sousa' : 'CCRDSV Irivo'; }
  function mini(clube, num) {
    var img = CROMOS_IMAGENS[clube + '-' + num];
    return img ? img.replace('/cromos/', '/cromos-mini/') : '';
  }
  function nomeCromo(clube, num) {
    if (num === 1) return 'Emblema';
    var j = JOGADORES[clube + '-' + num];
    return j ? j.nome : 'Cromo #' + num;
  }
  function fmt(v) { return parseFloat(v).toFixed(2).replace('.', ',') + ' €'; }

  /* ---------- Separadores internos ---------- */
  window.mudarTabMercado = function (tab) {
    ['comprar', 'vender', 'trocas', 'historico', 'minhas'].forEach(function (t) {
      var e = $('mercado-' + t); if (e) e.style.display = (t === tab) ? '' : 'none';
    });
    if (tab === 'comprar') carregarMercado();
    else if (tab === 'vender') carregarMinhaColecaoVenda();
    else if (tab === 'trocas') mzTrocasInicio();
    else if (tab === 'historico') mzHistorico();
  };

  /* ---------- VENDER ---------- */
  window.carregarMinhaColecaoVenda = async function () {
    var grid = $('mercado-minha-colecao'); if (!grid) return;
    try { await carregarColecao(); } catch (e) {}
    grid.innerHTML = '';
    $('mercado-form-venda').style.display = 'none';
    var cromos = (_colecaoTodos || []).slice().sort(function (a, b) { return a.clube === b.clube ? a.num_cromo - b.num_cromo : (a.clube < b.clube ? -1 : 1); });
    if (!cromos.length) { grid.innerHTML = '<div class="mw-vazio">Ainda não tens cromos para vender.</div>'; return; }
    cromos.forEach(function (c) {
      var m = mini(c.clube, c.num_cromo);
      var d = document.createElement('div');
      d.className = 'mw-cromo';
      d.title = nomeCromo(c.clube, c.num_cromo);
      d.innerHTML = (m ? '<img src="' + m + '" alt="">' : '#' + c.num_cromo) + (c.quantidade > 1 ? '<span class="mw-qtd">x' + c.quantidade + '</span>' : '');
      d.onclick = function () {
        grid.querySelectorAll('.mw-cromo').forEach(function (x) { x.classList.remove('sel'); });
        d.classList.add('sel'); selecionarCromoVenda(c);
      };
      grid.appendChild(d);
    });
  };

  window.selecionarCromoVenda = function (cromo) {
    _mercadoCromoSelecionado = cromo;
    var m = mini(cromo.clube, cromo.num_cromo);
    $('mercado-cromo-preview').innerHTML = m ? '<img src="' + m + '" alt="">' : '#' + cromo.num_cromo;
    $('mercado-cromo-info').textContent = nomeCromo(cromo.clube, cromo.num_cromo);
    $('mercado-cromo-sub').textContent = clubeNome(cromo.clube) + ' · ' + (getEscalao(cromo.clube, cromo.num_cromo) || '—') + ' · Nº ' + cromo.num_cromo;
    $('mercado-form-venda').style.display = '';
    var rec = $('mercado-recebes'), pag = $('mercado-preco');
    rec.value = ''; pag.value = '';
    rec.oninput = function () {
      var v = parseFloat(rec.value) || 0;
      pag.value = v > 0 ? (Math.round(v * 1.10 * 100) / 100).toFixed(2) : '';
    };
    rec.focus();
  };

  var _cancelar = window.cancelarVenda;
  window.cancelarVenda = async function (id, clube, num) { await _cancelar(id, clube, num); mzHistorico(); };

  window.fecharVendaPopup = function () {
    var f = $('mercado-form-venda'); if (f) f.style.display = 'none';
    _mercadoCromoSelecionado = null;
    document.querySelectorAll('#mercado-minha-colecao .mw-cromo.sel').forEach(function (x) { x.classList.remove('sel'); });
  };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') window.fecharVendaPopup(); });

  var _publicar = window.publicarVenda;
  window.publicarVenda = async function () {
    await _publicar();
    var r = $('mercado-recebes'); if (r && !_mercadoCromoSelecionado) r.value = '';
    carregarMinhaColecaoVenda();
  };

  /* ---------- PROPOSTA (na lista do Comprar) ---------- */
  function fecharDialogo() { var d = $('mz-dialogo'); if (d) d.remove(); }
  window.mzFecharDialogo = fecharDialogo;
  window.mzProposta = function (vendaId) {
    var v = (_mercadoVendasVisiveis || []).filter(function (x) { return String(x.id) === String(vendaId); })[0];
    if (!v) return;
    fecharDialogo();
    var minhas = (_colecaoTodos || []);
    var grelha = minhas.length ? minhas.map(function (c) {
      var m = mini(c.clube, c.num_cromo);
      return '<div class="mw-cromo" data-k="' + c.clube + '-' + c.num_cromo + '" title="' + esc(nomeCromo(c.clube, c.num_cromo)) + '">' + (m ? '<img src="' + m + '" alt="">' : '#' + c.num_cromo) + '</div>';
    }).join('') : '<div class="mw-vazio">Ainda não tens cromos para oferecer.</div>';
    var d = document.createElement('div');
    d.id = 'mz-dialogo'; d.className = 'mz-dialogo';
    d.innerHTML = '<div class="mz-caixa" onclick="event.stopPropagation()">' +
      '<div class="mz-caixa-tit">Fazer proposta</div>' +
      '<div class="mz-caixa-sub">' + esc(nomeCromo(v.clube, v.num_cromo)) + ' · ' + clubeNome(v.clube) + ' · Nº ' + v.num_cromo + '</div>' +
      '<div class="mz-sep"><button class="on" data-m="troca">Trocar por um cromo meu</button><button data-m="preco">Propor um preço</button></div>' +
      '<div id="mz-m-troca"><p class="mw-sub">Escolhe até 4 cromos para oferecer.</p><div class="mw-grid mw-grid-peq">' + grelha + '</div></div>' +
      '<div id="mz-m-preco" style="display:none">' +
        '<div class="mw-linha"><label>O vendedor recebe:</label><input id="mz-prop-recebe" type="number" min="0.10" step="0.01" placeholder="0,00 €"/></div>' +
        '<div class="mw-linha"><label>Tu pagas:</label><input id="mz-prop-paga" type="text" readonly placeholder="0,00 €"/><span class="mw-taxas">(inclui taxas)</span></div>' +
        '<p class="mw-aviso">O comprador paga mais <strong>10%</strong> do valor proposto. Essa taxa fica para a Caderneta Digital.</p>' +
      '</div>' +
      '<div class="mz-caixa-btns"><button class="mw-btn mw-btn-sec" onclick="mzFecharDialogo()">Cancelar</button><button class="mw-btn" id="mz-prop-enviar">Fazer proposta</button></div>' +
      '</div>';
    d.onclick = fecharDialogo;
    document.body.appendChild(d);
    d.querySelectorAll('.mz-sep button').forEach(function (b) {
      b.onclick = function () {
        d.querySelectorAll('.mz-sep button').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('mz-m-troca').style.display = b.dataset.m === 'troca' ? '' : 'none';
        $('mz-m-preco').style.display = b.dataset.m === 'preco' ? '' : 'none';
      };
    });
    d.querySelectorAll('#mz-m-troca .mw-cromo').forEach(function (c) {
      c.onclick = function () {
        if (!c.classList.contains('sel') && d.querySelectorAll('#mz-m-troca .mw-cromo.sel').length >= 4) { mostrarNotificacao('Só podes oferecer até 4 cromos de cada vez.', 'erro'); return; }
        c.classList.toggle('sel');
      };
    });
    var rec = $('mz-prop-recebe');
    rec.oninput = function () { var x = parseFloat(rec.value) || 0; $('mz-prop-paga').value = x > 0 ? (Math.round(x * 1.10 * 100) / 100).toFixed(2) + ' €' : ''; };
    $('mz-prop-enviar').onclick = function () {
      mostrarNotificacao('As propostas ficam disponíveis na próxima atualização.', 'info');
      fecharDialogo();
    };
  };

  /* ---------- TROCAS (entre amigos e públicas) ---------- */
  var _amigoTroca = null, _meuSel = null, _delSel = null, _invAmigo = [];
  var MAX_TROCA = 4;

  function grupoCromos(arr, cls) {
    return '<div class="tr-grupo ' + (cls || '') + '">' + (arr || []).map(function (x) { return cromoHist(x.clube, x.num); }).join('') + '</div>';
  }
  function avaHtml(nome, av) { return av ? '<img src="' + esc(av) + '" alt="">' : esc((nome || '?')[0].toUpperCase()); }
  function atualizarTudo() {
    try { if (typeof carregarColecao === 'function') carregarColecao(); } catch (e) {}
    try { if (typeof atualizarContadorMensagens === 'function') atualizarContadorMensagens(); } catch (e) {}
    try { if (typeof atualizarSaldoUI === 'function') atualizarSaldoUI(); } catch (e) {}
    try { if (window.carregarTrocasAtividade) window.carregarTrocasAtividade(); } catch (e) {}
  }
  function erroTroca(e) {
    var m = (e && e.message) || '';
    if (/sem_cromo/.test(m)) return 'Já não tens um dos cromos necessários para esta troca.';
    if (/amigo_sem_cromo/.test(m)) return 'O teu amigo já não tem um dos cromos que pediste.';
    if (/troca_indisponivel/.test(m)) return 'Esta proposta já não está disponível.';
    if (/demasiadas_propostas/.test(m)) return 'Já tens muitas propostas ativas (máximo 20).';
    if (/nao_sao_amigos/.test(m)) return 'Só podes propor trocas a amigos.';
    if (/troca_propria/.test(m)) return 'Não podes aceitar a tua própria proposta.';
    return 'Não foi possível concluir a troca. Tenta novamente.';
  }
  window.aceitarTrocaRpc = async function (id) {
    var r = await sb.rpc('aceitar_troca', { p_id: id });
    if (r.error) { mostrarNotificacao(erroTroca(r.error), 'erro'); atualizarTudo(); return false; }
    mostrarNotificacao('✅ Troca realizada com sucesso!', 'sucesso'); atualizarTudo(); return true;
  };
  window.recusarTrocaRpc = async function (id) {
    var r = await sb.rpc('recusar_troca', { p_id: id });
    if (r.error) { mostrarNotificacao(erroTroca(r.error), 'erro'); atualizarTudo(); return false; }
    mostrarNotificacao('Troca recusada.', 'info'); atualizarTudo(); return true;
  };
  window.cancelarTroca = async function (id) {
    var r = await sb.rpc('cancelar_troca', { p_id: id });
    if (r.error) { mostrarNotificacao(erroTroca(r.error), 'erro'); }
    else mostrarNotificacao('Proposta cancelada. Os cromos voltaram para a tua coleção.', 'info');
    atualizarTudo();
    if ($('troca-amigos') && $('troca-amigos').style.display !== 'none') mzTrocasInicio();
  };

  window.mzTrocasInicio = async function () {
    var box = $('troca-amigos'); box.style.display = ''; $('troca-ecra').style.display = 'none';
    box.innerHTML =
      '<h4 class="mw-tit">Trocas</h4>' +
      '<p class="mw-sub">Escolhe um amigo para lhe propor uma troca, ou faz uma proposta pública que qualquer jogador pode aceitar.</p>' +
      '<div id="troca-amigos-lista" class="mw-amigos"><div class="mw-vazio">A carregar amigos...</div></div>' +
      '<h4 class="mw-tit tr-sec">Propostas públicas</h4><div id="trocas-pub" class="tr-lista"></div>' +
      '<h4 class="mw-tit tr-sec">As tuas propostas ativas</h4><div id="trocas-minhas" class="tr-lista"></div>';
    var lista = $('troca-amigos-lista');
    try {
      var r = await sb.auth.getUser(); var u = r.data.user; if (!u) return;
      var a1 = (await sb.from('amigos').select('*').eq('user_id', u.id).eq('status', 'aceite')).data || [];
      var a2 = (await sb.from('amigos').select('*').eq('amigo_id', u.id).eq('status', 'aceite')).data || [];
      var ids = a1.map(function (x) { return x.amigo_id; }).concat(a2.map(function (x) { return x.user_id; }));
      var amigos = [];
      for (var i = 0; i < ids.length; i++) {
        var p = (await sb.from('perfis_publicos').select('id, display_name, avatar_url').eq('id', ids[i]).single()).data;
        if (p) amigos.push(p);
      }
      lista.innerHTML = '';
      var pub = document.createElement('div'); pub.className = 'mw-amigo mw-amigo-pub';
      pub.innerHTML = '<div class="mw-amigo-ava">🌍</div><div class="mw-amigo-nome">Proposta pública</div><div class="mw-amigo-cta">Para todos</div>';
      pub.onclick = function () { mzAbrirTroca(null); };
      lista.appendChild(pub);
      amigos.forEach(function (p) {
        var c = document.createElement('div'); c.className = 'mw-amigo';
        c.innerHTML = '<div class="mw-amigo-ava">' + avaHtml(p.display_name, p.avatar_url) + '</div><div class="mw-amigo-nome">' + esc(p.display_name || 'Utilizador') + '</div><div class="mw-amigo-cta">Trocar</div>';
        c.onclick = function () { mzAbrirTroca(p); };
        lista.appendChild(c);
      });
    } catch (e) { lista.innerHTML = '<div class="mw-vazio">Não foi possível carregar os amigos.</div>'; }

    /* propostas públicas de outros jogadores */
    try {
      var pubs = (await sb.rpc('trocas_publicas')).data || [];
      var cp = $('trocas-pub'); if (!cp) return;
      if (!pubs.length) cp.innerHTML = '<div class="mw-vazio">Não há propostas públicas neste momento.</div>';
      pubs.forEach(function (t) {
        var row = document.createElement('div'); row.className = 'tr-linha';
        row.innerHTML = '<div class="mz-pedido-ava">' + avaHtml(t.nome, t.avatar_url) + '</div>' +
          '<div class="tr-info"><strong>' + esc(t.nome) + '</strong><span>oferece</span></div>' + grupoCromos(t.oferta) +
          '<div class="tr-seta">⇄</div><div class="tr-info"><span>quer</span></div>' + grupoCromos(t.pedido) +
          '<button class="tr-btn" type="button">Aceitar</button>';
        row.querySelector('.tr-btn').onclick = async function () { this.disabled = true; await aceitarTrocaRpc(t.id); mzTrocasInicio(); };
        cp.appendChild(row);
      });
    } catch (e) {}

    /* as minhas propostas */
    try {
      var r2 = await sb.auth.getUser(); var me = r2.data.user;
      var mine = (await sb.from('mercado_trocas').select('*').eq('proponente_id', me.id).eq('estado', 'pendente').order('criado_em', { ascending: false })).data || [];
      var cm = $('trocas-minhas'); if (!cm) return;
      if (!mine.length) { cm.innerHTML = '<div class="mw-vazio">Não tens propostas ativas.</div>'; return; }
      var dests = {};
      var did = mine.filter(function (t) { return t.destinatario_id; }).map(function (t) { return t.destinatario_id; });
      if (did.length) { ((await sb.from('perfis_publicos').select('id, display_name').in('id', did)).data || []).forEach(function (p) { dests[p.id] = p.display_name; }); }
      mine.forEach(function (t) {
        var row = document.createElement('div'); row.className = 'tr-linha';
        row.innerHTML = '<div class="tr-info"><strong>' + (t.destinatario_id ? 'Para ' + esc(dests[t.destinatario_id] || 'amigo') : 'Pública') + '</strong><span>ofereces</span></div>' + grupoCromos(t.oferta) +
          '<div class="tr-seta">⇄</div><div class="tr-info"><span>queres</span></div>' + grupoCromos(t.pedido) +
          '<button class="tr-btn tr-btn-no" type="button">Cancelar</button>';
        row.querySelector('.tr-btn').onclick = function () { this.disabled = true; cancelarTroca(t.id); };
        cm.appendChild(row);
      });
    } catch (e) {}
  };

  window.mzAbrirTroca = async function (amigo) {
    var publica = !amigo;
    try { await carregarColecao(); } catch (e) {}
    _amigoTroca = amigo; _meuSel = []; _delSel = []; _invAmigo = [];
    if (publica) {
      ['fcps', 'ccrdsv'].forEach(function (cl) { Object.keys(CROMOS_IMAGENS).forEach(function (k) { if (k.indexOf(cl + '-') === 0) _invAmigo.push({ clube: cl, num_cromo: parseInt(k.split('-')[1], 10) }); }); });
    } else {
      try { var q = await sb.rpc('inventario_amigo', { p_amigo: amigo.id }); _invAmigo = q.data || []; } catch (e) {}
    }
    $('troca-amigos').style.display = 'none';
    var ec = $('troca-ecra'); ec.style.display = '';
    var nome = publica ? 'Todos os cromos' : esc(amigo.display_name || 'Utilizador');
    ec.innerHTML =
      '<div class="mz-voltar mz-voltar-peq" onclick="mzTrocasInicio()">← Voltar às trocas</div>' +
      '<div class="mt-cols">' +
        '<div class="mt-esq">' +
          '<div class="mt-tabs"><button class="on" data-t="meu">O teu inventário</button><button data-t="dele">' + nome + '</button></div>' +
          '<div id="mt-grid" class="mw-grid mw-grid-peq"></div>' +
        '</div>' +
        '<div class="mt-dir">' +
          '<div class="mt-bloco"><div class="mt-tit">Os teus itens <small id="mt-cont-meu">0/' + MAX_TROCA + '</small></div><div class="mt-slots" id="mt-slots-meu"></div></div>' +
          '<div class="mt-setas">⇅</div>' +
          '<div class="mt-bloco"><div class="mt-tit">' + (publica ? 'Os cromos que queres' : 'Os itens de ' + nome) + ' <small id="mt-cont-dele">0/' + MAX_TROCA + '</small></div><div class="mt-slots" id="mt-slots-dele"></div></div>' +
          '<p class="mw-aviso">' + (publica
            ? 'Podes trocar até ' + MAX_TROCA + ' cromos de cada lado. Qualquer jogador que tenha os cromos que pedes pode aceitar a tua proposta. Os teus cromos ficam guardados até alguém aceitar ou tu cancelares.'
            : 'Podes trocar até ' + MAX_TROCA + ' cromos de cada lado. ' + nome + ' vai ver a tua proposta nas Atividades recentes e pode aceitar ou recusar. Os teus cromos ficam guardados até lá.') + '</p>' +
          '<button class="mw-btn" id="mt-enviar" disabled>Fazer proposta</button>' +
        '</div>' +
      '</div>';
    var tab = 'meu';
    function chave(c) { return c.clube + '-' + c.num_cromo; }
    function noSel(arr, c) { return arr.some(function (x) { return chave(x) === chave(c); }); }
    function pintar() {
      var g = $('mt-grid'); g.innerHTML = '';
      var inv = tab === 'meu' ? (_colecaoTodos || []) : _invAmigo;
      var sel = tab === 'meu' ? _meuSel : _delSel;
      if (!inv.length) { g.innerHTML = '<div class="mw-vazio">' + (tab === 'meu' ? 'Não tens cromos.' : 'Sem cromos disponíveis.') + '</div>'; return; }
      inv.slice().sort(function (a, b) { return a.clube === b.clube ? a.num_cromo - b.num_cromo : (a.clube < b.clube ? -1 : 1); }).forEach(function (c) {
        var m = mini(c.clube, c.num_cromo);
        var d = document.createElement('div'); d.className = 'mw-cromo';
        if (noSel(sel, c)) d.classList.add('sel');
        d.title = nomeCromo(c.clube, c.num_cromo);
        d.innerHTML = m ? '<img src="' + m + '" alt="">' : '#' + c.num_cromo;
        d.onclick = function () {
          var i = sel.findIndex(function (x) { return chave(x) === chave(c); });
          if (i >= 0) sel.splice(i, 1);
          else if (sel.length >= MAX_TROCA) { mostrarNotificacao('Só podes trocar até ' + MAX_TROCA + ' cromos de cada lado.', 'erro'); return; }
          else sel.push(c);
          pintarSlots(); pintar();
        };
        g.appendChild(d);
      });
    }
    function slots(id, arr, lado) {
      var e = $(id); e.innerHTML = '';
      for (var i = 0; i < MAX_TROCA; i++) {
        var c = arr[i]; var d = document.createElement('div'); d.className = 'mt-slot' + (c ? ' cheio' : '');
        if (c) {
          var m = mini(c.clube, c.num_cromo);
          d.innerHTML = (m ? '<img src="' + m + '" alt="">' : '#' + c.num_cromo) + '<button class="mt-x" title="Tirar">×</button>';
          (function (cc) { d.querySelector('.mt-x').onclick = function () { var j = arr.findIndex(function (x) { return chave(x) === chave(cc); }); if (j >= 0) arr.splice(j, 1); pintarSlots(); pintar(); }; })(c);
        }
        e.appendChild(d);
      }
      $('mt-cont-' + lado).textContent = arr.length + '/' + MAX_TROCA;
    }
    function pintarSlots() {
      slots('mt-slots-meu', _meuSel, 'meu');
      slots('mt-slots-dele', _delSel, 'dele');
      $('mt-enviar').disabled = !(_meuSel.length && _delSel.length);
    }
    ec.querySelectorAll('.mt-tabs button').forEach(function (b) {
      b.onclick = function () { tab = b.dataset.t; ec.querySelectorAll('.mt-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); pintar(); };
    });
    $('mt-enviar').onclick = async function () {
      var btn = this; btn.disabled = true;
      var conv = function (arr) { return arr.map(function (c) { return { clube: c.clube, num: c.num_cromo }; }); };
      var r = await sb.rpc('propor_troca', { p_dest: publica ? null : amigo.id, p_oferta: conv(_meuSel), p_pedido: conv(_delSel) });
      if (r.error) { mostrarNotificacao(erroTroca(r.error), 'erro'); btn.disabled = false; atualizarTudo(); return; }
      mostrarNotificacao(publica ? '✅ Proposta pública publicada!' : '✅ Proposta enviada a ' + (amigo.display_name || 'amigo') + '!', 'sucesso');
      atualizarTudo(); mzTrocasInicio();
    };
    pintarSlots(); pintar();
  };

  /* ---------- Propostas recebidas, nas Atividades recentes ---------- */
  window.carregarTrocasAtividade = async function () {
    try {
      var r = await sb.auth.getUser(); if (!r.data.user) return;
      var ref = document.getElementById('mz-pedidos-ativ'); if (!ref) return;
      var cont = document.getElementById('mz-trocas-ativ');
      if (!cont) { cont = document.createElement('div'); cont.id = 'mz-trocas-ativ'; ref.insertAdjacentElement('beforebegin', cont); }
      var ts = (await sb.rpc('trocas_para_mim')).data || [];
      cont.innerHTML = '';
      ts.forEach(function (t) {
        var d = document.createElement('div'); d.className = 'mz-troca';
        d.innerHTML = '<div class="mz-troca-topo"><div class="mz-pedido-ava">' + avaHtml(t.nome, t.avatar_url) + '</div>' +
          '<div class="mz-pedido-txt"><strong>' + esc(t.nome) + '</strong> propõe-te uma troca</div>' +
          '<div class="mz-pedido-btns"><button class="mzt-ok" type="button">Aceitar</button><button class="mzt-no" type="button">Recusar</button></div></div>' +
          '<div class="mz-troca-cromos"><span>Oferece</span>' + grupoCromos(t.oferta) + '<span class="tr-seta">⇄</span><span>Quer</span>' + grupoCromos(t.pedido) + '</div>';
        d.querySelector('.mzt-ok').onclick = async function () { d.querySelectorAll('button').forEach(function (b) { b.disabled = true; }); await aceitarTrocaRpc(t.id); carregarTrocasAtividade(); };
        d.querySelector('.mzt-no').onclick = async function () { d.querySelectorAll('button').forEach(function (b) { b.disabled = true; }); await recusarTrocaRpc(t.id); carregarTrocasAtividade(); };
        cont.appendChild(d);
      });
    } catch (e) {}
  };
  setTimeout(function () { carregarTrocasAtividade(); }, 3000);
  setInterval(function () { carregarTrocasAtividade(); }, 15000);

  /* ---------- HISTÓRICO ---------- */
  var SETA_SAI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var SETA_ENTRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7 7 17M15 17H7V9"/></svg>';
  function cromoHist(clube, num) {
    var m = mini(clube, num);
    return '<div class="mh-cromo">' + (m ? '<img src="' + m + '" alt="">' : '#' + num) + '</div>';
  }
  window.mzHistorico = async function () {
    var lista = $('historico-lista'); if (!lista.children.length) lista.innerHTML = '<div class="mw-vazio">A carregar...</div>';
    try {
      var r = await sb.auth.getUser(); var user = r.data.user; if (!user) return;
      var hist = (await sb.from('mercado_historico').select('*').or('user1_id.eq.' + user.id + ',user2_id.eq.' + user.id).order('criado_em', { ascending: false }).limit(50)).data || [];
      var ativas = (await sb.from('mercado_vendas').select('*').eq('vendedor_id', user.id).eq('estado', 'ativo').order('criado_em', { ascending: false })).data || [];
      if (!hist.length && !ativas.length) { lista.innerHTML = '<div class="mw-vazio">Ainda não tens compras, vendas ou trocas.</div>'; return; }
      var outros = {}; hist.forEach(function (h) { outros[h.user1_id === user.id ? h.user2_id : h.user1_id] = 1; });
      var nomes = {};
      try {
        var ps = (await sb.from('perfis_publicos').select('id, display_name').in('id', Object.keys(outros))).data || [];
        ps.forEach(function (p) { nomes[p.id] = p.display_name; });
      } catch (e) {}
      lista.innerHTML = '';
      ativas.forEach(function (v) {
        var row = document.createElement('div'); row.className = 'mh-linha mh-ativa';
        row.innerHTML = cromoHist(v.clube, v.num_cromo) +
          '<div class="mh-seta sai">' + SETA_SAI + '</div>' +
          '<div class="mh-info"><div class="mh-tipo">À venda</div><div class="mh-nome">' + esc(nomeCromo(v.clube, v.num_cromo)) + '</div><div class="mh-cromo-nome">À espera de comprador · pedes ' + fmt(v.preco) + '</div></div>' +
          '<div class="mh-valor pend">+' + fmt(v.preco_vendedor != null ? v.preco_vendedor : v.preco / 1.1) + '</div>' +
          '<div class="mh-data"><button class="mh-cancelar" type="button">Cancelar</button></div>';
        row.querySelector('button').onclick = function () { cancelarVenda(v.id, v.clube, v.num_cromo); };
        lista.appendChild(row);
      });
      hist.forEach(function (h) {
        var souU1 = h.user1_id === user.id;
        var outro = nomes[souU1 ? h.user2_id : h.user1_id] || 'Utilizador';
        var data = new Date(h.criado_em).toLocaleDateString('pt-PT');
        var row = document.createElement('div'); row.className = 'mh-linha';
        if (h.tipo === 'venda') {
          var vendi = souU1;
          row.innerHTML = cromoHist(h.clube1, h.num_cromo1) +
            '<div class="mh-seta ' + (vendi ? 'sai' : 'entra') + '">' + (vendi ? SETA_SAI : SETA_ENTRA) + '</div>' +
            '<div class="mh-info"><div class="mh-tipo">' + (vendi ? 'Venda' : 'Compra') + '</div><div class="mh-nome">' + esc(outro) + '</div><div class="mh-cromo-nome">' + esc(nomeCromo(h.clube1, h.num_cromo1)) + '</div></div>' +
            '<div class="mh-valor ' + (vendi ? 'mais' : 'menos') + '">' + (vendi ? '+' + fmt(h.preco_vendedor != null ? h.preco_vendedor : h.preco) : '−' + fmt(h.preco)) + '</div>' +
            '<div class="mh-data">' + data + '</div>';
        } else {
          var of = (h.oferta && h.oferta.length) ? h.oferta : [{ clube: h.clube1, num: h.num_cromo1 }];
          var pe = (h.pedido && h.pedido.length) ? h.pedido : [{ clube: h.clube2, num: h.num_cromo2 }];
          var sai = souU1 ? of : pe, entra = souU1 ? pe : of;
          row.className += ' mh-troca mh-troca-multi';
          row.innerHTML = '<div class="mh-grupos">' +
              '<div class="mh-g"><div class="mh-seta sai">' + SETA_SAI + '</div>' + sai.map(function (x) { return cromoHist(x.clube, x.num); }).join('') + '</div>' +
              '<div class="mh-g"><div class="mh-seta entra">' + SETA_ENTRA + '</div>' + entra.map(function (x) { return cromoHist(x.clube, x.num); }).join('') + '</div>' +
            '</div>' +
            '<div class="mh-info"><div class="mh-tipo">Troca</div><div class="mh-nome">' + esc(outro) + '</div><div class="mh-cromo-nome">' + esc(sai.map(function (x) { return nomeCromo(x.clube, x.num); }).join(', ')) + ' ⇄ ' + esc(entra.map(function (x) { return nomeCromo(x.clube, x.num); }).join(', ')) + '</div></div>' +
            '<div class="mh-valor"></div><div class="mh-data">' + data + '</div>';
        }
        lista.appendChild(row);
      });
    } catch (e) { lista.innerHTML = '<div class="mw-vazio">Não foi possível carregar o histórico.</div>'; }
  };
})();
