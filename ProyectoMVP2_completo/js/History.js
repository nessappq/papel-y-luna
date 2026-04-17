
// Historial de ventas


var History = (function () {

  var currentDetailSale = null;

  function init() {
    document.getElementById('hist-search').addEventListener('input', renderTable);
    document.getElementById('btn-invoice-from-detail').addEventListener('click', function () {
      if (!currentDetailSale) return;
      UI.closeModal('modal-detail');
      POS.openInvoiceForSale(currentDetailSale);
    });
    renderTable();
  }

  function refresh() { renderTable(); }

  function renderTable() {
    var q     = document.getElementById('hist-search').value.toLowerCase();
    var tbody = document.getElementById('history-tbody');
    var list  = State.getSales().slice().reverse().filter(function (s) {
      return s.id.toLowerCase().indexOf(q) >= 0 ||
             UI.labelMethod(s.paymentMethod).toLowerCase().indexOf(q) >= 0;
    });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">'
        + (q ? 'Sin resultados' : 'Aún no hay ventas registradas')
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (sale) {
      return '<tr>'
        + '<td><strong>' + sale.id + '</strong></td>'
        + '<td>' + UI.fmtDate(sale.date) + '</td>'
        + '<td>' + sale.items.length + ' ítem' + (sale.items.length !== 1 ? 's' : '') + '</td>'
        + '<td><strong>' + UI.fmtCurrency(sale.total) + '</strong></td>'
        + '<td><span class="badge status-' + sale.paymentMethod + '">' + UI.labelMethod(sale.paymentMethod) + '</span></td>'
        + '<td><div style="display:flex;gap:6px">'
        + '<button class="btn btn-outline btn-sm btn-det" data-id="' + sale.id + '">🔍 Detalle</button>'
        + '<button class="btn btn-ghost btn-sm btn-inv" data-id="' + sale.id + '">🧾 Factura</button>'
        + '</div></td></tr>';
    }).join('');

    tbody.querySelectorAll('.btn-det').forEach(function (btn) {
      btn.addEventListener('click', function () { openDetail(btn.dataset.id); });
    });
    tbody.querySelectorAll('.btn-inv').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sale = State.getSaleById(btn.dataset.id);
        if (sale) POS.openInvoiceForSale(sale);
      });
    });
  }

  function openDetail(id) {
    var sale = State.getSaleById(id);
    if (!sale) return;
    currentDetailSale = sale;

    document.getElementById('detail-body').innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">'
      + '<div><div class="form-label">Número de venta</div><div style="font-weight:700;font-size:1.05rem">' + sale.id + '</div></div>'
      + '<div><div class="form-label">Fecha</div><div>' + UI.fmtDate(sale.date) + '</div></div>'
      + '<div><div class="form-label">Método de pago</div><div><span class="badge status-' + sale.paymentMethod + '">' + UI.labelMethod(sale.paymentMethod) + '</span></div></div>'
      + '<div><div class="form-label">Total</div><div style="font-weight:700;color:var(--gold-dark);font-size:1.05rem">' + UI.fmtCurrency(sale.total) + '</div></div>'
      + (sale.paymentMethod === 'efectivo'
          ? '<div><div class="form-label">Recibido</div><div>' + UI.fmtCurrency(sale.cashReceived) + '</div></div>'
          + '<div><div class="form-label">Cambio</div><div style="color:var(--success)">' + UI.fmtCurrency(sale.change) + '</div></div>'
          : '')
      + '</div>'
      + '<div class="form-label" style="margin-bottom:8px">Productos</div>'
      + '<div class="table-wrapper"><table><thead><tr><th>Producto</th><th>Cant.</th><th>P.Unit.</th><th>Total</th></tr></thead><tbody>'
      + sale.items.map(function (i) {
          return '<tr><td>' + i.name + '</td>'
            + '<td style="text-align:center">' + i.qty + '</td>'
            + '<td>' + UI.fmtCurrency(i.price) + '</td>'
            + '<td><strong>' + UI.fmtCurrency(i.price * i.qty) + '</strong></td></tr>';
        }).join('')
      + '</tbody></table></div>';

    UI.openModal('modal-detail');
  }

  return { init: init, refresh: refresh };

})();