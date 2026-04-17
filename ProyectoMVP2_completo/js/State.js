// state.js — Estado global y persistencia

var State = (function () {

  var PROD_KEY       = 'pl_products';
  var SALES_KEY      = 'pl_sales';
  var OPEN_SALES_KEY = 'pl_open_sales';
  var PURCHASES_KEY  = 'pl_purchases';
  var CATS_KEY       = 'pl_categories';
  var SUPPLIERS_KEY  = 'pl_suppliers';
  var CUSTOMERS_KEY  = 'pl_customers';

  function loadLS(key, fallback) {
    try { var r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
    catch(e) { return fallback; }
  }
  function saveLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  var products = loadLS(PROD_KEY, [
    { id:'P001', name:'Cuaderno Universitario', category:'Cuadernos',    price:8500,  cost:5000,  code:'P001', trackStock:true,  stock:20 },
    { id:'P002', name:'Lápiz HB x12',           category:'Lápices',      price:4200,  cost:2500,  code:'P002', trackStock:true,  stock:50 },
    { id:'P003', name:'Resaltador Neón',         category:'Marcadores',   price:3500,  cost:1800,  code:'P003', trackStock:true,  stock:30 },
    { id:'P004', name:'Papel Carta Resma',       category:'Papel',        price:15000, cost:10000, code:'P004', trackStock:true,  stock:15 },
    { id:'P005', name:'Pegante en Barra',        category:'Adhesivos',    price:2800,  cost:1200,  code:'P005', trackStock:false, stock:0  },
    { id:'P006', name:'Tijeras Escolar',         category:'Herramientas', price:6000,  cost:3000,  code:'P006', trackStock:true,  stock:10 },
  ]);
  var sales      = loadLS(SALES_KEY, []);
  var openSales  = loadLS(OPEN_SALES_KEY, []);
  var purchases  = loadLS(PURCHASES_KEY, []);
  var categories = loadLS(CATS_KEY, [
    { id:'C001', name:'Cuadernos',    description:'Cuadernos y libretas' },
    { id:'C002', name:'Lapices',      description:'Lapices y boligrafos' },
    { id:'C003', name:'Marcadores',   description:'Marcadores y resaltadores' },
    { id:'C004', name:'Papel',        description:'Papel y cartulina' },
    { id:'C005', name:'Adhesivos',    description:'Pegantes y cintas' },
    { id:'C006', name:'Herramientas', description:'Tijeras, reglas y mas' },
  ]);
  var suppliers  = loadLS(SUPPLIERS_KEY, [
    { id:'S001', name:'Distribuidora Norte',  contact:'3001234567', email:'norte@ejemplo.com',   address:'Calle 10 #5-20' },
    { id:'S002', name:'Papeles y Mas S.A.S',  contact:'3109876543', email:'papeles@ejemplo.com', address:'Carrera 7 #15-30' },
  ]);
  var customers  = loadLS(CUSTOMERS_KEY, [
    { id:'CL001', name:'Cliente General',  phone:'',           email:'',                       notes:'Cliente de mostrador' },
    { id:'CL002', name:'Colegio San Jose', phone:'6012345678', email:'compras@sanjose.edu.co', notes:'Compras mensuales' },
  ]);

  var cart      = [];
  var payMethod = null;

  // ID helpers
  function nextId(arr, prefix) {
    var nums = arr.map(function(x){ return parseInt(x.id.replace(prefix,'')) || 0; });
    var max  = nums.length ? Math.max.apply(null, nums) : 0;
    return prefix + String(max + 1).padStart(3, '0');
  }
  function nextProductId() { return nextId(products, 'P'); }
  function nextSaleId() {
    var nums = sales.map(function(s){ return parseInt(s.id.replace('V','')) || 0; });
    var max  = nums.length ? Math.max.apply(null, nums) : 0;
    return 'V' + String(max + 1).padStart(4, '0');
  }
  function nextOpenSaleId() {
    var all  = openSales.map(function(s){ return parseInt(s.id.replace('OS','')) || 0; });
    var max  = all.length ? Math.max.apply(null, all) : 0;
    return 'OS' + String(max + 1).padStart(3, '0');
  }
  function nextPurchaseId() {
    var all = purchases.map(function(p){ return parseInt(p.id.replace('COM','')) || 0; });
    var max = all.length ? Math.max.apply(null, all) : 0;
    return 'COM' + String(max + 1).padStart(4, '0');
  }

  // Persistencia
  function saveProducts()    { saveLS(PROD_KEY, products); }
  function saveSales()       { saveLS(SALES_KEY, sales); }
  function saveOpenSalesLS() { saveLS(OPEN_SALES_KEY, openSales); }
  function savePurchases()   { saveLS(PURCHASES_KEY, purchases); }
  function saveCategories()  { saveLS(CATS_KEY, categories); }
  function saveSuppliers()   { saveLS(SUPPLIERS_KEY, suppliers); }
  function saveCustomers()   { saveLS(CUSTOMERS_KEY, customers); }

  // Productos
  function getProducts()      { return products; }
  function getProductById(id) {
    for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i];
    return null;
  }
  function addProduct(data) {
    var id = nextProductId();
    var p  = Object.assign({ id: id, code: id }, data);
    products.push(p);
    saveProducts();
    return p;
  }
  function updateProduct(id, data) {
    var p = getProductById(id);
    if (!p) return null;
    Object.assign(p, data);
    saveProducts();
    return p;
  }
  function deleteProduct(id) {
    products = products.filter(function(p){ return p.id !== id; });
    saveProducts();
  }

  // Carrito
  function getCart()       { return cart; }
  function getPayMethod()  { return payMethod; }
  function setPayMethod(m) { payMethod = m; }
  function cartTotal() {
    return cart.reduce(function(s, i){ return s + i.price * i.qty; }, 0);
  }
  function addToCart(productId) {
    var p = getProductById(productId);
    if (!p) return false;
    var found = null;
    for (var i = 0; i < cart.length; i++) if (cart[i].productId === productId) { found = cart[i]; break; }
    if (found) {
      if (p.trackStock && found.qty >= p.stock) return false;
      found.qty++;
    } else {
      if (p.trackStock && p.stock < 1) return false;
      cart.push({ productId: productId, name: p.name, price: p.price, qty: 1 });
    }
    return true;
  }
  function removeFromCart(productId) {
    cart = cart.filter(function(i){ return i.productId !== productId; });
  }
  function changeQty(productId, delta) {
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].productId === productId) {
        var nq = cart[i].qty + delta;
        if (nq <= 0) { removeFromCart(productId); return; }
        var p = getProductById(productId);
        if (p && p.trackStock && nq > p.stock) return;
        cart[i].qty = nq;
        return;
      }
    }
  }
  function clearCart() { cart = []; payMethod = null; }

  // Ventas abiertas
  function saveOpenSale(label) {
    if (!cart.length) return null;
    var os = {
      id:        nextOpenSaleId(),
      label:     label || ('Venta ' + new Date().toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})),
      date:      new Date().toISOString(),
      cart:      cart.map(function(i){ return Object.assign({}, i); }),
      payMethod: payMethod,
      total:     cartTotal()
    };
    openSales.push(os);
    saveOpenSalesLS();
    clearCart();
    return os;
  }
  function getOpenSales()      { return openSales; }
  function getOpenSaleById(id) {
    for (var i = 0; i < openSales.length; i++) if (openSales[i].id === id) return openSales[i];
    return null;
  }
  function resumeOpenSale(id) {
    var os = getOpenSaleById(id);
    if (!os) return false;
    clearCart();
    cart      = os.cart.map(function(i){ return Object.assign({}, i); });
    payMethod = os.payMethod;
    openSales = openSales.filter(function(s){ return s.id !== id; });
    saveOpenSalesLS();
    return true;
  }
  function discardOpenSale(id) {
    openSales = openSales.filter(function(s){ return s.id !== id; });
    saveOpenSalesLS();
  }

  // Ventas cerradas
  function confirmSale(cashReceived) {
    if (!cart.length || !payMethod) return null;
    var total = cartTotal();
    var sale = {
      id:            nextSaleId(),
      date:          new Date().toISOString(),
      items:         cart.map(function(i){ return { productId:i.productId, name:i.name, price:i.price, qty:i.qty }; }),
      total:         total,
      paymentMethod: payMethod,
      cashReceived:  payMethod === 'efectivo' ? cashReceived : null,
      change:        payMethod === 'efectivo' ? Math.max(0, cashReceived - total) : null,
    };
    sale.items.forEach(function(item){
      var p = getProductById(item.productId);
      if (p && p.trackStock) p.stock = Math.max(0, p.stock - item.qty);
    });
    saveProducts();
    sales.push(sale);
    saveSales();
    clearCart();
    return sale;
  }
  function getSales()      { return sales; }
  function getSaleById(id) {
    for (var i = 0; i < sales.length; i++) if (sales[i].id === id) return sales[i];
    return null;
  }

  // Compras
  function addPurchase(data) {
    var id = nextPurchaseId();
    var p  = Object.assign({ id: id, date: new Date().toISOString() }, data);
    purchases.push(p);
    if (p.items) {
      p.items.forEach(function(item) {
        var prod = getProductById(item.productId);
        if (prod && prod.trackStock) prod.stock = (prod.stock || 0) + item.qty;
      });
      saveProducts();
    }
    savePurchases();
    return p;
  }
  function getPurchases()      { return purchases; }
  function getPurchaseById(id) {
    for (var i = 0; i < purchases.length; i++) if (purchases[i].id === id) return purchases[i];
    return null;
  }

  // Categorias
  function getCategories()     { return categories; }
  function getCategoryById(id) {
    for (var i = 0; i < categories.length; i++) if (categories[i].id === id) return categories[i];
    return null;
  }
  function addCategory(data) {
    var c = Object.assign({ id: nextId(categories, 'C') }, data);
    categories.push(c);
    saveCategories();
    return c;
  }
  function updateCategory(id, data) {
    var c = getCategoryById(id);
    if (!c) return null;
    Object.assign(c, data);
    saveCategories();
    return c;
  }
  function deleteCategory(id) {
    categories = categories.filter(function(c){ return c.id !== id; });
    saveCategories();
  }

  // Proveedores
  function getSuppliers()     { return suppliers; }
  function getSupplierById(id){
    for (var i = 0; i < suppliers.length; i++) if (suppliers[i].id === id) return suppliers[i];
    return null;
  }
  function addSupplier(data) {
    var s = Object.assign({ id: nextId(suppliers, 'S') }, data);
    suppliers.push(s);
    saveSuppliers();
    return s;
  }
  function updateSupplier(id, data) {
    var s = getSupplierById(id);
    if (!s) return null;
    Object.assign(s, data);
    saveSuppliers();
    return s;
  }
  function deleteSupplier(id) {
    suppliers = suppliers.filter(function(s){ return s.id !== id; });
    saveSuppliers();
  }

  // Clientes
  function getCustomers()     { return customers; }
  function getCustomerById(id){
    for (var i = 0; i < customers.length; i++) if (customers[i].id === id) return customers[i];
    return null;
  }
  function addCustomer(data) {
    var c = Object.assign({ id: nextId(customers, 'CL') }, data);
    customers.push(c);
    saveCustomers();
    return c;
  }
  function updateCustomer(id, data) {
    var c = getCustomerById(id);
    if (!c) return null;
    Object.assign(c, data);
    saveCustomers();
    return c;
  }
  function deleteCustomer(id) {
    customers = customers.filter(function(c){ return c.id !== id; });
    saveCustomers();
  }


  // ── Metodos async para API (Google Sheets) ──────────────────

  /**
   * Carga productos desde Google Sheets y actualiza el array local.
   * Si la API falla, deja los productos de localStorage intactos.
   */
  async function loadProductsFromAPI() {
    var data = await apiGet('productos');
    if (data && data.length) {
      products = data;
      saveProducts(); // sincroniza cache local
      return true;
    }
    return false; // fallo silencioso, se usan datos locales
  }

  /**
   * Envia una venta confirmada a Google Sheets via POST.
   */
  async function postSaleToAPI(sale) {
    return await apiPost('ventas', sale);
  }

  /**
   * Envia una compra registrada a Google Sheets via POST.
   */
  async function postPurchaseToAPI(purchase) {
    return await apiPost('compras', purchase);
  }

  return {
    getProducts: getProducts, getProductById: getProductById,
    addProduct: addProduct, updateProduct: updateProduct, deleteProduct: deleteProduct,
    getCart: getCart, cartTotal: cartTotal, getPayMethod: getPayMethod, setPayMethod: setPayMethod,
    addToCart: addToCart, removeFromCart: removeFromCart, changeQty: changeQty, clearCart: clearCart,
    saveOpenSale: saveOpenSale, getOpenSales: getOpenSales, getOpenSaleById: getOpenSaleById,
    resumeOpenSale: resumeOpenSale, discardOpenSale: discardOpenSale,
    confirmSale: confirmSale, getSales: getSales, getSaleById: getSaleById,
    addPurchase: addPurchase, getPurchases: getPurchases, getPurchaseById: getPurchaseById,
    getCategories: getCategories, getCategoryById: getCategoryById,
    addCategory: addCategory, updateCategory: updateCategory, deleteCategory: deleteCategory,
    getSuppliers: getSuppliers, getSupplierById: getSupplierById,
    addSupplier: addSupplier, updateSupplier: updateSupplier, deleteSupplier: deleteSupplier,
    getCustomers: getCustomers, getCustomerById: getCustomerById,
    addCustomer: addCustomer, updateCustomer: updateCustomer, deleteCustomer: deleteCustomer,
    loadProductsFromAPI: loadProductsFromAPI,
    postSaleToAPI: postSaleToAPI,
    postPurchaseToAPI: postPurchaseToAPI,
  };

})();
