// Modulo de ventas con soporte de ventas abiertas y edicion desde POS

var POS = (function () {

  var lastSale = null;

  // init es async para cargar productos desde la API antes de renderizar
  async function init() {
    document.getElementById('pos-search').addEventListener('input', renderProductGrid);
    document.getElementById('btn-cancel-sale').addEventListener('click', cancelSale);
    document.getElementById('btn-save-sale').addEventListener('click', saveSale);
    document.getElementById('btn-confirm-sale').addEventListener('click', confirmSale);
    document.getElementById('cash-received').addEventListener('input', renderChange);

    document.querySelectorAll('.pay-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { selectPayment(btn.dataset.method); });
    });

    document.getElementById('btn-ver-factura-conf').addEventListener('click', function () {
      UI.closeModal('modal-sale-ok');
      renderInvoice(lastSale);
      UI.openModal('modal-invoice');
    });

    document.getElementById('btn-open-sales').addEventListener('click', function () {
      renderOpenSalesList();
      UI.openModal('modal-open-sales');
    });

    // Formulario de edicion rapida desde POS
    document.getElementById('pos-edit-form').addEventListener('submit', savePosEdit);

    // Cargar productos desde Google Sheets antes de renderizar
    UI.showToast('Sincronizando productos...', 'info');
    var cargadoDesdeAPI = await State.loadProductsFromAPI();
    if (cargadoDesdeAPI) {
      UI.showToast('Catalogo actualizado desde servidor', 'success');
    }

    renderProductGrid();
    renderCart();
    updateOpenSalesBadge();
  }

  function refresh() {
    renderProductGrid();
    updateOpenSalesBadge();
  }

  // ── Catalogo de productos ──────────────────────────────────
  function renderProductGrid() {
    var q  = UI.normalizarTexto(document.getElementById('pos-search').value);
    var el = document.getElementById('product-grid');

    var list = State.getProducts().filter(function (p) {
      return UI.normalizarTexto(p.name).indexOf(q) >= 0 ||
             UI.normalizarTexto(p.category).indexOf(q) >= 0 ||
             UI.normalizarTexto(p.code).indexOf(q) >= 0;
    });

    if (!list.length) {
      el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light)">No se encontraron productos</div>';
      return;
    }

    el.innerHTML = list.map(function (p) {
      var noStock   = p.trackStock && p.stock === 0;
      var imageHtml = p.image
        ? '<div class="pt-img-container"><img src="' + p.image + '" class="pt-img"></div>'
        : '';
      return '<div class="product-tile' + (noStock ? ' no-stock' : '') + '" data-id="' + p.id + '" style="position:relative">'
        + imageHtml
        + '<div class="pt-body">'
          + '<div class="pt-name">' + p.name + '</div>'
          + '<div class="pt-price">' + UI.fmtCurrency(p.price) + '</div>'
          + (p.trackStock ? '<div class="pt-stock">Stock: ' + p.stock + '</div>' : '')
        + '</div>'
        // Boton editar — visible al hacer hover sobre la tarjeta
        + '<button class="btn-pos-edit" data-id="' + p.id + '" title="Editar producto">✏️</button>'
        + '</div>';
    }).join('');

    // Click en la tarjeta => agregar al carrito
    el.querySelectorAll('.product-tile').forEach(function (tile) {
      tile.addEventListener('click', function (e) {
        // Si el click fue en el boton editar, no agregar al carrito
        if (e.target.closest('.btn-pos-edit')) return;
        var ok = State.addToCart(tile.dataset.id);
        if (ok) { renderCart(); renderProductGrid(); }
        else    { UI.showToast('Sin stock disponible', 'error'); }
      });
    });

    // Click en boton editar => abrir modal de edicion rapida
    el.querySelectorAll('.btn-pos-edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openPosEdit(btn.dataset.id);
      });
    });
  }

  // ── Edicion rapida de producto desde POS ──────────────────
  function openPosEdit(id) {
    var p = State.getProductById(id);
    if (!p) return;
    document.getElementById('pos-edit-id').value       = p.id;
    document.getElementById('pos-edit-name').value     = p.name;
    document.getElementById('pos-edit-price').value    = p.price;
    document.getElementById('pos-edit-cost').value     = p.cost || '';
    document.getElementById('pos-edit-stock').value    = p.stock || 0;
    document.getElementById('pos-edit-category').value = p.category || '';
    UI.openModal('modal-pos-edit');
  }

  function savePosEdit(e) {
    e.preventDefault();
    var id   = document.getElementById('pos-edit-id').value;
    var data = {
      name:     document.getElementById('pos-edit-name').value.trim(),
      price:    parseFloat(document.getElementById('pos-edit-price').value) || 0,
      cost:     parseFloat(document.getElementById('pos-edit-cost').value)  || 0,
      stock:    parseInt(document.getElementById('pos-edit-stock').value)   || 0,
      category: document.getElementById('pos-edit-category').value.trim()
    };
    if (!data.name) { UI.showToast('El nombre es obligatorio', 'error'); return; }

    State.updateProduct(id, data);
    UI.closeModal('modal-pos-edit');

    // Reflejar cambios de inmediato en carrito y catalogo
    var cartItems = State.getCart();
    cartItems.forEach(function (item) {
      if (item.productId === id) {
        item.name  = data.name;
        item.price = data.price;
      }
    });

    renderProductGrid();
    renderCart();
    UI.showToast('Producto actualizado', 'success');
  }

  // ── Carrito ──────────────────────────────────────────────
  function renderCart() {
    var cart   = State.getCart();
    var el     = document.getElementById('cart-items');
    var total  = State.cartTotal();
    var nItems = cart.reduce(function (s, i) { return s + i.qty; }, 0);

    if (!cart.length) {
      el.innerHTML = '<div class="cart-empty">Agrega productos para iniciar la venta</div>';
    } else {
      el.innerHTML = cart.map(function (item) {
        return '<div class="cart-item">'
          + '<div><div class="ci-name">' + item.name + '</div>'
          + '<div class="ci-price">' + UI.fmtCurrency(item.price) + ' c/u</div></div>'
          + '<div class="ci-controls">'
          + '<button class="qty-btn" data-id="' + item.productId + '" data-delta="-1">-</button>'
          + '<span class="qty-val">' + item.qty + '</span>'
          + '<button class="qty-btn" data-id="' + item.productId + '" data-delta="1">+</button>'
          + '<button class="remove-btn" data-id="' + item.productId + '" title="Eliminar">X</button>'
          + '</div>'
          + '<div class="ci-total">' + UI.fmtCurrency(item.price * item.qty) + '</div>'
          + '</div>';
      }).join('');

      el.querySelectorAll('.qty-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          State.changeQty(btn.dataset.id, parseInt(btn.dataset.delta));
          renderCart(); renderProductGrid();
        });
      });
      el.querySelectorAll('.remove-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          State.removeFromCart(btn.dataset.id);
          renderCart(); renderProductGrid();
        });
      });
    }

    document.getElementById('cart-subtotal').textContent = UI.fmtCurrency(total);
    document.getElementById('cart-total').textContent    = UI.fmtCurrency(total);
    document.getElementById('cart-badge').textContent    = nItems + ' item' + (nItems !== 1 ? 's' : '');
    updateActionButtonsVisibility();
    renderChange();
  }

  function updateActionButtonsVisibility() {
    var hasItems  = State.getCart().length > 0;
    var btnCancel = document.getElementById('btn-cancel-sale');
    var btnSave   = document.getElementById('btn-save-sale');
    if (btnCancel) btnCancel.style.display = hasItems ? 'inline-flex' : 'none';
    if (btnSave)   btnSave.style.display   = hasItems ? 'inline-flex' : 'none';
  }

  function updateOpenSalesBadge() {
    var count = State.getOpenSales().length;
    var badge = document.getElementById('open-sales-badge');
    if (badge) {
      badge.textContent   = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  // ── Ventas abiertas ──────────────────────────────────────
  function saveSale() {
    if (!State.getCart().length) return;
    var os = State.saveOpenSale();
    renderCart();
    renderProductGrid();
    updateOpenSalesBadge();
    UI.showToast('Venta guardada: ' + os.id, 'info');
  }

  function renderOpenSalesList() {
    var list = State.getOpenSales();
    var el   = document.getElementById('open-sales-list');
    if (!list.length) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-light)">No hay ventas guardadas</div>';
      return;
    }
    el.innerHTML = list.map(function (os) {
      return '<div class="open-sale-row">'
        + '<div class="open-sale-info">'
          + '<strong>' + os.id + '</strong> — ' + os.label
          + '<div style="font-size:0.8rem;color:var(--text-light);margin-top:2px">'
            + UI.fmtDate(os.date) + ' &nbsp;·&nbsp; ' + os.cart.length + ' producto(s) &nbsp;·&nbsp; <strong>' + UI.fmtCurrency(os.total) + '</strong>'
          + '</div>'
        + '</div>'
        + '<div style="display:flex;gap:6px">'
          + '<button class="btn btn-primary btn-sm btn-resume" data-id="' + os.id + '">Retomar</button>'
          + '<button class="btn btn-ghost btn-sm btn-discard" data-id="' + os.id + '">Descartar</button>'
        + '</div>'
        + '</div>';
    }).join('');

    el.querySelectorAll('.btn-resume').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (State.getCart().length > 0) {
          UI.showToast('Guarda o cancela la venta actual primero', 'error');
          return;
        }
        State.resumeOpenSale(btn.dataset.id);
        UI.closeModal('modal-open-sales');
        renderCart();
        renderProductGrid();
        updateOpenSalesBadge();
        UI.showToast('Venta retomada', 'success');
      });
    });

    el.querySelectorAll('.btn-discard').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.confirmDialog('Descartar esta venta guardada?', function () {
          State.discardOpenSale(btn.dataset.id);
          renderOpenSalesList();
          updateOpenSalesBadge();
          UI.showToast('Venta descartada', 'info');
        });
      });
    });
  }

  // ── Pago ────────────────────────────────────────────────
  function selectPayment(method) {
    State.setPayMethod(method);
    document.querySelectorAll('.pay-btn').forEach(function (b) { b.classList.remove('selected'); });
    document.getElementById('pay-' + method).classList.add('selected');
    var cw = document.getElementById('cash-wrap');
    if (method === 'efectivo') { cw.classList.add('show'); }
    else { cw.classList.remove('show'); document.getElementById('change-box').style.display = 'none'; }
  }

  function renderChange() {
    if (State.getPayMethod() !== 'efectivo') return;
    var received = parseFloat(document.getElementById('cash-received').value) || 0;
    var total    = State.cartTotal();
    var change   = received - total;
    var box      = document.getElementById('change-box');
    box.style.display = 'flex';
    document.getElementById('change-amount').textContent = UI.fmtCurrency(Math.max(0, change));
    if (change < 0) box.classList.add('negative'); else box.classList.remove('negative');
  }

  function cancelSale() {
    if (!State.getCart().length) return;
    State.clearCart();
    document.querySelectorAll('.pay-btn').forEach(function (b) { b.classList.remove('selected'); });
    document.getElementById('cash-wrap').classList.remove('show');
    document.getElementById('cash-received').value = '';
    document.getElementById('change-box').style.display = 'none';
    renderCart(); renderProductGrid();
    UI.showToast('Venta cancelada', 'info');
  }

  // confirmSale es async para enviar la venta a Google Sheets via POST
  async function confirmSale() {
    var cart   = State.getCart();
    var method = State.getPayMethod();
    if (!cart.length)  { UI.showToast('Agrega al menos un producto', 'error'); return; }
    if (!method)       { UI.showToast('Selecciona un metodo de pago', 'error'); return; }
    var total    = State.cartTotal();
    var received = parseFloat(document.getElementById('cash-received').value) || 0;
    if (method === 'efectivo' && received < total) {
      UI.showToast('El valor recibido es insuficiente', 'error'); return;
    }

    // 1. Guardar en localStorage
    var sale = State.confirmSale(received);
    if (!sale) { UI.showToast('Error al procesar la venta', 'error'); return; }
    lastSale = sale;

    // 2. Enviar a Google Sheets via POST (async/await)
    var btnConfirm = document.getElementById('btn-confirm-sale');
    if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.textContent = 'Enviando...'; }

    var res = await State.postSaleToAPI(sale);

    if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.textContent = 'Confirmar Venta'; }

    if (res && res.success) {
      UI.showToast('Venta enviada al servidor', 'success');
    } else {
      // La venta ya quedo en localStorage; el POST fallo pero no bloqueamos al usuario
      UI.showToast('Venta guardada localmente (sin conexion al servidor)', 'info');
    }

    // Limpiar UI
    document.querySelectorAll('.pay-btn').forEach(function (b) { b.classList.remove('selected'); });
    document.getElementById('cash-wrap').classList.remove('show');
    document.getElementById('cash-received').value = '';
    document.getElementById('change-box').style.display = 'none';
    renderCart(); renderProductGrid();

    // Modal de confirmacion
    document.getElementById('conf-total-text').textContent = UI.fmtCurrency(sale.total);
    document.getElementById('conf-detail-text').innerHTML  =
      'Venta <strong>' + sale.id + '</strong> &nbsp;&middot;&nbsp; ' + UI.labelMethod(sale.paymentMethod);
    var confBox = document.getElementById('conf-change-box');
    if (sale.paymentMethod === 'efectivo') {
      confBox.style.display = 'flex';
      document.getElementById('conf-change-text').textContent = UI.fmtCurrency(sale.change);
    } else {
      confBox.style.display = 'none';
    }
    UI.openModal('modal-sale-ok');
  }

  // ── Factura ──────────────────────────────────────────────
  function renderInvoice(sale) {
    document.getElementById('invoice-body').innerHTML =
      '<div class="inv-header">'
      + '<div class="inv-logo">Papel y Luna</div>'
      + '<div class="inv-sub">Papeleria</div>'
      + '<div class="inv-meta">Factura #' + sale.id + '<br>' + UI.fmtDate(sale.date) + '</div>'
      + '</div>'
      + '<table class="inv-table"><thead><tr>'
      + '<th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">P.Unit.</th><th style="text-align:right">Total</th>'
      + '</tr></thead><tbody>'
      + sale.items.map(function (i) {
          return '<tr><td>' + i.name + '</td><td style="text-align:center">' + i.qty + '</td>'
            + '<td style="text-align:right">' + UI.fmtCurrency(i.price) + '</td>'
            + '<td style="text-align:right">' + UI.fmtCurrency(i.price * i.qty) + '</td></tr>';
        }).join('')
      + '</tbody></table>'
      + '<div class="inv-totals"><div class="inv-row grand"><span>TOTAL</span><span>' + UI.fmtCurrency(sale.total) + '</span></div></div>'
      + '<div class="inv-pay"><strong>Metodo:</strong> ' + UI.labelMethod(sale.paymentMethod)
      + (sale.paymentMethod === 'efectivo'
          ? ' &nbsp; <strong>Recibido:</strong> ' + UI.fmtCurrency(sale.cashReceived) + ' &nbsp; <strong>Cambio:</strong> ' + UI.fmtCurrency(sale.change)
          : '')
      + '</div>'
      + '<div class="inv-thanks">Gracias por tu compra!</div>';
  }

  function openInvoiceForSale(sale) {
    renderInvoice(sale);
    UI.openModal('modal-invoice');
  }

  return { init: init, refresh: refresh, openInvoiceForSale: openInvoiceForSale };

})();
