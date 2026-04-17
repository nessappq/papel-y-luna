// CRUD de productos

var Products = (function () {

  var editingId = null;

  function init() {
    document.getElementById('btn-new-product').addEventListener('click', function () { openModal(); });
    document.getElementById('prod-search').addEventListener('input', renderTable);
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('f-track').addEventListener('change', toggleStockField);
    
    // NUEVO: Escuchar cuando se selecciona una imagen para mostrar la vista previa
    document.getElementById('f-image').addEventListener('change', function() {
      previewImage(this);
    });

    renderTable();
  }

  function refresh() { renderTable(); }

  // ── Renderizado de Tabla ──
  function renderTable() {
    var q = UI.normalizarTexto(document.getElementById('prod-search').value);
    var tbody = document.getElementById('products-tbody');
    
    var list = State.getProducts().filter(function (p) {
      var nombre = UI.normalizarTexto(p.name);
      var categoria = UI.normalizarTexto(p.category);
      var codigo = UI.normalizarTexto(p.code);

      return nombre.indexOf(q) >= 0 ||
             categoria.indexOf(q) >= 0 ||
             codigo.indexOf(q) >= 0;
    });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-light)">'
        + (q ? 'Sin resultados para tu búsqueda' : 'No hay productos. ¡Agrega el primero!')
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (p) {
      var stockBadge;
      if (!p.trackStock) {
        stockBadge = '<span class="badge badge-gray">N/A</span>';
      } else if (p.stock > 5) {
        stockBadge = '<span class="badge badge-green">' + p.stock + ' uds</span>';
      } else if (p.stock > 0) {
        stockBadge = '<span class="badge badge-gold">' + p.stock + ' uds</span>';
      } else {
        stockBadge = '<span class="badge badge-pink">Agotado</span>';
      }

      var imgMini = p.image 
        ? '<img src="' + p.image + '" class="table-prod-img">' 
        : '<div class="table-prod-img" style="display:inline-flex;align-items:center;justify-content:center;background:#f5f5f5">🖼️</div>';

      return '<tr>'
        + '<td><strong>' + p.code + '</strong></td>'
        + '<td><div style="display:flex;align-items:center;gap:10px">' + imgMini + '<span>' + p.name + '</span></div></td>'
        + '<td><span class="badge badge-sage">' + p.category + '</span></td>'
        + '<td>' + UI.fmtCurrency(p.price) + '</td>'
        + '<td>' + UI.fmtCurrency(p.cost) + '</td>'
        + '<td>' + stockBadge + '</td>'
        + '<td><div style="display:flex;gap:6px">'
        + '<button class="btn btn-outline btn-sm btn-edit" data-id="' + p.id + '">✏️ Editar</button>'
        + '<button class="btn btn-ghost btn-sm btn-del" data-id="' + p.id + '">🗑 Eliminar</button>'
        + '</div></td></tr>';
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn.dataset.id); });
    });
    
    tbody.querySelectorAll('.btn-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = State.getProductById(btn.dataset.id);
        UI.confirmDialog('¿Eliminar "' + p.name + '"? Esta acción no se puede deshacer.', function () {
          State.deleteProduct(btn.dataset.id);
          renderTable();
          if (window.POS) POS.refresh();
          UI.showToast('Producto eliminado', 'info');
        });
      });
    });
  }

  // ── Formulario y Modal ──
  function toggleStockField() {
    document.getElementById('stock-field').style.display =
      document.getElementById('f-track').checked ? 'block' : 'none';
  }

  function previewImage(input) {
    var preview = document.getElementById('img-pre-view');
    if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function(e) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  function openModal(id) {
    editingId = id || null;
    clearErrors();
    
    var imgPreview = document.getElementById('img-pre-view');
    document.getElementById('prod-modal-title').textContent = id ? 'Editar Producto' : 'Nuevo Producto';

    if (id) {
      var p = State.getProductById(id);
      document.getElementById('f-name').value     = p.name;
      document.getElementById('f-category').value = p.category;
      document.getElementById('f-price').value    = p.price;
      document.getElementById('f-cost').value     = p.cost;
      document.getElementById('f-code').value     = p.code;
      document.getElementById('f-track').checked  = p.trackStock;
      document.getElementById('f-stock').value    = p.stock;
      document.getElementById('stock-field').style.display = p.trackStock ? 'block' : 'none';
      
      if (p.image) {
        imgPreview.src = p.image;
        imgPreview.style.display = 'block';
      } else {
        imgPreview.style.display = 'none';
      }
    } else {
      document.getElementById('product-form').reset();
      document.getElementById('f-code').value = '(automático)';
      document.getElementById('f-track').checked = true;
      document.getElementById('stock-field').style.display = 'block';
      imgPreview.style.display = 'none';
      imgPreview.src = '';
    }
    UI.openModal('modal-product');
  }

  function saveProduct(e) {
    e.preventDefault();
    clearErrors();

    var nameVal    = document.getElementById('f-name').value.trim();
    var catVal     = document.getElementById('f-category').value.trim();
    var priceVal   = parseFloat(document.getElementById('f-price').value);
    var costVal    = parseFloat(document.getElementById('f-cost').value);
    var trackStock = document.getElementById('f-track').checked;
    var stockVal   = parseInt(document.getElementById('f-stock').value);
    var fileInput  = document.getElementById('f-image');

    var valid = true;
    if (!nameVal) { setError('name', 'El nombre es obligatorio'); valid = false; }
    if (!catVal) { setError('category', 'La categoría es obligatoria'); valid = false; }
    if (isNaN(priceVal) || priceVal < 0) { setError('price', 'Precio inválido'); valid = false; }
    if (isNaN(costVal) || costVal < 0) { setError('cost', 'Costo inválido'); valid = false; }
    if (trackStock && (isNaN(stockVal) || stockVal < 0)) { setError('stock', 'Stock inválido'); valid = false; }
    
    if (!valid) return;

    var proceedSave = function(base64Image) {
      var data = { 
        name: nameVal, 
        category: catVal, 
        price: priceVal, 
        cost: costVal,
        trackStock: trackStock, 
        stock: trackStock ? stockVal : 0 
      };

      if (base64Image) {
        data.image = base64Image;
      } else if (editingId) {
        var oldP = State.getProductById(editingId);
        data.image = oldP.image; 
      }

      if (editingId) {
        State.updateProduct(editingId, data);
        UI.showToast('Producto actualizado ✦', 'success');
      } else {
        State.addProduct(data);
        UI.showToast('Producto creado ✦', 'success');
      }

      UI.closeModal('modal-product');
      renderTable();
      if (window.POS) POS.refresh();
    };

    if (fileInput.files && fileInput.files[0]) {
      var reader = new FileReader();
      reader.onload = function(event) { proceedSave(event.target.result); };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      proceedSave(null);
    }
  }

  // ── Auxiliares de UI ──
  function clearErrors() {
    ['name','category','price','cost','stock'].forEach(function (f) {
      var el = document.getElementById('f-' + f);
      if (el) el.classList.remove('error');
      var err = document.getElementById('err-' + f);
      if (err) err.textContent = '';
    });
  }

  function setError(field, msg) {
    var el = document.getElementById('f-' + field);
    if (el) el.classList.add('error');
    var err = document.getElementById('err-' + field);
    if (err) err.textContent = msg;
  }

  return { init: init, refresh: refresh };

})();