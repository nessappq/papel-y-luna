// Modulo de compras

var Purchases = (function () {

  var purchaseItems = []; // lineas de la compra en edicion

  function init() {
    document.getElementById('btn-add-purchase-line').addEventListener('click', addLine);
    document.getElementById('purchase-form').addEventListener('submit', savePurchase);
    document.getElementById('pur-search').addEventListener('input', renderTable);
    renderTable();
  }

  function refresh() { renderTable(); }

  // ── Tabla de historial de compras ──
  function renderTable() {
    var q     = UI.normalizarTexto(document.getElementById('pur-search').value);
    var tbody = document.getElementById('purchases-tbody');
    var list  = State.getPurchases().slice().reverse().filter(function (p) {
      return UI.normalizarTexto(p.id).indexOf(q) >= 0 ||
             UI.normalizarTexto(p.supplier || '').indexOf(q) >= 0;
    });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-light)">'
        + (q ? 'Sin resultados' : 'No hay compras registradas')
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (p) {
      var totalCosto = (p.items || []).reduce(function (s, i) { return s + i.cost * i.qty; }, 0);
      return '<tr>'
        + '<td><strong>' + p.id + '</strong></td>'
        + '<td>' + UI.fmtDate(p.date) + '</td>'
        + '<td>' + (p.supplier || '—') + '</td>'
        + '<td>' + (p.items ? p.items.length : 0) + ' producto(s)</td>'
        + '<td><strong>' + UI.fmtCurrency(totalCosto) + '</strong></td>'
        + '</tr>';
    }).join('');
  }

  // ── Formulario nueva compra ──
  function openForm() {
    purchaseItems = [];
    document.getElementById('pur-supplier').value = '';
    document.getElementById('pur-notes').value    = '';
    renderLines();
    addLine(); // empezar con una linea vacia
    UI.openModal('modal-purchase');
  }

  function addLine() {
    var products = State.getProducts();
    var options  = products.map(function (p) {
      return '<option value="' + p.id + '">' + p.code + ' - ' + p.name + '</option>';
    }).join('');

    var lineId = Date.now();
    purchaseItems.push({ lineId: lineId, productId: '', qty: 1, cost: 0 });
    renderLines();
  }

  function renderLines() {
    var el       = document.getElementById('purchase-lines');
    var products = State.getProducts();

    if (!purchaseItems.length) {
      el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-light)">Agrega productos a la compra</div>';
      return;
    }

    el.innerHTML = purchaseItems.map(function (line, idx) {
      var options = '<option value="">-- Seleccionar --</option>' + products.map(function (p) {
        return '<option value="' + p.id + '"' + (line.productId === p.id ? ' selected' : '') + '>'
          + p.code + ' - ' + p.name + '</option>';
      }).join('');

      return '<div class="purchase-line" data-idx="' + idx + '">'
        + '<select class="form-control pur-prod" data-idx="' + idx + '">' + options + '</select>'
        + '<input type="number" class="form-control pur-qty" data-idx="' + idx + '" value="' + line.qty + '" min="1" placeholder="Cant." style="width:80px">'
        + '<input type="number" class="form-control pur-cost" data-idx="' + idx + '" value="' + (line.cost || '') + '" min="0" placeholder="Costo unit." style="width:120px">'
        + '<span class="pur-subtotal" data-idx="' + idx + '">' + UI.fmtCurrency(line.qty * line.cost) + '</span>'
        + '<button type="button" class="btn btn-ghost btn-sm btn-remove-line" data-idx="' + idx + '">X</button>'
        + '</div>';
    }).join('');

    // Calcular total
    var total = purchaseItems.reduce(function (s, l) { return s + l.qty * l.cost; }, 0);
    document.getElementById('pur-total').textContent = UI.fmtCurrency(total);

    // Eventos
    el.querySelectorAll('.pur-prod').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var idx = parseInt(sel.dataset.idx);
        purchaseItems[idx].productId = sel.value;
        var prod = State.getProductById(sel.value);
        if (prod) { purchaseItems[idx].cost = prod.cost; renderLines(); }
      });
    });
    el.querySelectorAll('.pur-qty').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var idx = parseInt(inp.dataset.idx);
        purchaseItems[idx].qty = parseInt(inp.value) || 1;
        renderLines();
      });
    });
    el.querySelectorAll('.pur-cost').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var idx = parseInt(inp.dataset.idx);
        purchaseItems[idx].cost = parseFloat(inp.value) || 0;
        renderLines();
      });
    });
    el.querySelectorAll('.btn-remove-line').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.idx);
        purchaseItems.splice(idx, 1);
        renderLines();
      });
    });
  }

  async function savePurchase(e) {
    e.preventDefault();

    var supplier = document.getElementById('pur-supplier').value.trim();
    var notes    = document.getElementById('pur-notes').value.trim();

    // Validar lineas
    var validLines = purchaseItems.filter(function (l) { return l.productId && l.qty > 0; });
    if (!validLines.length) {
      UI.showToast('Agrega al menos un producto a la compra', 'error');
      return;
    }
    var incomplete = purchaseItems.some(function (l) { return !l.productId; });
    if (incomplete) {
      UI.showToast('Selecciona el producto en todas las lineas', 'error');
      return;
    }

    var data = {
      supplier: supplier || 'Sin proveedor',
      notes:    notes,
      items:    validLines.map(function (l) {
        return { productId: l.productId, name: State.getProductById(l.productId).name, qty: l.qty, cost: l.cost };
      })
    };

    // 1. Guardar en localStorage
    var purchase = State.addPurchase(data);

    // 2. Enviar a Google Sheets via POST (async/await)
    UI.closeModal('modal-purchase');
    renderTable();
    if (window.Products) Products.refresh();
    UI.showToast('Registrando compra ' + purchase.id + '...', 'info');

    var res = await State.postPurchaseToAPI(purchase);
    if (res && res.success) {
      UI.showToast('Compra ' + purchase.id + ' enviada al servidor', 'success');
    } else {
      UI.showToast('Compra guardada localmente (sin conexion al servidor)', 'info');
    }
  }

  return { init: init, refresh: refresh, openForm: openForm };

})();
