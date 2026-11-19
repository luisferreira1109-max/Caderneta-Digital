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
  window.carregarMinhaColecaoVenda = function () {
    var grid = $('mercado-minha-colecao'); if (!grid) return;
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

  /* ---------- TROCAS (entre amigos) ---------- */
  var _amigoTroca = null, _meuSel = null, _delSel = null, _invAmigo = [];

  window.mzTrocasInicio = async function () {
    $('troca-amigos').style.display = ''; $('troca-ecra').style.display = 'none';
    var lista = $('troca-amigos-lista'); lista.innerHTML = '<div class="mw-vazio">A carregar amigos...</div>';
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
      if (!amigos.length) { lista.innerHTML = '<div class="mw-vazio">Ainda não tens amigos. Adiciona amigos no separador Amigos para poderes trocar cromos.</div>'; return; }
      lista.innerHTML = '';
      amigos.forEach(function (p) {
        var c = document.createElement('div'); c.className = 'mw-amigo';
        c.innerHTML = '<div class="mw-amigo-ava">' + (p.avatar_url ? '<img src="' + esc(p.avatar_url) + '" alt="">' : esc((p.display_name || '?')[0].toUpperCase())) + '</div><div class="mw-amigo-nome">' + esc(p.display_name || 'Utilizador') + '</div><div class="mw-amigo-cta">Trocar</div>';
        c.onclick = function () { mzAbrirTroca(p); };
        lista.appendChild(c);
      });
    } catch (e) { lista.innerHTML = '<div class="mw-vazio">Não foi possível carregar os amigos.</div>'; }
  };

  var MAX_TROCA = 4;
  window.mzAbrirTroca = async function (amigo) {
    _amigoTroca = amigo; _meuSel = []; _delSel = []; _invAmigo = [];
    try { var q = await sb.rpc('inventario_amigo', { p_amigo: amigo.id }); _invAmigo = q.data || []; } catch (e) {}
    $('troca-amigos').style.display = 'none';
    var ec = $('troca-ecra'); ec.style.display = '';
    var nome = esc(amigo.display_name || 'Utilizador');
    ec.innerHTML =
      '<div class="mz-voltar mz-voltar-peq" onclick="mzTrocasInicio()">← Outros amigos</div>' +
      '<div class="mt-cols">' +
        '<div class="mt-esq">' +
          '<div class="mt-tabs"><button class="on" data-t="meu">O teu inventário</button><button data-t="dele">' + nome + '</button></div>' +
          '<div id="mt-grid" class="mw-grid mw-grid-peq"></div>' +
        '</div>' +
        '<div class="mt-dir">' +
          '<div class="mt-bloco"><div class="mt-tit">Os teus itens <small id="mt-cont-meu">0/' + MAX_TROCA + '</small></div><div class="mt-slots" id="mt-slots-meu"></div></div>' +
          '<div class="mt-setas">⇅</div>' +
          '<div class="mt-bloco"><div class="mt-tit">Os itens de ' + nome + ' <small id="mt-cont-dele">0/' + MAX_TROCA + '</small></div><div class="mt-slots" id="mt-slots-dele"></div></div>' +
          '<p class="mw-aviso">Podes trocar até ' + MAX_TROCA + ' cromos de cada lado. ' + nome + ' vai receber uma notificação com a tua proposta e pode aceitar ou recusar.</p>' +
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
          else if (sel.length >= MAX_TROCA) { mostrarNotificacao('Só podes trocar até ' + MAX_TROCA + ' cromos de cada vez.', 'erro'); return; }
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
    $('mt-enviar').onclick = function () { mostrarNotificacao('As propostas de troca ficam disponíveis na próxima atualização.', 'info'); };
    pintarSlots(); pintar();
  };

  /* ---------- HISTÓRICO ---------- */
  var SETA_SAI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var SETA_ENTRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7 7 17M15 17H7V9"/></svg>';
  function cromoHist(clube, num) {
    var m = mini(clube, num);
    return '<div class="mh-cromo">' + (m ? '<img src="' + m + '" alt="">' : '#' + num) + '</div>';
  }
  window.mzHistorico = async function () {
    var lista = $('historico-lista'); lista.innerHTML = '<div class="mw-vazio">A carregar...</div>';
    try {
      var r = await sb.auth.getUser(); var user = r.data.user; if (!user) return;
      var hist = (await sb.from('mercado_historico').select('*').or('user1_id.eq.' + user.id + ',user2_id.eq.' + user.id).order('criado_em', { ascending: false }).limit(50)).data || [];
      if (!hist.length) { lista.innerHTML = '<div class="mw-vazio">Ainda não tens compras, vendas ou trocas.</div>'; return; }
      var outros = {}; hist.forEach(function (h) { outros[h.user1_id === user.id ? h.user2_id : h.user1_id] = 1; });
      var nomes = {};
      try {
        var ps = (await sb.from('perfis_publicos').select('id, display_name').in('id', Object.keys(outros))).data || [];
        ps.forEach(function (p) { nomes[p.id] = p.display_name; });
      } catch (e) {}
      lista.innerHTML = '';
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
          var sai = souU1 ? [h.clube1, h.num_cromo1] : [h.clube2, h.num_cromo2];
          var entra = souU1 ? [h.clube2, h.num_cromo2] : [h.clube1, h.num_cromo1];
          row.className += ' mh-troca';
          row.innerHTML = '<div class="mh-par">' +
              '<div class="mh-par-l">' + cromoHist(sai[0], sai[1]) + '<div class="mh-seta sai">' + SETA_SAI + '</div></div>' +
              '<div class="mh-par-l">' + cromoHist(entra[0], entra[1]) + '<div class="mh-seta entra">' + SETA_ENTRA + '</div></div>' +
            '</div>' +
            '<div class="mh-info"><div class="mh-tipo">Troca</div><div class="mh-nome">' + esc(outro) + '</div><div class="mh-cromo-nome">' + esc(nomeCromo(sai[0], sai[1])) + ' ⇄ ' + esc(nomeCromo(entra[0], entra[1])) + '</div></div>' +
            '<div class="mh-valor"></div><div class="mh-data">' + data + '</div>';
        }
        lista.appendChild(row);
      });
    } catch (e) { lista.innerHTML = '<div class="mw-vazio">Não foi possível carregar o histórico.</div>'; }
  };
})();
