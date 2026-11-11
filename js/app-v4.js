// ==========================================
// 1. CONEXIÓN Y VARIABLES
// ==========================================
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbyAyFb8r7kqhfY8aLRfhk5vudQHRNrQAxhzgB7TynjUtLZcdcGPSzuBg82aTd-a799F/exec';

let productos = [];
let cart = JSON.parse(localStorage.getItem('sello100_cart')) || [];
let shippingCost = 0;
let selectedProduct = null;
let selectedSize = null;
let selectedColor = null;

// Función para cargar productos desde Google Sheets
async function cargarProductosDesdeDB() {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonpCallback_' + Date.now();
        window[callbackName] = (data) => {
            try {
                productos = data.map(p => ({
                    id: Number(p.id),
                    nombre: p.nombre,
                    precio: Number(p.precio),
                    imagen: p.imagen,
                    tallas: p.tallas ? p.tallas.split(',') : [],
                    color: p.color || 'Negro, Blanco', // Color por defecto si no viene de Sheets
                    tela: p.tela
                }));
                renderProducts(productos);
                resolve();
            } catch (error) { reject(error); } 
            finally { document.body.removeChild(script); delete window[callbackName]; }
        };
        const script = document.createElement('script');
        script.src = `${GOOGLE_SHEETS_API}?callback=${callbackName}`;
        script.onerror = () => reject(new Error('Error cargando Google Sheets'));
        document.body.appendChild(script);
    }).catch(error => {
        console.error('Error cargando productos:', error);
        const grid = document.getElementById('products-grid');
        if (grid) grid.innerHTML = `<p style="text-align:center; color:#ff4444;">Error al cargar productos.</p>`;
    });
}

// ==========================================
// 2. RENDERIZADO Y FILTROS
// ==========================================
function renderProducts(listaProductos) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return; 
    
    productsGrid.innerHTML = '';
    if(listaProductos.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center; width:100%; color:#888;">No se encontraron productos.</p>';
        return;
    }
    
    listaProductos.forEach(product => {
        productsGrid.innerHTML += `
            <div class="product-card" onclick="openQuickview(${product.id})">
                <div class="product-img-container">
                    <img src="${product.imagen}" alt="${product.nombre}" class="product-img" loading="lazy">
                </div>
                <h3 class="product-title">${product.nombre}</h3>
                <p class="product-price">$${product.precio.toFixed(2)}</p>
                <button class="btn-add-cart" onclick="event.stopPropagation(); openQuickview(${product.id})">Ver Opciones</button>
            </div>
        `;
    });
}

// Filtros
document.getElementById('search-input').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtroCategoria = document.getElementById('filter-select').value;
    aplicarFiltros(term, filtroCategoria);
});

document.getElementById('filter-select').addEventListener('change', (e) => {
    const term = document.getElementById('search-input').value.toLowerCase();
    const filtroCategoria = e.target.value;
    aplicarFiltros(term, filtroCategoria);
});

function aplicarFiltros(termino, categoria) {
    let filtrados = productos;
    if (termino) {
        filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(termino));
    }
    if (categoria !== 'todos') {
        filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(categoria));
    }
    renderProducts(filtrados);
}

// ==========================================
// 3. VISTA RÁPIDA (QUICKVIEW)
// ==========================================
function openQuickview(id) {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;
    
    selectedProduct = prod;
    selectedSize = null;
    selectedColor = null;

    document.getElementById('qv-image').src = prod.imagen;
    document.getElementById('qv-title').innerText = prod.nombre;
    document.getElementById('qv-price').innerText = `$${prod.precio.toFixed(2)}`;

    // Generar botones de talla
    const sizesContainer = document.getElementById('qv-sizes');
    sizesContainer.innerHTML = '';
    prod.tallas.forEach(talla => {
        const btn = document.createElement('button');
        btn.className = 'size-btn';
        btn.innerText = talla.trim();
        btn.onclick = () => selectSize(btn, talla.trim());
        sizesContainer.appendChild(btn);
    });

    // Generar botones de color (por defecto si no hay, mostramos Negro y Blanco)
    const colorsContainer = document.getElementById('qv-colors');
    colorsContainer.innerHTML = '';
    const colores = prod.color ? prod.color.split(',') : ['Negro', 'Blanco'];
    colores.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        // Estilo visual para el color
        let bgColor = '#000';
        if(color.toLowerCase().includes('blanco')) bgColor = '#fff';
        if(color.toLowerCase().includes('gris')) bgColor = '#888';
        if(color.toLowerCase().includes('rojo')) bgColor = '#ff0000';
        if(color.toLowerCase().includes('azul')) bgColor = '#0000ff';
        btn.style.backgroundColor = bgColor;
        btn.title = color.trim();
        btn.onclick = () => selectColor(btn, color.trim());
        colorsContainer.appendChild(btn);
    });

    document.getElementById('quickview-modal').classList.add('active');
}

function selectSize(btn, talla) {
    selectedSize = talla;
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectColor(btn, color) {
    selectedColor = color;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Añadir un borde especial si el color es blanco
    if(color.toLowerCase().includes('blanco')) btn.style.border = '2px solid var(--gold-primary)';
}

document.getElementById('close-quickview').addEventListener('click', () => {
    document.getElementById('quickview-modal').classList.remove('active');
});

function addToCartFromQuickview() {
    if (!selectedSize) {
        alert("Por favor, selecciona una talla antes de continuar.");
        return;
    }
    if (!selectedColor) {
        alert("Por favor, selecciona un color antes de continuar.");
        return;
    }

    const itemToAdd = {
        ...selectedProduct,
        tallaElegida: selectedSize,
        colorElegido: selectedColor,
        cartId: Date.now() // ID único para el carrito
    };

    cart.push(itemToAdd);
    saveCart();
    updateCartUI();
    document.getElementById('quickview-modal').classList.remove('active');
    
    // Animación del carrito
    const cartCount = document.getElementById('cart-count');
    cartCount.style.transform = 'scale(1.5)';
    setTimeout(() => cartCount.style.transform = 'scale(1)', 200);
}

// ==========================================
// 4. LÓGICA DEL CARRITO
// ==========================================
function saveCart() { localStorage.setItem('sello100_cart', JSON.stringify(cart)); }

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    if(cartCount) cartCount.innerText = cart.length;

    const cartItemsContainer = document.getElementById('cart-items');
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        subtotal += item.precio;
        cartItemsContainer.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 5px;">
                <div style="font-size: 0.85rem;">
                    <strong>${item.nombre}</strong><br>
                    <span style="color: #aaa;">Talla: ${item.tallaElegida} | Color: ${item.colorElegido}</span>
                </div>
                <span style="color: var(--gold-primary); font-weight: bold;">$${item.precio.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color: #ff4444; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });

    document.getElementById('subtotal-price').innerText = subtotal.toFixed(2);
    document.getElementById('total-price').innerText = (subtotal + shippingCost).toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

// ==========================================
// 5. MAPA, CHECKOUT Y WHATSAPP
// ==========================================
let map, marker;
let localCoords = [-2.220962, -79.897079]; 

function initMap() {
    if (map) return; 
    map = L.map('map').setView(localCoords, 13);
    setTimeout(() => { map.invalidateSize(); }, 200);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.marker(localCoords).addTo(map).bindPopup('<b>SELLO 100</b><br>Origen').openPopup();

    map.on('click', function(e) {
        const clientCoords = [e.latlng.lat, e.latlng.lng];
        if (marker) { marker.setLatLng(clientCoords); } 
        else { marker = L.marker(clientCoords, { draggable: true }).addTo(map); }
        calcularDistancia(localCoords, clientCoords);
    });
}

function calcularDistancia(origen, destino) {
    const R = 6371; 
    const dLat = (destino[0] - origen[0]) * Math.PI / 180;
    const dLon = (destino[1] - origen[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(origen[0] * Math.PI / 180) * Math.cos(destino[0] * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanciaKm = R * c;

    let costoEnvio = 1.50; 
    if (distanciaKm > 2) costoEnvio += (distanciaKm - 2) * 0.50;

    document.getElementById('distance-text').innerText = `${distanciaKm.toFixed(1)} km`;
    document.getElementById('shipping-cost').innerText = `$${costoEnvio.toFixed(2)}`;
    shippingCost = costoEnvio;
    updateCartUI(); 
}

const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');

cartBtn.addEventListener('click', () => { cartModal.classList.add('active'); updateCartUI(); initMap(); });
closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
closeCheckout.addEventListener('click', () => checkoutModal.classList.remove('active'));

function abrirCheckout() {
    if (cart.length === 0) return alert("Carrito vacío.");
    if (!marker) return alert("Selecciona tu ubicación en el mapa.");
    document.getElementById('total-checkout').innerText = (cart.reduce((a, b) => a + b.precio, 0) + shippingCost).toFixed(2);
    cartModal.classList.remove('active');
    checkoutModal.classList.add('active');
}

const fileInput = document.getElementById('comprobante');
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { document.getElementById('image-preview').src = ev.target.result; document.getElementById('preview-container').style.display = 'block'; }
        reader.readAsDataURL(file);
    }
});

async function subirComprobante(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('to_format', 'jpg');
    const response = await fetch('https://cleverutils.com/api/v1/convert', { method: 'POST', body: formData });
    const result = await response.json();
    if (result.data && result.data.output) return result.data.output.url;
    throw new Error('Error subiendo imagen');
}

async function finalizarCompra() {
    const btn = document.getElementById('btn-finalizar');
    const nombre = document.getElementById('nombre-cliente').value.trim();
    const cedula = document.getElementById('cedula-cliente').value.trim();

    if (!fileInput.files[0] || !nombre || !cedula) return alert("Completa todos los campos y sube tu comprobante.");

    btn.innerHTML = 'Subiendo... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const urlComprobante = await subirComprobante(fileInput.files[0]);
        const subtotal = cart.reduce((acc, item) => acc + item.precio, 0);
        const total = subtotal + shippingCost;
        const numeroWhatsApp = "593962576433"; 

        let mensaje = `*🛒 NUEVO PEDIDO - SELLO 100*\n\n*Cliente:* ${nombre}\n*Cédula:* ${cedula}\n\n*📦 Productos:*\n`;
        cart.forEach((item, index) => {
            mensaje += `${index + 1}. ${item.nombre} (Talla: ${item.tallaElegida}, Color: ${item.colorElegido}) - $${item.precio.toFixed(2)}\n`;
        });

        mensaje += `\n*Subtotal:* $${subtotal.toFixed(2)}\n*Envío:* $${shippingCost.toFixed(2)}\n*TOTAL PAGADO:* $${total.toFixed(2)}\n\n`;
        mensaje += `*📍 Ubicación de entrega:*\nhttps://www.google.com/maps?q=${marker.getLatLng().lat},${marker.getLatLng().lng}\n\n`;
        mensaje += `*🧾 Comprobante de pago:*\n${urlComprobante}`;

        window.open(`https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');

        // Limpiar
        cart = []; saveCart(); updateCartUI();
        checkoutModal.classList.remove('active');
        document.getElementById('nombre-cliente').value = '';
        document.getElementById('cedula-cliente').value = '';
        fileInput.value = '';
        document.getElementById('preview-container').style.display = 'none';
        
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        btn.innerHTML = 'Finalizar y Enviar por WhatsApp <i class="fa-brands fa-whatsapp"></i>';
        btn.disabled = false;
    }
}

function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => alert("¡Copiado!"));
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarProductosDesdeDB();
    updateCartUI();
    
    // Animaciones
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('active'); obs.unobserve(entry.target); }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
});