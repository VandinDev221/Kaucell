(function () {
  'use strict';

  var API_ESTOQUE = 'api/estoque.php';
  var estoqueStatus = document.getElementById('estoque-status');
  var estoqueArea = document.getElementById('estoque-area');
  var loginArea = document.getElementById('estoque-login-area');
  var loginForm = document.getElementById('estoque-login-form');
  var loginUsuario = document.getElementById('estoque-usuario');
  var loginSenha = document.getElementById('estoque-senha');
  var logoutTop = document.getElementById('estoque-logout');
  var estoqueSecoesContainer = document.getElementById('estoque-secoes-container');
  var estoqueSelectSecao = document.getElementById('estoque-item-secao');
  var formEstoqueSecao = document.getElementById('form-estoque-secao');
  var formEstoqueItem = document.getElementById('form-estoque-item');
  var estoqueListaAlertas = document.getElementById('estoque-lista-alertas');
  var btnEstoqueRelatorio = document.getElementById('btn-estoque-relatorio');
  var btnEstoqueImprimir = document.getElementById('btn-estoque-imprimir');
  var btnEstoqueCadastro = document.getElementById('btn-estoque-cadastro');
  var btnEstoqueWhatsapp = document.getElementById('btn-estoque-whatsapp');
  var formNotificacoes = document.getElementById('form-notificacoes');
  var btnNotifTestar = document.getElementById('btn-notif-testar');
  var notificacaoStatus = document.getElementById('notificacao-status');
  var estoqueLiveText = document.getElementById('estoque-live-text');
  var estoqueHeaderBadge = document.getElementById('estoque-header-badge');
  var estoqueBusca = document.getElementById('estoque-busca');
  var estoqueBuscaLimpar = document.getElementById('estoque-busca-limpar');
  var estoqueFiltroSecao = document.getElementById('estoque-filtro-secao');
  var estoqueMasterBody = document.getElementById('estoque-master-body');
  var estoqueTabelaWrap = document.getElementById('estoque-tabela-wrap');
  var estoqueBuscaVazia = document.getElementById('estoque-busca-vazia');
  var estoqueResultados = document.getElementById('estoque-resultados');
  var panelCadastro = document.getElementById('panel-cadastro');
  var panelWhatsapp = document.getElementById('panel-whatsapp');
  var estoqueModal = document.getElementById('estoque-modal');
  var formEditarItem = document.getElementById('form-editar-item');
  var editSelectSecao = document.getElementById('edit-item-secao');

  var estoquePollId = null;
  var estoqueUltimoHash = '';
  var ESTOQUE_POLL_MS = 8000;
  var notifApikeySalva = false;
  var estoqueCache = { secoes: [], alertas: { faltando: [], baixo: [] } };
  var filtroStatus = 'todos';
  var modoVisao = 'tabela';
  var termoBusca = '';

  function request(url, options) {
    return fetch(url, options).then(function (res) { return res.json(); });
  }

  function setStatus(msg) {
    if (!estoqueStatus) return;
    estoqueStatus.hidden = !msg;
    estoqueStatus.textContent = msg || '';
  }

  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightText(text, query) {
    var safe = escapeHtml(text);
    if (!query) return safe;
    var re = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
    return safe.replace(re, '<mark class="estoque-mark">$1</mark>');
  }

  function normalizarBusca(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function hashEstoque(data) {
    return JSON.stringify({ secoes: data.secoes || [], alertas: data.alertas || { faltando: [], baixo: [] } });
  }

  function flattenItens(secoes) {
    var lista = [];
    (secoes || []).forEach(function (secao) {
      (secao.itens || []).forEach(function (item) {
        lista.push({
          id: item.id,
          secao_id: item.secao_id,
          secao_nome: secao.nome,
          nome: item.nome,
          quantidade: item.quantidade,
          quantidade_minima: item.quantidade_minima,
          unidade: item.unidade || 'un',
          status: item.status || 'ok'
        });
      });
    });
    return lista;
  }

  function itemMatchesBusca(item, query) {
    if (!query) return true;
    var q = normalizarBusca(query);
    return (
      normalizarBusca(item.nome).indexOf(q) !== -1 ||
      normalizarBusca(item.secao_nome).indexOf(q) !== -1
    );
  }

  function filtrarItens(itens) {
    return itens.filter(function (item) {
      if (filtroStatus !== 'todos' && item.status !== filtroStatus) return false;
      if (estoqueFiltroSecao && estoqueFiltroSecao.value && String(item.secao_id) !== estoqueFiltroSecao.value) return false;
      if (!itemMatchesBusca(item, termoBusca)) return false;
      return true;
    });
  }

  function pararEstoqueTempoReal() {
    if (estoquePollId) { clearInterval(estoquePollId); estoquePollId = null; }
  }

  function iniciarEstoqueTempoReal() {
    pararEstoqueTempoReal();
    estoquePollId = setInterval(function () {
      if (!estoqueArea || estoqueArea.hidden) return;
      carregarEstoque({ silencioso: true, tempoReal: true });
    }, ESTOQUE_POLL_MS);
  }

  function atualizarLiveIndicator(atualizadoEm) {
    if (!estoqueLiveText) return;
    var hora = '';
    if (atualizadoEm) {
      var d = new Date(atualizadoEm);
      if (!Number.isNaN(d.getTime())) {
        hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    }
    estoqueLiveText.textContent = hora ? 'Atualizado ' + hora : 'Tempo real ativo';
  }

  function badgeStatus(status) {
    if (status === 'faltando') return '<span class="estoque-badge estoque-badge--faltando">Em falta</span>';
    if (status === 'baixo') return '<span class="estoque-badge estoque-badge--baixo">Baixo</span>';
    return '<span class="estoque-badge estoque-badge--ok">Normal</span>';
  }

  function rowClass(status) {
    if (status === 'faltando') return 'estoque-row--critico';
    if (status === 'baixo') return 'estoque-row--aviso';
    return '';
  }

  function acoesHtml() {
    return (
      '<td class="estoque-qtd-actions">' +
      '<button type="button" class="estoque-qtd-btn estoque-action" data-action="menos" title="Saída −1">−</button>' +
      '<button type="button" class="estoque-qtd-btn estoque-action" data-action="mais" title="Entrada +1">+</button>' +
      '</td>' +
      '<td class="admin-actions">' +
      '<button type="button" class="btn btn-small btn-secondary admin-action-btn estoque-action" data-action="editar">Editar</button> ' +
      '<button type="button" class="btn btn-small btn-primary admin-action-btn estoque-action" data-action="excluir">Excluir</button>' +
      '</td>'
    );
  }

  function buildRowHtml(item, showSecao) {
    var q = termoBusca;
    return (
      '<tr class="' + rowClass(item.status) + '" data-id="' + item.id + '" data-secao-id="' + item.secao_id + '" data-nome="' + escapeHtml(item.nome) + '" data-qtd="' + item.quantidade + '" data-min="' + item.quantidade_minima + '" data-unidade="' + escapeHtml(item.unidade) + '" data-status="' + item.status + '">' +
      (showSecao !== false ? '<td class="estoque-col-secao">' + highlightText(item.secao_nome, q) + '</td>' : '') +
      '<td class="estoque-col-peca"><strong>' + highlightText(item.nome, q) + '</strong></td>' +
      '<td class="estoque-col-qtd"><span class="estoque-qtd-valor">' + item.quantidade + '</span> <span class="estoque-unidade">' + escapeHtml(item.unidade) + '</span></td>' +
      '<td>' + item.quantidade_minima + '</td>' +
      '<td>' + badgeStatus(item.status) + '</td>' +
      acoesHtml() +
      '</tr>'
    );
  }

  function atualizarKpis(secoes, alertas) {
    var itens = flattenItens(secoes);
    var faltando = (alertas.faltando || []).length;
    var baixo = (alertas.baixo || []).length;
    var ok = itens.filter(function (i) { return i.status === 'ok'; }).length;
    var el;
    el = document.getElementById('kpi-total-pecas'); if (el) el.textContent = String(itens.length);
    el = document.getElementById('kpi-total-secoes'); if (el) el.textContent = String((secoes || []).length);
    el = document.getElementById('kpi-faltando'); if (el) el.textContent = String(faltando);
    el = document.getElementById('kpi-baixo'); if (el) el.textContent = String(baixo);
    el = document.getElementById('kpi-ok'); if (el) el.textContent = String(ok);
    if (estoqueHeaderBadge) {
      var alertasTotal = faltando + baixo;
      estoqueHeaderBadge.textContent = String(alertasTotal);
      estoqueHeaderBadge.hidden = alertasTotal === 0;
    }
  }

  function atualizarSelects(secoes) {
    var opts = '<option value="">Selecione uma seção</option>';
    var optsFiltro = '<option value="">Todas as seções</option>';
    var optsEdit = '';
    (secoes || []).forEach(function (s) {
      opts += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>';
      optsFiltro += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>';
      optsEdit += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>';
    });
    if (estoqueSelectSecao) {
      var v = estoqueSelectSecao.value;
      estoqueSelectSecao.innerHTML = opts;
      if (v) estoqueSelectSecao.value = v;
    }
    if (estoqueFiltroSecao) {
      var vf = estoqueFiltroSecao.value;
      estoqueFiltroSecao.innerHTML = optsFiltro;
      if (vf) estoqueFiltroSecao.value = vf;
    }
    if (editSelectSecao) editSelectSecao.innerHTML = optsEdit;
  }

  function renderAlertas(alertas) {
    if (!estoqueListaAlertas) return;
    var faltando = alertas.faltando || [];
    var baixo = alertas.baixo || [];
    if (!faltando.length && !baixo.length) {
      estoqueListaAlertas.hidden = true;
      estoqueListaAlertas.innerHTML = '';
      return;
    }
    var html = '<div class="estoque-alertas-resumo">';
    if (faltando.length) {
      html += '<div class="estoque-alerta-bloco estoque-alerta-bloco--critico"><strong>Em falta (' + faltando.length + ')</strong><ul>';
      faltando.forEach(function (item) {
        html += '<li>' + escapeHtml(item.secao_nome) + ' · ' + escapeHtml(item.nome) + '</li>';
      });
      html += '</ul></div>';
    }
    if (baixo.length) {
      html += '<div class="estoque-alerta-bloco"><strong>Estoque baixo (' + baixo.length + ')</strong><ul>';
      baixo.forEach(function (item) {
        html += '<li>' + escapeHtml(item.secao_nome) + ' · ' + escapeHtml(item.nome) + ' (' + item.quantidade + ' ' + escapeHtml(item.unidade) + ')</li>';
      });
      html += '</ul></div>';
    }
    html += '</div>';
    estoqueListaAlertas.innerHTML = html;
    estoqueListaAlertas.hidden = false;
  }

  function renderResultados(total, filtrados, totalGeral) {
    if (!estoqueResultados) return;
    if (totalGeral === 0) {
      estoqueResultados.textContent = 'Nenhuma peça cadastrada. Use Cadastro para começar.';
      return;
    }
    if (termoBusca || filtroStatus !== 'todos' || (estoqueFiltroSecao && estoqueFiltroSecao.value)) {
      estoqueResultados.textContent = 'Exibindo ' + filtrados + ' de ' + totalGeral + ' peças';
    } else {
      estoqueResultados.textContent = totalGeral + ' peças em ' + (estoqueCache.secoes || []).length + ' seções';
    }
  }

  function renderTabelaMaster() {
    if (!estoqueMasterBody) return;
    var todos = flattenItens(estoqueCache.secoes);
    var filtrados = filtrarItens(todos);
    estoqueMasterBody.innerHTML = filtrados.map(function (item) {
      return buildRowHtml(item, true);
    }).join('');
    renderResultados(todos.length, filtrados.length, todos.length);
    if (estoqueBuscaVazia) {
      var vazio = todos.length > 0 && filtrados.length === 0;
      estoqueBuscaVazia.hidden = !vazio;
    }
    if (estoqueTabelaWrap) estoqueTabelaWrap.hidden = filtrados.length === 0 && todos.length > 0;
  }

  function renderSecoesView() {
    if (!estoqueSecoesContainer) return;
    estoqueSecoesContainer.innerHTML = '';
    var secoes = estoqueCache.secoes || [];
    if (!secoes.length) {
      estoqueSecoesContainer.innerHTML = '<p class="estoque-empty">Crie seções como Telas, Baterias, Conectores...</p>';
      return;
    }
    var algumVisivel = false;
    secoes.forEach(function (secao) {
      var itensSecao = (secao.itens || []).map(function (item) {
        return {
          id: item.id,
          secao_id: item.secao_id,
          secao_nome: secao.nome,
          nome: item.nome,
          quantidade: item.quantidade,
          quantidade_minima: item.quantidade_minima,
          unidade: item.unidade || 'un',
          status: item.status || 'ok'
        };
      });
      var filtrados = filtrarItens(itensSecao);
      if (!filtrados.length) return;
      algumVisivel = true;
      var article = document.createElement('article');
      article.className = 'estoque-secao-card';
      article.setAttribute('data-secao-id', secao.id);
      var rows = filtrados.map(function (item) { return buildRowHtml(item, false); }).join('');
      article.innerHTML =
        '<div class="estoque-secao-header">' +
        '<div class="estoque-secao-title-wrap">' +
        '<h3>' + highlightText(secao.nome, termoBusca) + '</h3>' +
        '<span class="estoque-secao-count">' + filtrados.length + ' peça(s)</span>' +
        '</div>' +
        '<div class="estoque-secao-actions">' +
        '<button type="button" class="btn btn-small btn-secondary estoque-secao-action" data-action="editar-secao">Renomear</button> ' +
        '<button type="button" class="btn btn-small btn-primary estoque-secao-action" data-action="excluir-secao">Excluir</button>' +
        '</div></div>' +
        '<div class="admin-table-wrap"><table class="admin-table estoque-secao-table">' +
        '<thead><tr><th>Peça</th><th>Qtd</th><th>Mín.</th><th>Status</th><th>Ajuste</th><th>Ações</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>';
      estoqueSecoesContainer.appendChild(article);
    });
    if (estoqueBuscaVazia) {
      var todos = flattenItens(secoes);
      var totalFiltrado = filtrarItens(todos).length;
      estoqueBuscaVazia.hidden = !(todos.length > 0 && totalFiltrado === 0);
    }
    renderResultados(flattenItens(secoes).length, filtrarItens(flattenItens(secoes)).length, flattenItens(secoes).length);
    if (!algumVisivel && flattenItens(secoes).length > 0 && estoqueBuscaVazia) {
      estoqueBuscaVazia.hidden = false;
    }
  }

  function aplicarVisao() {
    if (modoVisao === 'secoes') {
      if (estoqueTabelaWrap) estoqueTabelaWrap.hidden = true;
      if (estoqueSecoesContainer) estoqueSecoesContainer.hidden = false;
      renderSecoesView();
    } else {
      if (estoqueSecoesContainer) estoqueSecoesContainer.hidden = true;
      if (estoqueTabelaWrap) estoqueTabelaWrap.hidden = false;
      renderTabelaMaster();
    }
  }

  function renderEstoqueCompleto(data) {
    estoqueCache = data;
    atualizarSelects(data.secoes || []);
    atualizarKpis(data.secoes || [], data.alertas || {});
    renderAlertas(data.alertas || { faltando: [], baixo: [] });
    aplicarVisao();
  }

  function carregarEstoque(opcoes) {
    opcoes = opcoes || {};
    request(API_ESTOQUE + (opcoes.tempoReal ? '?tempo_real=1' : ''))
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.secoes)) {
          if (!opcoes.silencioso) alert(res.message || 'Falha ao carregar estoque.');
          return;
        }
        var hash = hashEstoque(res);
        if (!opcoes.forcar && hash === estoqueUltimoHash) {
          atualizarLiveIndicator(res.atualizado_em);
          return;
        }
        estoqueUltimoHash = hash;
        renderEstoqueCompleto(res);
        if (res.notificacoes) preencherNotificacoes(res.notificacoes);
        atualizarLiveIndicator(res.atualizado_em);
      })
      .catch(function () {
        if (!opcoes.silencioso) alert('Erro ao conectar com a API de estoque.');
      });
  }

  function formatTelefoneExibicao(tel) {
    var digits = String(tel || '').replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
    return digits;
  }

  function preencherNotificacoes(notificacoes) {
    if (!notificacoes) return;
    var telInput = document.getElementById('notif-telefone');
    var ativoInput = document.getElementById('notif-ativo');
    if (telInput) telInput.value = formatTelefoneExibicao(notificacoes.telefone);
    if (ativoInput) ativoInput.checked = !!notificacoes.ativo;
    notifApikeySalva = !!notificacoes.conectado;
    if (!notificacaoStatus) return;
    if (notificacoes.conectado) {
      notificacaoStatus.textContent = 'WhatsApp conectado' + (notificacoes.apikey_mascarada ? ' · ' + notificacoes.apikey_mascarada : '');
      notificacaoStatus.className = 'notificacao-status notificacao-status--ok';
    } else {
      notificacaoStatus.textContent = 'Configure o WhatsApp para receber alertas automáticos.';
      notificacaoStatus.className = 'notificacao-status';
    }
  }

  function abrirModalEditar(tr) {
    if (!estoqueModal) return;
    document.getElementById('edit-item-id').value = tr.getAttribute('data-id');
    document.getElementById('edit-item-nome').value = tr.getAttribute('data-nome') || '';
    document.getElementById('edit-item-qtd').value = tr.getAttribute('data-qtd') || '0';
    document.getElementById('edit-item-min').value = tr.getAttribute('data-min') || '0';
    var unidade = tr.getAttribute('data-unidade') || 'un';
    var unSel = document.getElementById('edit-item-unidade');
    if (unSel) unSel.value = unidade;
    if (editSelectSecao) editSelectSecao.value = tr.getAttribute('data-secao-id') || '';
    estoqueModal.hidden = false;
    estoqueModal.setAttribute('aria-hidden', 'false');
  }

  function fecharModal() {
    if (!estoqueModal) return;
    estoqueModal.hidden = true;
    estoqueModal.setAttribute('aria-hidden', 'true');
  }

  function gerarRelatorioCsv() {
    request(API_ESTOQUE + '?relatorio=1').then(function (res) {
      if (!res.ok) { alert(res.message || 'Falha ao gerar relatório.'); return; }
      var linhas = ['Secao;Peca;Quantidade;Minimo;Unidade;Status'];
      (res.faltando || []).forEach(function (item) {
        linhas.push([item.secao_nome, item.nome, item.quantidade, item.quantidade_minima, item.unidade, 'EM FALTA']
          .map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'));
      });
      (res.baixo || []).forEach(function (item) {
        linhas.push([item.secao_nome, item.nome, item.quantidade, item.quantidade_minima, item.unidade, 'BAIXO']
          .map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'));
      });
      if (linhas.length === 1) { alert('Nenhuma peça em falta ou com estoque baixo.'); return; }
      var blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'kaucell-estoque-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }).catch(function () { alert('Erro ao gerar relatório.'); });
  }

  function ajustarItemEstoque(id, delta) {
    request(API_ESTOQUE + '?id=' + encodeURIComponent(id) + '&acao=item_ajustar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: delta })
    }).then(function (res) {
      if (!res.ok) { alert(res.message || 'Não foi possível ajustar.'); return; }
      carregarEstoque({ forcar: true, tempoReal: true });
    }).catch(function () { alert('Erro ao ajustar quantidade.'); });
  }

  function excluirItemEstoque(tr) {
    var id = tr.getAttribute('data-id');
    var nome = tr.getAttribute('data-nome') || 'esta peça';
    if (!confirm('Excluir "' + nome + '" do estoque?')) return;
    request(API_ESTOQUE + '?id=' + encodeURIComponent(id) + '&acao=item_excluir', { method: 'POST' })
      .then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível excluir.'); return; }
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao excluir peça.'); });
  }

  function editarSecaoEstoque(secaoId, nomeAtual) {
    var novoNome = prompt('Nome da seção:', nomeAtual);
    if (novoNome === null) return;
    novoNome = novoNome.trim();
    if (!novoNome) return;
    request(API_ESTOQUE + '?id=' + encodeURIComponent(secaoId) + '&acao=secao_editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome })
    }).then(function (res) {
      if (!res.ok) { alert(res.message || 'Não foi possível renomear.'); return; }
      carregarEstoque({ forcar: true, tempoReal: true });
    }).catch(function () { alert('Erro ao renomear seção.'); });
  }

  function excluirSecaoEstoque(secaoId, nomeSecao) {
    if (!confirm('Excluir "' + nomeSecao + '" e todas as peças?')) return;
    request(API_ESTOQUE + '?id=' + encodeURIComponent(secaoId) + '&acao=secao_excluir', { method: 'POST' })
      .then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível excluir.'); return; }
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao excluir seção.'); });
  }

  function handleTableClick(e) {
    var alvo = e.target;
    if (!(alvo instanceof HTMLElement)) return;
    if (alvo.classList.contains('estoque-secao-action')) {
      var card = alvo.closest('.estoque-secao-card');
      if (!card) return;
      var secaoId = card.getAttribute('data-secao-id');
      var nomeSecao = card.querySelector('h3') ? card.querySelector('h3').textContent.replace(/<\/?[^>]+(>|$)/g, '') : '';
      var acaoSec = alvo.getAttribute('data-action');
      if (acaoSec === 'editar-secao') editarSecaoEstoque(secaoId, nomeSecao);
      else if (acaoSec === 'excluir-secao') excluirSecaoEstoque(secaoId, nomeSecao);
      return;
    }
    if (!alvo.classList.contains('estoque-action')) return;
    var tr = alvo.closest('tr');
    if (!tr) return;
    var itemId = tr.getAttribute('data-id');
    var acao = alvo.getAttribute('data-action');
    if (acao === 'editar') abrirModalEditar(tr);
    else if (acao === 'excluir') excluirItemEstoque(tr);
    else if (acao === 'mais') ajustarItemEstoque(itemId, 1);
    else if (acao === 'menos') ajustarItemEstoque(itemId, -1);
  }

  function mostrarLogin() {
    pararEstoqueTempoReal();
    if (loginArea) loginArea.hidden = false;
    if (estoqueArea) estoqueArea.hidden = true;
    if (logoutTop) logoutTop.hidden = true;
  }

  function mostrarEstoque() {
    if (loginArea) loginArea.hidden = true;
    if (estoqueArea) estoqueArea.hidden = false;
    if (logoutTop) logoutTop.hidden = false;
    carregarEstoque({ forcar: true, tempoReal: true });
    iniciarEstoqueTempoReal();
    if (estoqueBusca) setTimeout(function () { estoqueBusca.focus(); }, 300);
  }

  function verificarAuthInicial() {
    if (/[?&]logout=1/.test(window.location.search)) {
      request('api/auth.php?acao=logout', { method: 'POST' }).finally(function () {
        history.replaceState(null, '', 'estoque.html');
        mostrarLogin();
      });
      return;
    }
    request('api/auth.php?acao=status')
      .then(function (res) { if (res.ok && res.logged) mostrarEstoque(); else mostrarLogin(); })
      .catch(function () { mostrarLogin(); });
  }

  if (estoqueBusca) {
    estoqueBusca.addEventListener('input', function () {
      termoBusca = estoqueBusca.value.trim();
      if (estoqueBuscaLimpar) estoqueBuscaLimpar.hidden = !termoBusca;
      aplicarVisao();
    });
  }

  if (estoqueBuscaLimpar) {
    estoqueBuscaLimpar.addEventListener('click', function () {
      termoBusca = '';
      if (estoqueBusca) estoqueBusca.value = '';
      estoqueBuscaLimpar.hidden = true;
      estoqueBusca.focus();
      aplicarVisao();
    });
  }

  document.querySelectorAll('.estoque-filtro').forEach(function (btn) {
    btn.addEventListener('click', function () {
      filtroStatus = btn.getAttribute('data-filtro') || 'todos';
      document.querySelectorAll('.estoque-filtro').forEach(function (b) {
        b.classList.toggle('estoque-filtro--active', b === btn);
      });
      aplicarVisao();
    });
  });

  if (estoqueFiltroSecao) {
    estoqueFiltroSecao.addEventListener('change', function () { aplicarVisao(); });
  }

  document.querySelectorAll('.estoque-view-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      modoVisao = btn.getAttribute('data-view') || 'tabela';
      document.querySelectorAll('.estoque-view-btn').forEach(function (b) {
        b.classList.toggle('estoque-view-btn--active', b === btn);
      });
      aplicarVisao();
    });
  });

  document.querySelectorAll('.estoque-preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var nome = btn.getAttribute('data-preset') || '';
      var input = document.getElementById('estoque-secao-nome');
      if (input) input.value = nome;
      if (panelCadastro) panelCadastro.open = true;
      if (input) input.focus();
    });
  });

  if (btnEstoqueCadastro && panelCadastro) {
    btnEstoqueCadastro.addEventListener('click', function () {
      panelCadastro.open = true;
      panelCadastro.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (btnEstoqueWhatsapp && panelWhatsapp) {
    btnEstoqueWhatsapp.addEventListener('click', function () {
      panelWhatsapp.open = true;
      panelWhatsapp.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (estoqueBusca && !estoqueArea.hidden) estoqueBusca.focus();
    }
    if (e.key === 'Escape') fecharModal();
  });

  if (estoqueMasterBody) estoqueMasterBody.addEventListener('click', handleTableClick);
  if (estoqueSecoesContainer) estoqueSecoesContainer.addEventListener('click', handleTableClick);

  if (formEditarItem) {
    formEditarItem.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = document.getElementById('edit-item-id').value;
      request(API_ESTOQUE + '?id=' + encodeURIComponent(id) + '&acao=item_editar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secao_id: parseInt(document.getElementById('edit-item-secao').value, 10),
          nome: document.getElementById('edit-item-nome').value.trim(),
          quantidade: parseInt(document.getElementById('edit-item-qtd').value, 10),
          quantidade_minima: parseInt(document.getElementById('edit-item-min').value, 10),
          unidade: document.getElementById('edit-item-unidade').value
        })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível salvar.'); return; }
        fecharModal();
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao salvar peça.'); });
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach(function (el) {
    el.addEventListener('click', fecharModal);
  });

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var usuario = loginUsuario ? loginUsuario.value.trim() : '';
      var senha = loginSenha ? loginSenha.value : '';
      if (!usuario || !senha) { setStatus('Informe usuário e senha.'); return; }
      setStatus('');
      request('api/auth.php?acao=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario, senha: senha })
      }).then(function (res) {
        if (!res.ok || !res.logged) { setStatus(res.message || 'Credenciais inválidas.'); return; }
        setStatus('');
        mostrarEstoque();
      }).catch(function () { setStatus('Erro ao tentar fazer login.'); });
    });
  }

  if (logoutTop) {
    logoutTop.addEventListener('click', function (e) {
      e.preventDefault();
      request('api/auth.php?acao=logout', { method: 'POST' }).finally(function () {
        if (loginUsuario) loginUsuario.value = '';
        if (loginSenha) loginSenha.value = '';
        mostrarLogin();
      });
    });
  }

  if (formEstoqueSecao) {
    formEstoqueSecao.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = document.getElementById('estoque-secao-nome').value.trim();
      if (!nome) return;
      request(API_ESTOQUE + '?acao=secao_criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível criar a seção.'); return; }
        formEstoqueSecao.reset();
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao criar seção.'); });
    });
  }

  if (formEstoqueItem) {
    formEstoqueItem.addEventListener('submit', function (e) {
      e.preventDefault();
      var secaoId = parseInt(document.getElementById('estoque-item-secao').value, 10);
      var nome = document.getElementById('estoque-item-nome').value.trim();
      var qtd = parseInt(document.getElementById('estoque-item-qtd').value, 10);
      var min = parseInt(document.getElementById('estoque-item-min').value, 10);
      var unidade = document.getElementById('estoque-item-unidade').value;
      if (!secaoId || !nome) { alert('Selecione seção e informe a peça.'); return; }
      request(API_ESTOQUE + '?acao=item_criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secao_id: secaoId, nome: nome, quantidade: qtd, quantidade_minima: min, unidade: unidade })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível cadastrar.'); return; }
        formEstoqueItem.reset();
        document.getElementById('estoque-item-qtd').value = '0';
        document.getElementById('estoque-item-min').value = '2';
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao cadastrar peça.'); });
    });
  }

  if (btnEstoqueRelatorio) btnEstoqueRelatorio.addEventListener('click', gerarRelatorioCsv);
  if (btnEstoqueImprimir) btnEstoqueImprimir.addEventListener('click', function () { window.print(); });

  if (formNotificacoes) {
    formNotificacoes.addEventListener('submit', function (e) {
      e.preventDefault();
      var telefone = document.getElementById('notif-telefone').value.trim();
      var apikey = document.getElementById('notif-apikey').value.trim();
      var ativo = document.getElementById('notif-ativo').checked;
      if (!telefone) { alert('Informe o WhatsApp.'); return; }
      if (!apikey && !notifApikeySalva) { alert('Informe a API Key.'); return; }
      request(API_ESTOQUE + '?acao=notificacoes_salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefone, callmebot_apikey: apikey, ativo: ativo ? 1 : 0, manter_apikey: !apikey })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Erro ao salvar.'); return; }
        if (res.notificacoes) preencherNotificacoes(res.notificacoes);
        document.getElementById('notif-apikey').value = '';
        alert('WhatsApp salvo com sucesso.');
      }).catch(function () { alert('Erro ao salvar.'); });
    });
  }

  if (btnNotifTestar) {
    btnNotifTestar.addEventListener('click', function () {
      request(API_ESTOQUE + '?acao=notificacoes_testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: document.getElementById('notif-telefone').value.trim(),
          callmebot_apikey: document.getElementById('notif-apikey').value.trim()
        })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Falha no teste.'); return; }
        alert(res.message || 'Teste enviado. Confira o WhatsApp.');
      }).catch(function () { alert('Erro no teste.'); });
    });
  }

  if (logoutTop) logoutTop.hidden = true;
  verificarAuthInicial();
})();
