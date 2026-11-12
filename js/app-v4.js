// ==========================================
// 1. CONEXIÓN Y VARIABLES GLOBALES
// ==========================================
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbyAyFb8r7kqhfY8aLRfhk5vudQHRNrQAxhzgB7TynjUtLZcdcGPSzuBg82aTd-a799F/exec';

let productos = [];
let cart = JSON.parse(localStorage.getItem('sello100_cart')) || [];
let shippingCost = 0;
let selectedProduct = null;
let selectedSize = null;
let selectedColor = null;
let currentImages = [];
let currentImageIndex = 0;
let carouselInterval = null;

// ==========================================
// 2. SISTEMA DE NOTIFICACIONES (TOASTS)
// ==========================================
function mostrarToast(mensaje, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    let icono = 'fa-circle-info';
    if (tipo === 'success') icono = 'fa-circle-check';
    if (tipo === 'error') icono = 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icono}"></i> <span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 400);
    }, 3500);
}

// ==========================================
// 3. PRELOADER
// ==========================================
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => { preloader.classList.add('hidden'); setTimeout(() => preloader.remove(), 800); }, 1000);
    }
});

// ==========================================
// 4. CARGA DE PRODUCTOS
// ==========================================
async function cargarProductosDesdeDB() {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonpCallback_' + Date.now();
        window[callbackName] = (data) => {
            try {
                productos = data.map(p => {
                    const galeria = [p.imagen, p.imagen2, p.imagen3].filter(url => url && url.trim() !== '');
                    return {
                        id: Number(p.id),
                        nombre: p.nombre,
                        precio: Number(p.precio),
                        descripcion: p.descripcion || 'Camiseta de algodón premium. Diseño exclusivo de Sello 100.',
                        imagen: galeria[0] || '',
                        galeria: galeria,
                        tallas: p.tallas ? p.tallas.split(',') : [],
                        color: p.color || 'Negro, Blanco',
                        tela: p.tela
                    };
                });
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
        if (grid) grid.innerHTML = `<p style="text-align:center; color:#ff4444; grid-column: 1/-1;">Error al cargar productos.</p>`;
    });
}

// ==========================================
// 5. RENDERIZADO Y FILTROS
// ==========================================
function renderProducts(listaProductos) {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return; 
    productsGrid.innerHTML = '';
    
    if(listaProductos.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center; width:100%; color:#888; grid-column: 1/-1;">No se encontraron productos.</p>';
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

const searchInput = document.getElementById('search-input');
const filterSelect = document.getElementById('filter-select');

if (searchInput) searchInput.addEventListener('input', (e) => aplicarFiltros(e.target.value.toLowerCase(), filterSelect.value));
if (filterSelect) filterSelect.addEventListener('change', (e) => aplicarFiltros(searchInput.value.toLowerCase(), e.target.value));

function aplicarFiltros(termino, categoria) {
    let filtrados = productos;
    if (termino) filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(termino));
    if (categoria !== 'todos') filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(categoria));
    renderProducts(filtrados);
}

// ==========================================
// 6. VISTA RÁPIDA CON CARRUSEL
// ==========================================
function openQuickview(id) {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;
    
    selectedProduct = prod;
    selectedSize = null;
    selectedColor = null;
    currentImages = prod.galeria || [prod.imagen];
    currentImageIndex = 0;

    if (carouselInterval) clearInterval(carouselInterval);

    document.getElementById('qv-title').innerText = prod.nombre;
    document.getElementById('qv-price').innerText = `$${prod.precio.toFixed(2)}`;
    document.getElementById('qv-desc').innerText = prod.descripcion;

    const colorTextElement = document.getElementById('color-seleccionado');
    if (colorTextElement) colorTextElement.innerText = '(Elige uno)';

    updateCarousel();

    if (currentImages.length > 1) {
        carouselInterval = setInterval(() => {
            moveCarousel(1);
        }, 5000); // 5 SEGUNDOS
    }

    const sizesContainer = document.getElementById('qv-sizes');
    sizesContainer.innerHTML = '';
    prod.tallas.forEach(talla => {
        const btn = document.createElement('button');
        btn.className = 'size-btn';
        btn.innerText = talla.trim();
        btn.onclick = () => { selectedSize = talla.trim(); document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); };
        sizesContainer.appendChild(btn);
    });

    const colorsContainer = document.getElementById('qv-colors');
    colorsContainer.innerHTML = '';
    const colores = prod.color ? prod.color.split(',') : ['Negro', 'Blanco'];
    
    colores.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'color-btn';
        let bgColor = '#000';
        if(color.toLowerCase().includes('blanco')) bgColor = '#fff';
        if(color.toLowerCase().includes('gris')) bgColor = '#888';
        if(color.toLowerCase().includes('rojo')) bgColor = '#ff0000';
        if(color.toLowerCase().includes('azul')) bgColor = '#0000ff';
        if(color.toLowerCase().includes('verde')) bgColor = '#008000';
        if(color.toLowerCase().includes('beige')) bgColor = '#f5f5dc';
        
        btn.style.backgroundColor = bgColor;
        btn.title = color.trim();
        
        btn.onclick = () => {
            selectedColor = color.trim();
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if(color.toLowerCase().includes('blanco')) btn.style.border = '2px solid var(--gold-primary)';
            if (colorTextElement) colorTextElement.innerText = `(${color.trim()})`;
        };
        
        colorsContainer.appendChild(btn);
    });

    document.body.classList.add('cart-open');
    document.getElementById('quickview-modal').classList.add('active');
}

// --- LÓGICA DEL CARRUSEL CON FADE ---
function updateCarousel() {
    const imgElement = document.getElementById('qv-image');
    const dotsContainer = document.getElementById('carousel-dots');
    
    if (currentImages.length > 0) {
        imgElement.style.opacity = 0;
        setTimeout(() => {
            imgElement.src = currentImages[currentImageIndex];
            imgElement.style.opacity = 1;
        }, 300);
    }

    dotsContainer.innerHTML = '';
    if (currentImages.length > 1) {
        currentImages.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = `carousel-dot ${index === currentImageIndex ? 'active' : ''}`;
            dot.onclick = () => { 
                currentImageIndex = index; 
                updateCarousel(); 
                if (carouselInterval) clearInterval(carouselInterval);
                carouselInterval = setInterval(() => moveCarousel(1), 5000);
            };
            dotsContainer.appendChild(dot);
        });
    }

    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    if (currentImages.length <= 1) {
        if(prevBtn) prevBtn.style.display = 'none';
        if(nextBtn) nextBtn.style.display = 'none';
    } else {
        if(prevBtn) prevBtn.style.display = 'flex';
        if(nextBtn) nextBtn.style.display = 'flex';
    }
}

function moveCarousel(direction) {
    if (currentImages.length <= 1) return;
    currentImageIndex += direction;
    if (currentImageIndex >= currentImages.length) currentImageIndex = 0;
    if (currentImageIndex < 0) currentImageIndex = currentImages.length - 1;
    updateCarousel();
}

document.getElementById('close-quickview')?.addEventListener('click', () => {
    if (carouselInterval) clearInterval(carouselInterval);
    document.body.classList.remove('cart-open');
    document.getElementById('quickview-modal').classList.remove('active');
});

function addToCartFromQuickview() {
    if (!selectedSize) return mostrarToast("Por favor, selecciona una talla.", "error");
    if (!selectedColor) return mostrarToast("Por favor, selecciona un color.", "error");

    const itemToAdd = { ...selectedProduct, tallaElegida: selectedSize, colorElegido: selectedColor, cartId: Date.now() };
    cart.push(itemToAdd);
    saveCart();
    updateCartUI();
    
    if (carouselInterval) clearInterval(carouselInterval);
    document.body.classList.remove('cart-open');
    document.getElementById('quickview-modal').classList.remove('active');
    mostrarToast("Producto añadido al carrito.", "success");
    const cartCount = document.getElementById('cart-count');
    if (cartCount) { cartCount.style.transform = 'scale(1.5)'; setTimeout(() => cartCount.style.transform = 'scale(1)', 200); }
}

// ==========================================
// 7. LÓGICA DEL CARRITO
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

    const subtotalElement = document.getElementById('subtotal-price');
    const totalElement = document.getElementById('total-price');
    if (subtotalElement) subtotalElement.innerText = subtotal.toFixed(2);
    if (totalElement) totalElement.innerText = (subtotal + shippingCost).toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    mostrarToast("Producto eliminado del carrito.", "info");
}

// ==========================================
// 8. MAPA Y CHECKOUT
// ==========================================
let map, marker;
let localCoords = [-2.220962, -79.897079]; 

function initMap() {
    if (map) {
        // Si el mapa ya existe, forzamos su redibujado al abrir el modal
        setTimeout(() => { map.invalidateSize(); }, 300);
        return; 
    }
    
    map = L.map('map', {
        // Opciones de rendimiento para móviles
        preferCanvas: true,      // Usa Canvas en lugar de SVG (más rápido en celular)
        zoomAnimation: false,    // Desactiva animaciones de zoom (evita tirones)
        fadeAnimation: false,    // Desactiva el fundido de los tiles (evita parpadeos)
        markerZoomAnimation: false
    }).setView(localCoords, 13);

    // Forzamos el redibujado después de que el modal se haga visible
    setTimeout(() => { map.invalidateSize(); }, 300);

    // Cargar los tiles con opciones de precarga agresiva
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
        keepBuffer: 4,           // Mantiene más tiles en memoria (evita recargas al mover)
        updateWhenIdle: false,   // Carga tiles mientras se mueve (no espera a que se detenga)
        updateWhenZooming: false,
        updateInterval: 100      // Actualiza los tiles más rápido
    }).addTo(map);

    L.marker(localCoords).addTo(map).bindPopup('<b>SELLO 100</b><br>Origen').openPopup();

    if (typeof L.Control.geocoder !== 'undefined') {
        L.Control.geocoder({
            defaultMarkGeocode: false,
            placeholder: "Busca tu dirección (ej: Durán)...",
            geocoder: L.Control.Geocoder.nominatim({ geocodingQueryParams: { countrycodes: 'ec', limit: 5 } })
        })
        .on('markgeocode', function(e) {
            const latlng = e.geocode.center;
            map.setView(latlng, 16);
            if (marker) { marker.setLatLng(latlng); } else { marker = L.marker(latlng, { draggable: true }).addTo(map); }
            calcularDistancia(localCoords, [latlng.lat, latlng.lng]);
            map.closePopup();
        })
        .addTo(map);
    }

    map.on('click', function(e) {
        const clientCoords = [e.latlng.lat, e.latlng.lng];
        if (marker) { marker.setLatLng(clientCoords); } else { marker = L.marker(clientCoords, { draggable: true }).addTo(map); }
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

if (cartBtn) {
    cartBtn.addEventListener('click', () => { 
        cartModal.classList.add('active'); 
        document.body.classList.add('cart-open');
        updateCartUI(); 
        initMap(); 
    });
}
if (closeCart) {
    closeCart.addEventListener('click', () => {
        cartModal.classList.remove('active');
        document.body.classList.remove('cart-open');
    });
}
if (closeCheckout) {
    closeCheckout.addEventListener('click', () => {
        checkoutModal.classList.remove('active');
        document.body.classList.remove('cart-open');
    });
}

function abrirCheckout() {
    if (cart.length === 0) return mostrarToast("Tu carrito está vacío. Añade productos primero.", "error");
    if (!marker) return mostrarToast("Selecciona tu ubicación en el mapa para calcular el envío.", "error");
    document.getElementById('total-checkout').innerText = (cart.reduce((a, b) => a + b.precio, 0) + shippingCost).toFixed(2);
    cartModal.classList.remove('active');
    checkoutModal.classList.add('active');
    document.body.classList.add('cart-open');
}

const fileInput = document.getElementById('comprobante');
if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { document.getElementById('image-preview').src = ev.target.result; document.getElementById('preview-container').style.display = 'block'; };
            reader.readAsDataURL(file);
        }
    });
}

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

    if (!fileInput.files[0]) return mostrarToast("Por favor, sube tu comprobante de pago.", "error");
    if (nombre === "" || cedula === "") return mostrarToast("Por favor, ingresa tu nombre y cédula.", "error");

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
        mostrarToast("Pedido enviado con éxito.", "success");

        cart = []; saveCart(); updateCartUI();
        checkoutModal.classList.remove('active');
        document.body.classList.remove('cart-open');
        document.getElementById('nombre-cliente').value = '';
        document.getElementById('cedula-cliente').value = '';
        fileInput.value = '';
        document.getElementById('preview-container').style.display = 'none';
    } catch (error) {
        mostrarToast(`Error: ${error.message}`, "error");
    } finally {
        btn.innerHTML = 'Finalizar y Enviar por WhatsApp <i class="fa-brands fa-whatsapp"></i>';
        btn.disabled = false;
    }
}

function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => mostrarToast("Número copiado al portapapeles.", "success"));
}

// ==========================================
// 10. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarProductosDesdeDB();
    updateCartUI();
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('active'); obs.unobserve(entry.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => observer.observe(el));
});