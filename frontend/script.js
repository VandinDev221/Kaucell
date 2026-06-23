(function () {
  'use strict';

  var header = document.querySelector('.header');
  var menuToggle = document.querySelector('.menu-toggle');
  var navLinks = document.querySelectorAll('.nav-link');
  var destaquesMount = document.querySelector('.section-destaques .produtos-carrosseis');
  var catalogoMount = document.querySelector('.section-produtos-interna .produtos-carrosseis');
  var MAX_PRODUTOS_CARROSSEL = 10;
  var isAdmin = document.body.classList.contains('admin-body') || /admin\.html/.test(window.location.pathname);

  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('header--scrolled', window.scrollY > 20);
    }, { passive: true });
  }

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

  if (!isAdmin && !document.querySelector('.whatsapp-float')) {
    var waLink = document.createElement('a');
    waLink.href = 'https://wa.me/5598991986345?text=Ol%C3%A1!%20Vim%20atrav%C3%A9s%20do%20site%20da%20KAUCELL%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es.';
    waLink.className = 'whatsapp-float';
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    waLink.setAttribute('aria-label', 'Fale conosco pelo WhatsApp');
    waLink.setAttribute('title', 'WhatsApp');
    waLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
    document.body.appendChild(waLink);
  }

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

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

