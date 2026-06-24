(function () {
  'use strict';

  var WA_NUMERO = '5598991986345';
  var WA_URL = 'https://wa.me/' + WA_NUMERO + '?text=Ol%C3%A1!%20Vim%20atrav%C3%A9s%20do%20site%20da%20KAUCELL%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es.';
  var WA_ICONE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
  var header = document.querySelector('.header');
  var menuToggle = document.querySelector('.menu-toggle');
  var navOverlay = document.querySelector('.nav-overlay');
  var navLinks = document.querySelectorAll('.nav-link');
  var destaquesMount = document.querySelector('.section-destaques .produtos-carrosseis');
  var catalogoMount = document.querySelector('.section-produtos-interna .produtos-carrosseis');
  var MAX_PRODUTOS_CARROSSEL = 10;
  var isAdmin = document.body.classList.contains('admin-body') || /admin\.html|estoque\.html/.test(window.location.pathname);

  function closeMenu() {
    if (!header) return;
    header.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (navOverlay) navOverlay.setAttribute('aria-hidden', 'true');
  }

  function openMenu() {
    if (!header) return;
    header.classList.add('nav-open');
    document.body.classList.add('nav-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
    if (navOverlay) navOverlay.setAttribute('aria-hidden', 'false');
  }

  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('header--scrolled', window.scrollY > 16);
    }, { passive: true });
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      if (header.classList.contains('nav-open')) closeMenu();
      else openMenu();
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', closeMenu);
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
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
    waLink.href = WA_URL;
    waLink.className = 'whatsapp-float';
    waLink.target = '_blank';
    waLink.rel = 'noopener noreferrer';
    waLink.setAttribute('aria-label', 'Fale conosco pelo WhatsApp');
    waLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
    document.body.appendChild(waLink);
  }

  var revealObserver = null;

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  var pageId = document.body.getAttribute('data-page');
  if (pageId) {
    document.querySelectorAll('.bottom-nav a[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === pageId) link.classList.add('active');
      else link.classList.remove('active');
    });
  }

  function formatarPreco(valor) {
    var n = Number(valor) || 0;
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function resolverUrlImagemProduto(item) {
    var url = String(item.imagem_url || item.imagem_arquivo || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    var base = window.location.origin.replace(/\/$/, '');
    return base + '/' + url.replace(/^\//, '');
  }

  function montarUrlWhatsAppProduto(item) {
    var linhas = ['Tenho interesse', '', item.nome || 'Produto', 'Preço: ' + formatarPreco(item.preco)];
    var imgUrl = resolverUrlImagemProduto(item);
    if (imgUrl) {
      linhas.push('');
      linhas.push(imgUrl);
    }
    return 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent(linhas.join('\n'));
  }

  function criarBotaoWhatsAppProduto(item) {
    var link = document.createElement('a');
    link.href = montarUrlWhatsAppProduto(item);
    link.className = 'btn btn-whatsapp btn-whatsapp-produto btn-small';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Tenho interesse — falar no WhatsApp sobre ' + (item.nome || 'produto'));
    link.innerHTML = WA_ICONE_SVG + '<span>WhatsApp</span>';
    return link;
  }

  function fatiarProdutosEmCarrosseis(items, maxPorCarrossel) {
    var limite = maxPorCarrossel || MAX_PRODUTOS_CARROSSEL;
    var blocos = [];
    for (var i = 0; i < items.length; i += limite) {
      blocos.push(items.slice(i, i + limite));
    }
    return blocos;
  }

  function criarCardProduto(item, comLink) {
    var artigo = document.createElement('article');
    artigo.className = 'card-produto';

    var imgDiv = document.createElement('div');
    imgDiv.className = 'card-produto-img';
    var imgUrl = resolverUrlImagemProduto(item);
    if (imgUrl) {
      imgDiv.style.backgroundImage = 'url(' + imgUrl + ')';
    } else {
      imgDiv.textContent = 'KAUCELL';
    }

    var body = document.createElement('div');
    body.className = 'card-produto-body';

    var titulo = document.createElement('h3');
    titulo.textContent = item.nome;

    var preco = document.createElement('p');
    preco.className = 'card-produto-preco';
    preco.textContent = formatarPreco(item.preco);

    body.appendChild(titulo);
    body.appendChild(preco);

    var acoes = document.createElement('div');
    acoes.className = 'card-produto-acoes';
    acoes.appendChild(criarBotaoWhatsAppProduto(item));

    if (comLink) {
      var link = document.createElement('a');
      link.href = 'produtos.html';
      link.className = 'btn btn-primary btn-small';
      link.textContent = 'Ver catálogo';
      acoes.appendChild(link);
    }

    body.appendChild(acoes);

    artigo.appendChild(imgDiv);
    artigo.appendChild(body);
    return artigo;
  }

  function carregarProdutosDestaque() {
    if (!destaquesMount) return;

    fetch('api/produtos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) return;

        var destaques = data.items.filter(function (item) {
          return item.destaque === 1 || item.destaque === '1';
        });

        if (!destaques.length) return;

        destaquesMount.innerHTML = '';

        fatiarProdutosEmCarrosseis(destaques, MAX_PRODUTOS_CARROSSEL).forEach(function (chunk) {
          var grid = document.createElement('div');
          grid.className = 'produtos-grid produtos-grid--carousel-mobile';
          chunk.forEach(function (item) {
            grid.appendChild(criarCardProduto(item, true));
          });
          destaquesMount.appendChild(grid);
        });
      })
      .catch(function () {});
  }

  function carregarCatalogoCompleto() {
    if (!catalogoMount) return;

    fetch('api/produtos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) return;

        catalogoMount.innerHTML = '';

        fatiarProdutosEmCarrosseis(data.items, MAX_PRODUTOS_CARROSSEL).forEach(function (chunk) {
          var grid = document.createElement('div');
          grid.className = 'produtos-grid produtos-grid--carousel-mobile';
          chunk.forEach(function (item) {
            grid.appendChild(criarCardProduto(item, false));
          });
          catalogoMount.appendChild(grid);
        });
      })
      .catch(function () {});
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
          grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>Nenhum post ainda</h3><p>Em breve teremos dicas e novidades por aqui.</p></div>';
          return;
        }

        grid.innerHTML = '';
        data.items.forEach(function (item) {
          var artigo = document.createElement('article');
          artigo.className = 'card-blog reveal';

          var imgDiv = document.createElement('div');
          imgDiv.className = 'card-blog-img';
          if (item.imagem_url) {
            imgDiv.style.backgroundImage = 'url(' + item.imagem_url + ')';
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

        document.querySelectorAll('.card-blog.reveal').forEach(function (el) {
          if (revealObserver) revealObserver.observe(el);
          else el.classList.add('is-visible');
        });
      })
      .catch(function () {
        if (grid) grid.innerHTML = '<div class="empty-state"><p>Erro ao carregar o blog. Tente novamente mais tarde.</p></div>';
      });
  }

  carregarProdutosDestaque();
  carregarCatalogoCompleto();
  carregarBlog();
})();
