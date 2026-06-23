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
  var estoqueAlertas = document.getElementById('estoque-alertas');
  var estoqueListaAlertas = document.getElementById('estoque-lista-alertas');
  var estoqueCountFaltando = document.getElementById('estoque-count-faltando');
  var estoqueCountBaixo = document.getElementById('estoque-count-baixo');
  var btnEstoqueRelatorio = document.getElementById('btn-estoque-relatorio');
  var btnEstoqueImprimir = document.getElementById('btn-estoque-imprimir');
  var formNotificacoes = document.getElementById('form-notificacoes');
  var btnNotifTestar = document.getElementById('btn-notif-testar');
  var notificacaoStatus = document.getElementById('notificacao-status');
  var estoqueLiveText = document.getElementById('estoque-live-text');
  var estoqueHeaderBadge = document.getElementById('estoque-header-badge');
  var estoquePollId = null;
  var estoqueUltimoHash = '';
  var ESTOQUE_POLL_MS = 8000;
  var notifApikeySalva = false;

  function request(url, options) {
    return fetch(url, options).then(function (res) { return res.json(); });
  }

  function setStatus(msg) {
    if (!estoqueStatus) return;
    if (!msg) {
      estoqueStatus.hidden = true;
      estoqueStatus.textContent = '';
      return;
    }
    estoqueStatus.hidden = false;
    estoqueStatus.textContent = msg;
  }

  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function hashEstoque(data) {
    return JSON.stringify({
      secoes: data.secoes || [],
      alertas: data.alertas || { faltando: [], baixo: [] }
    });
  }

  function pararEstoqueTempoReal() {
    if (estoquePollId) {
      clearInterval(estoquePollId);
      estoquePollId = null;
    }
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
    estoqueLiveText.textContent = hora
      ? 'Atualizado às ' + hora + ' · tempo real ativo'
      : 'Atualização em tempo real ativa';
  }

  function atualizarBadgeEstoque(alertas) {
    if (!estoqueHeaderBadge) return;
    var total = (alertas.faltando || []).length + (alertas.baixo || []).length;
    estoqueHeaderBadge.textContent = String(total);
    estoqueHeaderBadge.hidden = total === 0;
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
      notificacaoStatus.textContent = 'WhatsApp conectado' + (notificacoes.apikey_mascarada ? ' · chave ' + notificacoes.apikey_mascarada : '') + '.';
      notificacaoStatus.className = 'notificacao-status notificacao-status--ok';
    } else {
      notificacaoStatus.textContent = 'Configure seu WhatsApp abaixo para receber alertas automáticos.';
      notificacaoStatus.className = 'notificacao-status';
    }
  }

  function badgeStatus(status) {
    if (status === 'faltando') return '<span class="estoque-badge estoque-badge--faltando">Em falta</span>';
    if (status === 'baixo') return '<span class="estoque-badge estoque-badge--baixo">Baixo</span>';
    return '<span class="estoque-badge estoque-badge--ok">OK</span>';
  }

  function atualizarSelectSecoes(secoes) {
    if (!estoqueSelectSecao) return;
    var valorAtual = estoqueSelectSecao.value;
    estoqueSelectSecao.innerHTML = '<option value="">Selecione uma seção</option>';
    secoes.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nome;
      estoqueSelectSecao.appendChild(opt);
    });
    if (valorAtual) estoqueSelectSecao.value = valorAtual;
  }

  function renderAlertas(alertas) {
    var faltando = alertas.faltando || [];
    var baixo = alertas.baixo || [];
    if (estoqueCountFaltando) estoqueCountFaltando.textContent = String(faltando.length);
    if (estoqueCountBaixo) estoqueCountBaixo.textContent = String(baixo.length);
    if (!estoqueListaAlertas) return;
    if (faltando.length === 0 && baixo.length === 0) {
      estoqueListaAlertas.hidden = true;
      estoqueListaAlertas.innerHTML = '';
      return;
    }
    var html = '';
    if (faltando.length) {
      html += '<h4>Peças em falta (' + faltando.length + ')</h4><ul>';
      faltando.forEach(function (item) {
        html += '<li class="estoque-item-critico">' + escapeHtml(item.secao_nome) + ' — ' + escapeHtml(item.nome) + ' (0 ' + escapeHtml(item.unidade) + ')</li>';
      });
      html += '</ul>';
    }
    if (baixo.length) {
      html += '<h4 style="margin-top:1rem;">Estoque baixo (' + baixo.length + ')</h4><ul>';
      baixo.forEach(function (item) {
        html += '<li>' + escapeHtml(item.secao_nome) + ' — ' + escapeHtml(item.nome) + ' (' + item.quantidade + ' ' + escapeHtml(item.unidade) + ', mín. ' + item.quantidade_minima + ')</li>';
      });
      html += '</ul>';
    }
    estoqueListaAlertas.innerHTML = html;
    estoqueListaAlertas.hidden = false;
  }

  function renderItemRow(item) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-id', item.id);
    tr.setAttribute('data-secao-id', item.secao_id);
    tr.setAttribute('data-nome', item.nome);
    tr.setAttribute('data-qtd', item.quantidade);
    tr.setAttribute('data-min', item.quantidade_minima);
    tr.setAttribute('data-unidade', item.unidade || 'un');
    tr.innerHTML =
      '<td>' + escapeHtml(item.nome) + '</td>' +
      '<td><span class="estoque-qtd-valor">' + item.quantidade + '</span> ' + escapeHtml(item.unidade || 'un') + '</td>' +
      '<td>' + item.quantidade_minima + '</td>' +
      '<td>' + badgeStatus(item.status) + '</td>' +
      '<td class="estoque-qtd-actions">' +
      '<button type="button" class="estoque-qtd-btn estoque-action" data-action="menos" title="Remover 1">−</button>' +
      '<button type="button" class="estoque-qtd-btn estoque-action" data-action="mais" title="Adicionar 1">+</button>' +
      '</td>' +
      '<td class="admin-actions">' +
      '<button type="button" class="btn btn-small btn-secondary admin-action-btn estoque-action" data-action="editar">Editar</button> ' +
      '<button type="button" class="btn btn-small btn-primary admin-action-btn estoque-action" data-action="excluir">Excluir</button>' +
      '</td>';
    return tr;
  }

  function renderSecaoCard(secao) {
    var article = document.createElement('article');
    article.className = 'estoque-secao-card';
    article.setAttribute('data-secao-id', secao.id);
    var rows = (secao.itens || []).map(function (item) {
      return renderItemRow(item).outerHTML;
    }).join('');
    article.innerHTML =
      '<div class="estoque-secao-header">' +
      '<h3>' + escapeHtml(secao.nome) + '</h3>' +
      '<div class="estoque-secao-actions">' +
      '<button type="button" class="btn btn-small btn-secondary estoque-secao-action" data-action="editar-secao">Renomear</button> ' +
      '<button type="button" class="btn btn-small btn-primary estoque-secao-action" data-action="excluir-secao">Excluir seção</button>' +
      '</div></div>' +
      '<div class="admin-table-wrap">' +
      '<table class="admin-table"><thead><tr>' +
      '<th>Peça</th><th>Qtd</th><th>Mín.</th><th>Status</th><th>Ajuste</th><th>Ações</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    if (!secao.itens || !secao.itens.length) {
      var empty = document.createElement('p');
      empty.className = 'estoque-empty';
      empty.textContent = 'Nenhuma peça nesta seção.';
      article.querySelector('.admin-table-wrap').appendChild(empty);
    }
    return article;
  }

  function renderEstoqueCompleto(data) {
    atualizarSelectSecoes(data.secoes || []);
    renderAlertas(data.alertas || { faltando: [], baixo: [] });
    if (!estoqueSecoesContainer) return;
    estoqueSecoesContainer.innerHTML = '';
    if (!data.secoes || !data.secoes.length) {
      var msg = document.createElement('p');
      msg.className = 'estoque-empty';
      msg.textContent = 'Crie a primeira seção do estoque (ex.: Telas, Bateria, Dock de carga, Botões).';
      estoqueSecoesContainer.appendChild(msg);
      return;
    }
    data.secoes.forEach(function (secao) {
      estoqueSecoesContainer.appendChild(renderSecaoCard(secao));
    });
  }

  function carregarEstoque(opcoes) {
    opcoes = opcoes || {};
    var url = API_ESTOQUE + (opcoes.tempoReal ? '?tempo_real=1' : '');
    request(url)
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
        atualizarBadgeEstoque(res.alertas || { faltando: [], baixo: [] });
      })
      .catch(function () {
        if (!opcoes.silencioso) alert('Erro ao conectar com a API de estoque.');
      });
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
      if (linhas.length === 1) { alert('Nenhuma peça em falta ou com estoque baixo no momento.'); return; }
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

  function editarItemEstoque(tr) {
    var id = tr.getAttribute('data-id');
    var secaoId = tr.getAttribute('data-secao-id');
    var nome = tr.getAttribute('data-nome') || '';
    var qtd = tr.getAttribute('data-qtd') || '0';
    var min = tr.getAttribute('data-min') || '0';
    var unidade = tr.getAttribute('data-unidade') || 'un';
    var novoNome = prompt('Nome da peça:', nome);
    if (novoNome === null) return;
    novoNome = novoNome.trim();
    if (!novoNome) return;
    var novaSecao = parseInt(prompt('ID da seção (atual: ' + secaoId + '):', secaoId), 10);
    if (!novaSecao) return;
    var novaQtd = parseInt(prompt('Quantidade atual:', qtd), 10);
    if (Number.isNaN(novaQtd) || novaQtd < 0) return;
    var novoMin = parseInt(prompt('Quantidade mínima (alerta):', min), 10);
    if (Number.isNaN(novoMin) || novoMin < 0) return;
    var novaUnidade = prompt('Unidade (un, pç, kit):', unidade);
    if (novaUnidade === null) return;
    novaUnidade = novaUnidade.trim() || 'un';
    request(API_ESTOQUE + '?id=' + encodeURIComponent(id) + '&acao=item_editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secao_id: novaSecao, nome: novoNome, quantidade: novaQtd, quantidade_minima: novoMin, unidade: novaUnidade })
    }).then(function (res) {
      if (!res.ok) { alert(res.message || 'Não foi possível editar a peça.'); return; }
      carregarEstoque({ forcar: true, tempoReal: true });
    }).catch(function () { alert('Erro ao editar peça.'); });
  }

  function ajustarItemEstoque(id, delta) {
    request(API_ESTOQUE + '?id=' + encodeURIComponent(id) + '&acao=item_ajustar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: delta })
    }).then(function (res) {
      if (!res.ok) { alert(res.message || 'Não foi possível ajustar a quantidade.'); return; }
      carregarEstoque({ forcar: true, tempoReal: true });
    }).catch(function () { alert('Erro ao ajustar quantidade.'); });
  }

  function excluirItemEstoque(tr) {
    var id = tr.getAttribute('data-id');
    var nome = tr.getAttribute('data-nome') || 'esta peça';
    if (!confirm('Excluir "' + nome + '" do estoque?')) return;
    request(API_ESTOQUE + '?id=' + encodeURIComponent(id) + '&acao=item_excluir', { method: 'POST' })
      .then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível excluir a peça.'); return; }
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
      if (!res.ok) { alert(res.message || 'Não foi possível renomear a seção.'); return; }
      carregarEstoque({ forcar: true, tempoReal: true });
    }).catch(function () { alert('Erro ao renomear seção.'); });
  }

  function excluirSecaoEstoque(secaoId, nomeSecao) {
    if (!confirm('Excluir a seção "' + nomeSecao + '" e todas as peças dela?')) return;
    request(API_ESTOQUE + '?id=' + encodeURIComponent(secaoId) + '&acao=secao_excluir', { method: 'POST' })
      .then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível excluir a seção.'); return; }
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao excluir seção.'); });
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
      .then(function (res) {
        if (res.ok && res.logged) mostrarEstoque();
        else mostrarLogin();
      })
      .catch(function () { mostrarLogin(); });
  }

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
        if (!res.ok || !res.logged) {
          setStatus(res.message || 'Credenciais inválidas.');
          mostrarLogin();
          return;
        }
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
      var unidade = document.getElementById('estoque-item-unidade').value.trim() || 'un';
      if (!secaoId || !nome) { alert('Selecione uma seção e informe o nome da peça.'); return; }
      request(API_ESTOQUE + '?acao=item_criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secao_id: secaoId, nome: nome, quantidade: qtd, quantidade_minima: min, unidade: unidade })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível cadastrar a peça.'); return; }
        formEstoqueItem.reset();
        document.getElementById('estoque-item-qtd').value = '0';
        document.getElementById('estoque-item-min').value = '2';
        document.getElementById('estoque-item-unidade').value = 'un';
        carregarEstoque({ forcar: true, tempoReal: true });
      }).catch(function () { alert('Erro ao cadastrar peça.'); });
    });
  }

  if (estoqueSecoesContainer) {
    estoqueSecoesContainer.addEventListener('click', function (e) {
      var alvo = e.target;
      if (!(alvo instanceof HTMLElement)) return;
      if (alvo.classList.contains('estoque-secao-action')) {
        var card = alvo.closest('.estoque-secao-card');
        if (!card) return;
        var secaoId = card.getAttribute('data-secao-id');
        var nomeSecao = card.querySelector('h3') ? card.querySelector('h3').textContent : '';
        var acaoSec = alvo.getAttribute('data-action');
        if (acaoSec === 'editar-secao') editarSecaoEstoque(secaoId, nomeSecao);
        else if (acaoSec === 'excluir-secao') excluirSecaoEstoque(secaoId, nomeSecao);
        return;
      }
      if (!alvo.classList.contains('estoque-action')) return;
      var acao = alvo.getAttribute('data-action');
      var tr = alvo.closest('tr');
      if (!tr) return;
      var itemId = tr.getAttribute('data-id');
      if (acao === 'editar') editarItemEstoque(tr);
      else if (acao === 'excluir') excluirItemEstoque(tr);
      else if (acao === 'mais') ajustarItemEstoque(itemId, 1);
      else if (acao === 'menos') ajustarItemEstoque(itemId, -1);
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
      if (!telefone) { alert('Informe seu WhatsApp com DDD.'); return; }
      if (!apikey && !notifApikeySalva) { alert('Informe a API Key do CallMeBot.'); return; }
      request(API_ESTOQUE + '?acao=notificacoes_salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefone, callmebot_apikey: apikey, ativo: ativo ? 1 : 0, manter_apikey: !apikey })
      }).then(function (res) {
        if (!res.ok) { alert(res.message || 'Não foi possível salvar as notificações.'); return; }
        if (res.notificacoes) preencherNotificacoes(res.notificacoes);
        document.getElementById('notif-apikey').value = '';
        alert('Conexão WhatsApp salva com sucesso.');
      }).catch(function () { alert('Erro ao salvar notificações.'); });
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
        if (!res.ok) { alert(res.message || 'Falha ao enviar teste.'); return; }
        alert(res.message || 'Mensagem de teste enviada. Confira seu WhatsApp.');
      }).catch(function () { alert('Erro ao enviar teste.'); });
    });
  }

  if (logoutTop) logoutTop.hidden = true;
  verificarAuthInicial();
})();
