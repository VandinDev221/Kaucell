(function () {
  'use strict';

  var header = document.querySelector('.header');
  var menuToggle = document.querySelector('.menu-toggle');
  var navLinks = document.querySelectorAll('.nav-link');
  var gridDestaques = document.querySelector('.section-destaques .produtos-grid');
  var gridCatalogo = document.querySelector('.section-produtos-interna .produtos-grid');

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

  function carregarProdutosDestaque() {
    if (!gridDestaques) return;

    fetch('api/produtos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          return;
        }

        var destaques = data.items.filter(function (item) {
          return item.destaque === 1 || item.destaque === '1';
        }).slice(0, 3);

        if (!destaques.length) {
          return;
        }
        gridDestaques.innerHTML = '';

        destaques.forEach(function (item) {
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

          gridDestaques.appendChild(artigo);
        });
      })
      .catch(function () {
        // Silencioso: mantém o conteúdo estático se der erro
      });
  }

  function carregarCatalogoCompleto() {
    if (!gridCatalogo) return;

    fetch('api/produtos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items) || data.items.length === 0) {
          return;
        }

        gridCatalogo.innerHTML = '';

        data.items.forEach(function (item) {
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

          gridCatalogo.appendChild(artigo);
        });
      })
      .catch(function () {
        // mantém texto padrão se der erro
      });
  }

  carregarProdutosDestaque();
  carregarCatalogoCompleto();
})(); 

