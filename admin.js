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
  var API = {
    produtos: 'api/produtos.php',
    servicos: 'api/servicos.php',
    blog: 'api/blog.php'
  };

  function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
  }

  function formatarData(dataIso) {
    var data = new Date(dataIso + 'T00:00:00');
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
    tr.innerHTML =
      '<td>' + item.nome + '</td>' +
      '<td>' + item.categoria + '</td>' +
      '<td class="tabela-preco">' + formatarPreco(item.preco) + '</td>' +
      '<td>' + imagemInfo + '</td>' +
      '<td class="admin-actions">' +
      '<button type="button" class="btn btn-small btn-secondary admin-action-btn" data-action="editar">Editar</button> ' +
      '<button type="button" class="btn btn-small btn-primary admin-action-btn" data-action="excluir">Excluir</button>' +
      '</td>';
    return tr;
  }

  function renderServico(item) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + item.modelo + '</td>' +
      '<td>' + item.nome_servico + '</td>' +
      '<td class="tabela-preco">' + formatarPreco(item.preco) + '</td>';
    return tr;
  }

  function renderBlog(item) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + item.titulo + '</td>' +
      '<td>' + formatarData(item.data_publicacao) + '</td>' +
      '<td>' + item.resumo + '</td>';
    return tr;
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
        imagem_arquivo: imagemArquivoAtual
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
            imagem_arquivo: imagemFinalArquivo || ''
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
      var resumo = document.getElementById('blog-resumo').value.trim();

      if (!titulo || !data || !resumo) return;

      request(API.blog, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo,
          data_publicacao: data,
          resumo: resumo
        })
      }).then(function (res) {
        if (!res.ok || !res.item) {
          alert(res.message || 'Não foi possível cadastrar o post.');
          return;
        }
        listaBlog.prepend(renderBlog(res.item));
        formBlog.reset();
      }).catch(function () {
        alert('Erro ao conectar com a API de blog.');
      });
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

  verificarAuthInicial();
})();
