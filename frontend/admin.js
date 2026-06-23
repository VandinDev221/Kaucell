(function () {
  'use strict';

  var formProduto = document.getElementById('form-produto');
  var formServico = document.getElementById('form-servico');
  var formServicoLote = document.getElementById('form-servico-lote');
  var formBlog = document.getElementById('form-blog');

  var listaProdutos = document.getElementById('lista-produtos');
  var listaServicos = document.getElementById('lista-servicos');
  var listaBlog = document.getElementById('lista-blog');
  var adminStatus = document.getElementById('admin-status');
  var adminArea = document.getElementById('admin-area');
  var loginArea = document.getElementById('admin-login-area');
  var loginForm = document.getElementById('admin-login-form');
  var loginUsuario = document.getElementById('admin-usuario');
  var loginSenha = document.getElementById('admin-senha');
  var logoutTop = document.querySelector('.admin-logout-top');
  var chkDestaque = document.getElementById('produto-destaque');
  var API = {
    produtos: 'api/produtos.php',
    servicos: 'api/servicos.php',
    blog: 'api/blog.php',
    estoque: 'api/estoque.php'
  };

  var adminTabs = document.querySelectorAll('.admin-tab');
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
  var estoqueCache = { secoes: [], alertas: { faltando: [], baixo: [] } };

  function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
  }

  function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function ativarAba(tabId) {
    adminTabs.forEach(function (btn) {
      var ativo = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('admin-tab--active', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    });
    document.querySelectorAll('.admin-tab-panel').forEach(function (panel) {
      var visivel = panel.id === 'tab-' + tabId;
      panel.hidden = !visivel;
    });
    if (tabId === 'estoque') {
      carregarEstoque();
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
    if (estoqueAlertas) estoqueAlertas.hidden = false;
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
    tr.setAttribute('data-status', item.status || 'ok');
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

    var tbodyId = 'estoque-tbody-' + secao.id;
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
      '</tr></thead><tbody id="' + tbodyId + '">' + rows + '</tbody></table></div>';

    if (!secao.itens || !secao.itens.length) {
      var empty = document.createElement('p');
      empty.className = 'estoque-empty';
      empty.textContent = 'Nenhuma peça nesta seção.';
      article.querySelector('.admin-table-wrap').appendChild(empty);
    }
    return article;
  }

  function renderEstoqueCompleto(data) {
    estoqueCache = data;
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

  function carregarEstoque() {
    request(API.estoque)
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.secoes)) {
          alert(res.message || 'Falha ao carregar estoque.');
          return;
        }
        renderEstoqueCompleto(res);
      })
      .catch(function () {
        alert('Erro ao conectar com a API de estoque.');
      });
  }

  function gerarRelatorioCsv() {
    request(API.estoque + '?relatorio=1')
      .then(function (res) {
        if (!res.ok) {
          alert(res.message || 'Falha ao gerar relatório.');
          return;
        }
        var linhas = ['Secao;Peca;Quantidade;Minimo;Unidade;Status'];
        (res.faltando || []).forEach(function (item) {
          linhas.push([
            item.secao_nome, item.nome, item.quantidade, item.quantidade_minima, item.unidade, 'EM FALTA'
          ].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'));
        });
        (res.baixo || []).forEach(function (item) {
          linhas.push([
            item.secao_nome, item.nome, item.quantidade, item.quantidade_minima, item.unidade, 'BAIXO'
          ].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(';'));
        });
        if (linhas.length === 1) {
          alert('Nenhuma peça em falta ou com estoque baixo no momento.');
          return;
        }
        var blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'kaucell-estoque-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(function () {
        alert('Erro ao gerar relatório.');
      });
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

    var novaSecao = prompt('ID da seção (atual: ' + secaoId + '):', secaoId);
    if (novaSecao === null) return;
    novaSecao = parseInt(novaSecao, 10);
    if (!novaSecao) return;

    var novaQtd = prompt('Quantidade atual:', qtd);
    if (novaQtd === null) return;
    novaQtd = parseInt(novaQtd, 10);
    if (Number.isNaN(novaQtd) || novaQtd < 0) return;

    var novoMin = prompt('Quantidade mínima (alerta):', min);
    if (novoMin === null) return;
    novoMin = parseInt(novoMin, 10);
    if (Number.isNaN(novoMin) || novoMin < 0) return;

    var novaUnidade = prompt('Unidade (un, pç, kit):', unidade);
    if (novaUnidade === null) return;
    novaUnidade = novaUnidade.trim() || 'un';

    request(API.estoque + '?id=' + encodeURIComponent(id) + '&acao=item_editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secao_id: novaSecao,
        nome: novoNome,
        quantidade: novaQtd,
        quantidade_minima: novoMin,
        unidade: novaUnidade
      })
    }).then(function (res) {
      if (!res.ok) {
        alert(res.message || 'Não foi possível editar a peça.');
        return;
      }
      carregarEstoque();
    }).catch(function () {
      alert('Erro ao editar peça.');
    });
  }

  function ajustarItemEstoque(id, delta) {
    request(API.estoque + '?id=' + encodeURIComponent(id) + '&acao=item_ajustar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: delta })
    }).then(function (res) {
      if (!res.ok) {
        alert(res.message || 'Não foi possível ajustar a quantidade.');
        return;
      }
      carregarEstoque();
    }).catch(function () {
      alert('Erro ao ajustar quantidade.');
    });
  }

  function excluirItemEstoque(tr) {
    var id = tr.getAttribute('data-id');
    var nome = tr.getAttribute('data-nome') || 'esta peça';
    if (!confirm('Excluir "' + nome + '" do estoque?')) return;
    request(API.estoque + '?id=' + encodeURIComponent(id) + '&acao=item_excluir', { method: 'POST' })
      .then(function (res) {
        if (!res.ok) {
          alert(res.message || 'Não foi possível excluir a peça.');
          return;
        }
        carregarEstoque();
      })
      .catch(function () {
        alert('Erro ao excluir peça.');
      });
  }

  function editarSecaoEstoque(secaoId, nomeAtual) {
    var novoNome = prompt('Nome da seção:', nomeAtual);
    if (novoNome === null) return;
    novoNome = novoNome.trim();
    if (!novoNome) return;
    request(API.estoque + '?id=' + encodeURIComponent(secaoId) + '&acao=secao_editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome })
    }).then(function (res) {
      if (!res.ok) {
        alert(res.message || 'Não foi possível renomear a seção.');
        return;
      }
      carregarEstoque();
    }).catch(function () {
      alert('Erro ao renomear seção.');
    });
  }

  function excluirSecaoEstoque(secaoId, nomeSecao) {
    if (!confirm('Excluir a seção "' + nomeSecao + '" e todas as peças dela?')) return;
    request(API.estoque + '?id=' + encodeURIComponent(secaoId) + '&acao=secao_excluir', { method: 'POST' })
      .then(function (res) {
        if (!res.ok) {
          alert(res.message || 'Não foi possível excluir a seção.');
          return;
        }
        carregarEstoque();
      })
      .catch(function () {
        alert('Erro ao excluir seção.');
      });
  }
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
  }

  function formatarData(dataIso) {
    if (!dataIso) return '';
    var data = /^\d{4}-\d{2}-\d{2}$/.test(String(dataIso).trim())
      ? new Date(dataIso + 'T12:00:00')
      : new Date(dataIso);
    if (Number.isNaN(data.getTime())) return dataIso;
    return data.toLocaleDateString('pt-BR');
  }

  function limparTabela(el) {
    if (el) el.innerHTML = '';
  }

  function renderProduto(item) {
    var tr = document.createElement('tr');
    var imagemInfo = item.imagem_url || item.imagem_arquivo || 'Sem imagem';
    tr.setAttribute('data-id', item.id);
    tr.setAttribute('data-nome', item.nome);
    tr.setAttribute('data-categoria', item.categoria);
    tr.setAttribute('data-preco', item.preco);
    tr.setAttribute('data-imagem-url', item.imagem_url || '');
    tr.setAttribute('data-imagem-arquivo', item.imagem_arquivo || '');
    tr.setAttribute('data-destaque', item.destaque ? '1' : '0');
    tr.innerHTML =
      '<td>' + item.nome + '</td>' +
      '<td>' + item.categoria + '</td>' +
      '<td class="tabela-preco">' + formatarPreco(item.preco) + '</td>' +
      '<td>' + imagemInfo + '</td>' +
      '<td>' + (item.destaque ? 'Sim' : 'Não') + '</td>' +
      '<td class="admin-actions">' +
      '<button type="button" class="btn btn-small btn-secondary admin-action-btn" data-action="editar">Editar</button> ' +
      '<button type="button" class="btn btn-small btn-primary admin-action-btn" data-action="excluir">Excluir</button>' +
      '</td>';
    return tr;
  }

  function renderServico(item) {
    var tr = document.createElement('tr');
    tr.setAttribute('data-id', item.id);
    tr.setAttribute('data-modelo', item.modelo || '');
    tr.setAttribute('data-nome-servico', item.nome_servico || '');
    tr.setAttribute('data-preco', item.preco || '');
    tr.innerHTML =
      '<td>' + item.modelo + '</td>' +
      '<td>' + item.nome_servico + '</td>' +
      '<td class="tabela-preco">' + formatarPreco(item.preco) + '</td>' +
      '<td class="admin-actions">' +
      '<button type="button" class="btn btn-small btn-secondary admin-action-btn servico-action" data-action="editar">Editar</button> ' +
      '<button type="button" class="btn btn-small btn-primary admin-action-btn servico-action" data-action="excluir">Excluir</button>' +
      '</td>';
    return tr;
  }

  function editarServico(tr) {
    var id = tr.getAttribute('data-id');
    var modelo = tr.getAttribute('data-modelo') || '';
    var nomeServico = tr.getAttribute('data-nome-servico') || '';
    var preco = tr.getAttribute('data-preco') || '';

    var novoModelo = prompt('Modelo:', modelo);
    if (novoModelo === null) return;
    novoModelo = novoModelo.trim();

    var novoNome = prompt('Nome do serviço:', nomeServico);
    if (novoNome === null) return;
    novoNome = novoNome.trim();

    var novoPreco = prompt('Preço (R$):', String(preco).replace('.', ','));
    if (novoPreco === null) return;
    novoPreco = parseFloat(novoPreco.trim().replace(',', '.')) || 0;

    if (!novoModelo || !novoNome || novoPreco <= 0) {
      alert('Modelo, nome e preço são obrigatórios.');
      return;
    }

    request(API.servicos + '?id=' + encodeURIComponent(id) + '&acao=editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelo: novoModelo, nome_servico: novoNome, preco: novoPreco })
    }).then(function (res) {
      if (!res.ok || !res.item) {
        alert(res.message || 'Não foi possível editar o serviço.');
        return;
      }
      tr.replaceWith(renderServico(res.item));
    }).catch(function () {
      alert('Erro ao conectar com a API de serviços.');
    });
  }

  function excluirServico(tr) {
    var id = tr.getAttribute('data-id');
    var nome = tr.getAttribute('data-nome-servico') || 'este serviço';
    if (!confirm('Excluir "' + nome + '"?')) return;
    request(API.servicos + '?id=' + encodeURIComponent(id) + '&acao=excluir', {
      method: 'POST'
    }).then(function (res) {
      if (!res.ok) {
        alert(res.message || 'Não foi possível excluir o serviço.');
        return;
      }
      tr.remove();
    }).catch(function () {
      alert('Erro ao conectar com a API de serviços.');
    });
  }

  function renderBlog(item) {
    var tr = document.createElement('tr');
    var dataPub = item.data_publicacao ? String(item.data_publicacao).trim().substring(0, 10) : '';
    var imgCel = item.imagem_url
      ? '<img src="' + item.imagem_url.replace(/"/g, '&quot;') + '" alt="" class="admin-thumb" style="max-width:48px;max-height:32px;object-fit:cover;">'
      : '—';
    tr.setAttribute('data-id', item.id);
    tr.setAttribute('data-titulo', item.titulo || '');
    tr.setAttribute('data-data', dataPub);
    tr.setAttribute('data-resumo', item.resumo || '');
    tr.setAttribute('data-imagem-url', item.imagem_url || '');
    tr.innerHTML =
      '<td>' + (item.titulo || '').replace(/</g, '&lt;') + '</td>' +
      '<td>' + formatarData(item.data_publicacao) + '</td>' +
      '<td>' + imgCel + '</td>' +
      '<td>' + (item.resumo || '').substring(0, 60).replace(/</g, '&lt;') + (item.resumo && item.resumo.length > 60 ? '…' : '') + '</td>' +
      '<td>' +
      '<button type="button" class="btn btn-small btn-secondary admin-action-btn blog-action-btn" data-action="editar">Editar</button> ' +
      '<button type="button" class="btn btn-small btn-primary admin-action-btn blog-action-btn" data-action="excluir">Excluir</button>' +
      '</td>';
    return tr;
  }

  var editBlogId = null;
  var editBlogTr = null;

  function editarBlog(tr) {
    var id = tr.getAttribute('data-id');
    var titulo = tr.getAttribute('data-titulo') || '';
    var dataPub = tr.getAttribute('data-data') || '';
    var resumo = tr.getAttribute('data-resumo') || '';
    var imagemUrl = tr.getAttribute('data-imagem-url') || '';

    document.getElementById('blog-titulo').value = titulo;
    document.getElementById('blog-data').value = dataPub;
    var blogImagem = document.getElementById('blog-imagem');
    if (blogImagem) blogImagem.value = imagemUrl;
    document.getElementById('blog-resumo').value = resumo;
    var arquivoInput = document.getElementById('blog-imagem-arquivo');
    if (arquivoInput) arquivoInput.value = '';

    editBlogId = id;
    editBlogTr = tr;
    var submitBtn = document.getElementById('blog-submit-btn');
    if (submitBtn) { submitBtn.textContent = 'Salvar alterações'; }
    var cancelBtn = document.getElementById('blog-cancel-btn');
    if (cancelBtn) { cancelBtn.style.display = 'inline-block'; }
  }

  function excluirBlog(tr) {
    var id = tr.getAttribute('data-id');
    var titulo = tr.getAttribute('data-titulo') || 'este post';

    if (!confirm('Excluir o post "' + titulo + '"?')) return;

    request(API.blog + '?id=' + encodeURIComponent(id) + '&acao=excluir', {
      method: 'POST'
    }).then(function (res) {
      if (!res.ok) {
        alert(res.message || 'Não foi possível excluir o post.');
        return;
      }
      if (editBlogTr === tr) {
        sairEdicaoBlog();
      }
      tr.remove();
    }).catch(function () {
      alert('Erro ao conectar com a API de blog.');
    });
  }

  function sairEdicaoBlog() {
    editBlogId = null;
    editBlogTr = null;
    var submitBtn = document.getElementById('blog-submit-btn');
    if (submitBtn) { submitBtn.textContent = 'Adicionar post'; }
    var cancelBtn = document.getElementById('blog-cancel-btn');
    if (cancelBtn) { cancelBtn.style.display = 'none'; }
    if (formBlog) formBlog.reset();
  }

  function request(url, options) {
    return fetch(url, options).then(function (res) {
      return res.json();
    });
  }

  function setStatus(msg) {
    if (!adminStatus) return;
    if (!msg) {
      adminStatus.hidden = true;
      adminStatus.textContent = '';
      return;
    }
    adminStatus.hidden = false;
    adminStatus.textContent = msg;
  }

  function mostrarLogin() {
    if (loginArea) loginArea.hidden = false;
    if (adminArea) adminArea.hidden = true;
  }

  function mostrarAdmin() {
    if (loginArea) loginArea.hidden = true;
    if (adminArea) adminArea.hidden = false;
  }

  function verificarAuthInicial() {
    request('api/auth.php?acao=status')
      .then(function (res) {
        if (res.ok && res.logged) {
          mostrarAdmin();
          carregarDadosIniciais();
        } else {
          mostrarLogin();
        }
      })
      .catch(function () {
        mostrarLogin();
      });
  }

  function cadastrarServicoApi(modelo, nomeServico, preco) {
    return request(API.servicos, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelo: modelo,
        nome_servico: nomeServico,
        preco: preco
      })
    });
  }

  function carregarDadosIniciais() {
    setStatus('');

    request(API.produtos)
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.items)) {
          setStatus(res.message || 'Falha ao carregar produtos.');
          return;
        }
        limparTabela(listaProdutos);
        res.items.forEach(function (item) {
          listaProdutos.appendChild(renderProduto(item));
        });
      })
      .catch(function () {
        setStatus('Erro ao conectar com a API de produtos.');
      });

    request(API.servicos)
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.items)) {
          setStatus(res.message || 'Falha ao carregar serviços.');
          return;
        }
        limparTabela(listaServicos);
        res.items.forEach(function (item) {
          listaServicos.appendChild(renderServico(item));
        });
      })
      .catch(function () {
        setStatus('Erro ao conectar com a API de serviços.');
      });

    request(API.blog)
      .then(function (res) {
        if (!res.ok || !Array.isArray(res.items)) {
          setStatus(res.message || 'Falha ao carregar posts.');
          return;
        }
        limparTabela(listaBlog);
        res.items.forEach(function (item) {
          listaBlog.appendChild(renderBlog(item));
        });
      })
      .catch(function () {
        setStatus('Erro ao conectar com a API de blog.');
      });
  }

  function editarProduto(tr) {
    var id = tr.getAttribute('data-id');
    var nomeAtual = tr.getAttribute('data-nome') || '';
    var categoriaAtual = tr.getAttribute('data-categoria') || '';
    var precoAtual = tr.getAttribute('data-preco') || '';
    var imagemUrlAtual = tr.getAttribute('data-imagem-url') || '';
    var imagemArquivoAtual = tr.getAttribute('data-imagem-arquivo') || '';
    var destaqueAtual = tr.getAttribute('data-destaque') === '1';

    var novoNome = prompt('Nome do produto:', nomeAtual);
    if (novoNome === null) return;
    novoNome = novoNome.trim();

    var novaCategoria = prompt('Categoria:', categoriaAtual);
    if (novaCategoria === null) return;
    novaCategoria = novaCategoria.trim();

    var novoPreco = prompt('Preço (R$):', String(precoAtual).replace('.', ','));
    if (novoPreco === null) return;
    novoPreco = novoPreco.trim().replace(',', '.');

    var novaImagemUrl = prompt('URL da imagem (opcional):', imagemUrlAtual);
    if (novaImagemUrl === null) return;
    novaImagemUrl = novaImagemUrl.trim();

    var novoDestaqueStr = prompt('Marcar como destaque na home? (s/n)', destaqueAtual ? 's' : 'n');
    if (novoDestaqueStr === null) return;
    var novoDestaque = novoDestaqueStr.toLowerCase().startsWith('s');

    if (!novoNome || !novaCategoria || !novoPreco) {
      alert('Nome, categoria e preço são obrigatórios.');
      return;
    }

    request(API.produtos + '?id=' + encodeURIComponent(id) + '&acao=editar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: novoNome,
        categoria: novaCategoria,
        preco: novoPreco,
        imagem_url: novaImagemUrl,
        imagem_arquivo: imagemArquivoAtual,
        destaque: novoDestaque ? 1 : 0
      })
    }).then(function (res) {
      if (!res.ok || !res.item) {
        alert(res.message || 'Não foi possível editar o produto.');
        return;
      }
      tr.replaceWith(renderProduto(res.item));
    }).catch(function () {
      alert('Erro ao conectar com a API de produtos.');
    });
  }

  function excluirProduto(tr) {
    var id = tr.getAttribute('data-id');
    var nome = tr.getAttribute('data-nome') || 'este produto';

    if (!confirm('Excluir "' + nome + '"?')) return;

    request(API.produtos + '?id=' + encodeURIComponent(id) + '&acao=excluir', {
      method: 'POST'
    }).then(function (res) {
      if (!res.ok) {
        alert(res.message || 'Não foi possível excluir o produto.');
        return;
      }
      tr.remove();
    }).catch(function () {
      alert('Erro ao conectar com a API de produtos.');
    });
  }

  if (formProduto) {
    formProduto.addEventListener('submit', function (e) {
      e.preventDefault();

      var nome = document.getElementById('produto-nome').value.trim();
      var categoria = document.getElementById('produto-categoria').value.trim();
      var preco = document.getElementById('produto-preco').value;
      var imagemUrl = document.getElementById('produto-imagem-url').value.trim();
      var imagemArquivoInput = document.getElementById('produto-imagem-arquivo');
      var arquivo = imagemArquivoInput && imagemArquivoInput.files[0] ? imagemArquivoInput.files[0] : null;
      var destaqueMarcado = chkDestaque && chkDestaque.checked;

      if (!nome || !categoria || !preco) return;

      function criarProduto(imagemFinalUrl, imagemFinalArquivo) {
        request(API.produtos + '?acao=criar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nome,
            categoria: categoria,
            preco: preco,
            imagem_url: imagemFinalUrl || imagemUrl,
            imagem_arquivo: imagemFinalArquivo || '',
            destaque: destaqueMarcado ? 1 : 0
          })
        }).then(function (res) {
          if (!res.ok || !res.item) {
            alert(res.message || 'Não foi possível cadastrar o produto.');
            return;
          }
          listaProdutos.prepend(renderProduto(res.item));
          formProduto.reset();
        }).catch(function () {
          alert('Erro ao conectar com a API de produtos.');
        });
      }

      if (arquivo) {
        var formData = new FormData();
        formData.append('imagem', arquivo);
        fetch('api/upload.php', {
          method: 'POST',
          body: formData
        }).then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data.ok || !data.url) {
              alert(data.message || 'Não foi possível enviar a imagem.');
              criarProduto('', '');
              return;
            }
            criarProduto(data.url, data.filename);
          })
          .catch(function () {
            alert('Erro ao enviar a imagem.');
            criarProduto('', '');
          });
      } else {
        criarProduto('', '');
      }
    });
  }

  if (listaProdutos) {
    listaProdutos.addEventListener('click', function (e) {
      var alvo = e.target;
      if (!(alvo instanceof HTMLElement)) return;
      if (!alvo.classList.contains('admin-action-btn')) return;

      var acao = alvo.getAttribute('data-action');
      var tr = alvo.closest('tr');
      if (!tr) return;

      if (acao === 'editar') {
        editarProduto(tr);
      } else if (acao === 'excluir') {
        excluirProduto(tr);
      }
    });
  }

  if (listaServicos) {
    listaServicos.addEventListener('click', function (e) {
      var alvo = e.target;
      if (!(alvo instanceof HTMLElement)) return;
      if (!alvo.classList.contains('servico-action') && !alvo.classList.contains('admin-action-btn')) return;

      var acao = alvo.getAttribute('data-action');
      var tr = alvo.closest('tr');
      if (!tr) return;

      if (acao === 'editar') {
        editarServico(tr);
      } else if (acao === 'excluir') {
        excluirServico(tr);
      }
    });
  }

  if (listaBlog) {
    listaBlog.addEventListener('click', function (e) {
      var alvo = e.target;
      if (!(alvo instanceof HTMLElement)) return;
      if (!alvo.classList.contains('blog-action-btn')) return;
      var acao = alvo.getAttribute('data-action');
      var tr = alvo.closest('tr');
      if (!tr) return;
      if (acao === 'editar') {
        editarBlog(tr);
      } else if (acao === 'excluir') {
        excluirBlog(tr);
      }
    });
  }

  var blogCancelBtn = document.getElementById('blog-cancel-btn');
  if (blogCancelBtn) {
    blogCancelBtn.addEventListener('click', sairEdicaoBlog);
  }

  if (formServico) {
    formServico.addEventListener('submit', function (e) {
      e.preventDefault();

      var modelo = document.getElementById('servico-modelo').value.trim();
      var servico = document.getElementById('servico-nome').value.trim();
      var preco = document.getElementById('servico-preco').value;

      if (!modelo || !servico || !preco) return;

      cadastrarServicoApi(modelo, servico, preco).then(function (res) {
        if (!res.ok || !res.item) {
          alert(res.message || 'Não foi possível cadastrar o serviço.');
          return;
        }
        listaServicos.prepend(renderServico(res.item));
        formServico.reset();
      }).catch(function () {
        alert('Erro ao conectar com a API de serviços.');
      });
    });
  }

  if (formServicoLote) {
    formServicoLote.addEventListener('submit', function (e) {
      e.preventDefault();

      var modeloLote = document.getElementById('servico-modelo-lote').value.trim();
      var textoLote = document.getElementById('servico-lote').value.trim();

      if (!textoLote) {
        alert('Cole a lista de serviços para cadastrar em lote.');
        return;
      }

      var linhas = textoLote.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
      var itens = [];

      for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i];
        var partes = linha.split(';').map(function (p) { return p.trim(); });

        if (partes.length === 2) {
          if (!modeloLote) {
            alert('Informe o modelo/lote para usar linhas no formato Serviço;Preço.');
            return;
          }
          itens.push({
            modelo: modeloLote,
            nomeServico: partes[0],
            preco: partes[1].replace(',', '.')
          });
        } else if (partes.length === 3) {
          itens.push({
            modelo: partes[0],
            nomeServico: partes[1],
            preco: partes[2].replace(',', '.')
          });
        } else {
          alert('Linha inválida: "' + linha + '". Use Serviço;Preço ou Modelo;Serviço;Preço.');
          return;
        }
      }

      var promessas = itens.map(function (item) {
        return cadastrarServicoApi(item.modelo, item.nomeServico, item.preco);
      });

      Promise.all(promessas).then(function (resultados) {
        var falhas = resultados.filter(function (r) { return !r.ok || !r.item; });
        var sucesso = resultados.filter(function (r) { return r.ok && r.item; });

        sucesso.forEach(function (r) {
          listaServicos.prepend(renderServico(r.item));
        });

        if (falhas.length > 0) {
          alert('Lote concluído com parcial: ' + sucesso.length + ' cadastrados e ' + falhas.length + ' falhas.');
          return;
        }

        alert('Lote cadastrado com sucesso: ' + sucesso.length + ' serviços.');
        formServicoLote.reset();
      }).catch(function () {
        alert('Erro ao conectar com a API de serviços.');
      });
    });
  }

  if (formBlog) {
    formBlog.addEventListener('submit', function (e) {
      e.preventDefault();

      var titulo = document.getElementById('blog-titulo').value.trim();
      var data = document.getElementById('blog-data').value;
      var imagemUrlCampo = document.getElementById('blog-imagem') ? document.getElementById('blog-imagem').value.trim() : '';
      var imagemArquivoInput = document.getElementById('blog-imagem-arquivo');
      var arquivo = imagemArquivoInput && imagemArquivoInput.files[0] ? imagemArquivoInput.files[0] : null;
      var resumo = document.getElementById('blog-resumo').value.trim();

      if (!titulo || !data || !resumo) return;

      function salvarPost(imagemFinalUrl) {
        var url = editBlogId
          ? API.blog + '?id=' + encodeURIComponent(editBlogId) + '&acao=editar'
          : API.blog;
        var payload = {
          titulo: titulo,
          data_publicacao: data,
          resumo: resumo,
          imagem_url: imagemFinalUrl || imagemUrlCampo || undefined
        };
        request(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (!res.ok || !res.item) {
            alert(res.message || (editBlogId ? 'Não foi possível atualizar o post.' : 'Não foi possível cadastrar o post.'));
            return;
          }
          if (editBlogId && editBlogTr) {
            editBlogTr.replaceWith(renderBlog(res.item));
            sairEdicaoBlog();
          } else {
            listaBlog.prepend(renderBlog(res.item));
            formBlog.reset();
          }
        }).catch(function () {
          alert('Erro ao conectar com a API de blog.');
        });
      }

      if (arquivo) {
        var formData = new FormData();
        formData.append('imagem', arquivo);
        fetch('api/upload.php', {
          method: 'POST',
          body: formData
        }).then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data.ok || !data.url) {
              alert(data.message || 'Não foi possível enviar a imagem.');
              salvarPost('');
              return;
            }
            salvarPost(data.url);
          })
          .catch(function () {
            alert('Erro ao enviar a imagem.');
            salvarPost('');
          });
      } else {
        salvarPost('');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var usuario = loginUsuario ? loginUsuario.value.trim() : '';
      var senha = loginSenha ? loginSenha.value : '';
      if (!usuario || !senha) {
        setStatus('Informe usuário e senha.');
        return;
      }
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
        mostrarAdmin();
        carregarDadosIniciais();
      }).catch(function () {
        setStatus('Erro ao tentar fazer login.');
      });
    });
  }

  if (logoutTop) {
    logoutTop.addEventListener('click', function (e) {
      e.preventDefault();
      request('api/auth.php?acao=logout', { method: 'POST' })
        .finally(function () {
          if (loginUsuario) loginUsuario.value = '';
          if (loginSenha) loginSenha.value = '';
          mostrarLogin();
        });
    });
  }

  adminTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      ativarAba(btn.getAttribute('data-tab'));
    });
  });

  if (formEstoqueSecao) {
    formEstoqueSecao.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = document.getElementById('estoque-secao-nome').value.trim();
      if (!nome) return;
      request(API.estoque + '?acao=secao_criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome })
      }).then(function (res) {
        if (!res.ok) {
          alert(res.message || 'Não foi possível criar a seção.');
          return;
        }
        formEstoqueSecao.reset();
        carregarEstoque();
      }).catch(function () {
        alert('Erro ao criar seção.');
      });
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
      if (!secaoId || !nome) {
        alert('Selecione uma seção e informe o nome da peça.');
        return;
      }
      request(API.estoque + '?acao=item_criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secao_id: secaoId,
          nome: nome,
          quantidade: qtd,
          quantidade_minima: min,
          unidade: unidade
        })
      }).then(function (res) {
        if (!res.ok) {
          alert(res.message || 'Não foi possível cadastrar a peça.');
          return;
        }
        formEstoqueItem.reset();
        document.getElementById('estoque-item-qtd').value = '0';
        document.getElementById('estoque-item-min').value = '2';
        document.getElementById('estoque-item-unidade').value = 'un';
        carregarEstoque();
      }).catch(function () {
        alert('Erro ao cadastrar peça.');
      });
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

  if (btnEstoqueRelatorio) {
    btnEstoqueRelatorio.addEventListener('click', gerarRelatorioCsv);
  }

  if (btnEstoqueImprimir) {
    btnEstoqueImprimir.addEventListener('click', function () {
      ativarAba('estoque');
      window.print();
    });
  }

  verificarAuthInicial();
})(); 

