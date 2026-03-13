(function () {
  'use strict';

  var input = document.getElementById('busca-modelo');
  var btnBuscar = document.getElementById('btn-buscar');
  var resultado = document.getElementById('resultado-servicos');
  var resultadoTitulo = document.getElementById('resultado-titulo');
  var tabelaBody = document.getElementById('tabela-servicos-body');
  var resultadoNenhum = document.getElementById('resultado-nenhum');
  var termoBuscado = document.getElementById('termo-buscado');
  var estadoInicial = document.getElementById('estado-inicial');
  var servicosPorModelo = {};
  var apiDisponivel = true;

  function normalizar(str) {
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatarPreco(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
  }

  function capitalizarPalavras(str) {
    return str.split(' ').map(function (p) {
      if (!p) { return ''; }
      return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(' ');
  }

  function organizarDadosApi(items) {
    var mapa = {};
    items.forEach(function (item) {
      var modelo = normalizar(String(item.modelo || ''));
      if (!modelo) return;
      if (!mapa[modelo]) mapa[modelo] = [];
      mapa[modelo].push({
        nome: String(item.nome_servico || ''),
        preco: Number(item.preco || 0)
      });
    });
    servicosPorModelo = mapa;
  }

  function carregarServicos() {
    fetch('api/servicos.php')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok || !Array.isArray(data.items)) {
          apiDisponivel = false;
          return;
        }
        organizarDadosApi(data.items);
      })
      .catch(function () {
        apiDisponivel = false;
      });
  }

  function buscar() {
    var termo = (input.value || '').trim();
    if (!termo) {
      estadoInicial.hidden = false;
      resultado.hidden = true;
      resultadoNenhum.hidden = true;
      return;
    }

    var termoNorm = normalizar(termo);
    var dados = servicosPorModelo;
    var matches = [];

    for (var chave in dados) {
      if (dados.hasOwnProperty(chave) && chave.indexOf(termoNorm) !== -1) {
        matches.push({ chave: chave, servicos: dados[chave] });
      }
    }

    estadoInicial.hidden = true;

    if (!matches.length) {
      resultado.hidden = true;
      resultadoNenhum.hidden = false;
      termoBuscado.textContent = termo + (apiDisponivel ? '' : ' (sem conexão com API)');
      return;
    }

    resultadoNenhum.hidden = true;
    resultado.hidden = false;

    resultadoTitulo.textContent = 'Preços — Linha ' + termo;

    tabelaBody.innerHTML = '';
    matches.forEach(function (match) {
      var nomeModelo = capitalizarPalavras(match.chave);
      match.servicos.forEach(function (item) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + nomeModelo + '</td>' +
          '<td>' + item.nome + '</td>' +
          '<td class="tabela-preco">' + formatarPreco(item.preco) + '</td>';
        tabelaBody.appendChild(tr);
      });
    });
  }

  if (btnBuscar) {
    btnBuscar.addEventListener('click', buscar);
  }
  if (input) {
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscar();
      }
    });
  }

  carregarServicos();
})();
