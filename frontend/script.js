(function () {
  'use strict';

  var header = document.querySelector('.header');
  var menuToggle = document.querySelector('.menu-toggle');
  var navLinks = document.querySelectorAll('.nav-link');
  var destaquesMount = document.querySelector('.section-destaques .produtos-carrosseis');
  var catalogoMount = document.querySelector('.section-produtos-interna .produtos-carrosseis');
  var MAX_PRODUTOS_CARROSSEL = 10;

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      header.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-label',
        header.classList.contains('nav-open') ? 'Fechar menu' : 'Abrir menu');
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 768 && header.classList.contains('nav-open')) {
        header.classList.remove('nav-open');
      }
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    var href = anchor.getAttribute('href');
    if (href === '#') return;
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  function formatarPreco(valor) {
    var n = Number(valor) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function fatiarProdutosEmCarrosseis(items, maxPorCarrossel) {
    var limite = maxPorCarrossel || MAX_PRODUTOS_CARROSSEL;
    var blocos = [];
    for (var i = 0; i < items.length; i += limite) {
      blocos.push(items.slice(i, i + limite));
    }
    return blocos;
  }

  function criarCardProdutoDestaque(item) {
    var artigo = document.createElement('article');
    artigo.className = 'card-produto';

    var imgDiv = document.createElement('div');
    imgDiv.className = 'card-produto-img';
    if (item.imagem_url) {
      imgDiv.style.backgroundImage = 'url(' + item.imagem_url + ')';
      imgDiv.style.backgroundSize = 'cover';
      imgDiv.style.backgroundPosition = 'center';
      imgDiv.textContent = '';
    } else {
      imgDiv.textContent = 'KAUCELL';
    }

    var titulo = document.createElement('h3');
    titulo.textContent = item.nome;

    var preco = document.createElement('p');
    preco.className = 'card-produto-preco';
    preco.textContent = formatarPreco(item.preco);

    var link = document.createElement('a');
    link.href = 'produtos.html';
    link.className = 'btn btn-small';
    link.textContent = 'Ver catálogo completo';

    artigo.appendChild(imgDiv);
    artigo.appendChild(titulo);
    artigo.appendChild(preco);
    artigo.appendChild(link);

    return artigo;
  }

  function criarCardProdutoCatalogo(item) {
    var artigo = document.createElement('article');
    artigo.className = 'card-produto';

    var imgDiv = document.createElement('div');
    imgDiv.className = 'card-produto-img';
    if (item.imagem_url) {
      imgDiv.style.backgroundImage = 'url(' + item.imagem_url + ')';
      imgDiv.style.backgroundSize = 'cover';
      imgDiv.style.backgroundPosition = 'center';
      imgDiv.textContent = '';
    } else {
      imgDiv.textContent = 'KAUCELL';
    }

    var titulo = document.createElement('h3');
    titulo.textContent = item.nome;

    var preco = document.createElement('p');
    preco.className = 'card-produto-preco';
    preco.textContent = formatarPreco(item.preco);

    artigo.appendChild(imgDiv);
    artigo.appendChild(titulo);
    artigo.appendChild(preco);

    return artigo;
  }

  function carregarProdutosDestaque() {
    if (!destaquesMount) return;

    fetch('api/produtos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          return;
        }

        var destaques = data.items.filter(function (item) {
          return item.destaque === 1 || item.destaque === '1';
        });

        if (!destaques.length) {
          return;
        }

        destaquesMount.innerHTML = '';

        fatiarProdutosEmCarrosseis(destaques, MAX_PRODUTOS_CARROSSEL).forEach(function (chunk) {
          var grid = document.createElement('div');
          grid.className = 'produtos-grid produtos-grid--carousel-mobile';
          chunk.forEach(function (item) {
            grid.appendChild(criarCardProdutoDestaque(item));
          });
          destaquesMount.appendChild(grid);
        });
      })
      .catch(function () {
        // Silencioso: mantém o conteúdo estático se der erro
      });
  }

  function carregarCatalogoCompleto() {
    if (!catalogoMount) return;

    fetch('api/produtos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          return;
        }

        catalogoMount.innerHTML = '';

        fatiarProdutosEmCarrosseis(data.items, MAX_PRODUTOS_CARROSSEL).forEach(function (chunk) {
          var grid = document.createElement('div');
          grid.className = 'produtos-grid produtos-grid--carousel-mobile';
          chunk.forEach(function (item) {
            grid.appendChild(criarCardProdutoCatalogo(item));
          });
          catalogoMount.appendChild(grid);
        });
      })
      .catch(function () {
        // mantém texto padrão se der erro
      });
  }

  function formatarData(dataIso) {
    if (!dataIso) return '';
    var d = /^\d{4}-\d{2}-\d{2}$/.test(String(dataIso).trim())
      ? new Date(dataIso + 'T12:00:00')
      : new Date(dataIso);
    if (Number.isNaN(d.getTime())) return dataIso;
    return d.toLocaleDateString('pt-BR');
  }

  function carregarBlog() {
    var grid = document.getElementById('blog-grid');
    if (!grid) return;

    fetch('api/blog.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          grid.innerHTML = '<p class="section-desc">Nenhum post ainda.</p>';
          return;
        }

        grid.innerHTML = '';
        data.items.forEach(function (item) {
          var artigo = document.createElement('article');
          artigo.className = 'card-blog';

          var imgDiv = document.createElement('div');
          imgDiv.className = 'card-blog-img';
          if (item.imagem_url) {
            imgDiv.style.backgroundImage = 'url(' + item.imagem_url + ')';
            imgDiv.style.backgroundSize = 'cover';
            imgDiv.style.backgroundPosition = 'center';
          } else {
            imgDiv.textContent = 'Blog';
          }

          var titulo = document.createElement('h3');
          titulo.textContent = item.titulo;

          var dataEl = document.createElement('time');
          dataEl.setAttribute('datetime', item.data_publicacao);
          dataEl.textContent = formatarData(item.data_publicacao);

          var resumo = document.createElement('p');
          resumo.textContent = item.resumo || '';

          var body = document.createElement('div');
          body.className = 'card-blog-body';
          body.appendChild(dataEl);
          body.appendChild(titulo);
          body.appendChild(resumo);

          artigo.appendChild(imgDiv);
          artigo.appendChild(body);
          grid.appendChild(artigo);
        });
      })
      .catch(function () {
        if (grid) grid.innerHTML = '<p class="section-desc">Erro ao carregar o blog.</p>';
      });
  }

  carregarProdutosDestaque();
  carregarCatalogoCompleto();
  carregarBlog();
})(); 

