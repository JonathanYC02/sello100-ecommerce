// ==========================================
// 1. CONEXIÓN A GOOGLE SHEETS Y VARIABLES GLOBALES
// ==========================================
// ⚠️ AQUÍ PEGAMOS LA URL QUE NOS DIO APPS SCRIPT
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbyAyFb8r7kqhfY8aLRfhk5vudQHRNrQAxhzgB7TynjUtLZcdcGPSzuBg82aTd-a799F/exec';

let productos = [];
let cart = JSON.parse(localStorage.getItem('sello100_cart')) || [];
let shippingCost = 0;

// Función para cargar productos desde Google Sheets
async function cargarProductosDesdeDB() {
    // Creamos un nombre único para la función de callback
    const callbackName = 'jsonpCallback_' + Date.now();
    
    // Esta promesa se resolverá cuando el script de Google llame a la función
    return new Promise((resolve, reject) => {
        // Definimos la función global que Google llamará
        window[callbackName] = (data) => {
            try {
                // Adaptamos los datos
                productos = data.map(p => ({
                    id: Number(p.id),
                    nombre: p.nombre,
                    precio: Number(p.precio),
                    imagen: p.imagen,
                    tallas: p.tallas ? p.tallas.split(',') : [],
                    tela: p.tela
                }));
                
                renderProducts(); // Dibujamos las tarjetas
                resolve(); // Terminamos con éxito
            } catch (error) {
                reject(error);
            } finally {
                // Limpiamos la etiqueta script y la función
                document.body.removeChild(script);
                delete window[callbackName];
            }
        };

        // Creamos la etiqueta <script> apuntando a Google con el callback
        const script = document.createElement('script');
        script.src = `${GOOGLE_SHEETS_API}?callback=${callbackName}`;
        script.onerror = () => {
            reject(new Error('Error cargando el script de Google'));
        };
        
        document.body.appendChild(script);
    }).catch(error => {
        console.error('Error cargando productos:', error);
        document.getElementById('products-grid').innerHTML = `<p style="text-align:center; color:#ff4444;">Error al cargar productos de la nube.</p>`;
    });
}

// ==========================================
// 2. LÓGICA DEL CARRITO Y RENDERIZADO
// ==========================================
function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return; 
    
    productsGrid.innerHTML = '';
    productos.forEach(product => {
        productsGrid.innerHTML += `
            <div class="product-card">
                <div class="product-img-container">
                    <img src="${product.imagen}" alt="${product.nombre}" class="product-img">
                </div>
                <h3 class="product-title">${product.nombre}</h3>
                <p class="product-price">$${product.precio.toFixed(2)}</p>
                <button class="btn-add-cart" onclick="addToCart(${product.id})">Añadir al carrito</button>
            </div>
        `;
    });
}

function addToCart(id) {
    const product = productos.find(p => p.id === id);
    cart.push(product);
    saveCart();
    updateCartUI();
    
    const cartCount = document.getElementById('cart-count');
    if(cartCount) {
        cartCount.style.transform = 'scale(1.5)';
        setTimeout(() => cartCount.style.transform = 'scale(1)', 200);
    }
}

function saveCart() {
    localStorage.setItem('sello100_cart', JSON.stringify(cart));
}

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
                <span style="font-size: 0.9rem;">${item.nombre}</span>
                <span style="color: var(--gold-primary); font-weight: bold;">$${item.precio.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color: #ff4444; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });

    document.getElementById('subtotal-price').innerText = subtotal.toFixed(2);
    const total = subtotal + shippingCost;
    document.getElementById('total-price').innerText = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCart = document.getElementById('close-cart');

if (cartBtn) {
    cartBtn.addEventListener('click', () => {
        cartModal.classList.add('active');
        updateCartUI();
        initMap();
    });
    closeCart.addEventListener('click', () => cartModal.classList.remove('active'));
}

// ==========================================
// 3. SISTEMA DE ANIMACIONES AL SCROLL
// ==========================================
const observerOptions = { root: null, rootMargin: '0px 0px -50px 0px', threshold: 0.1 };
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active', 'show');
            obs.unobserve(entry.target); 
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    // Cargamos los productos de Google Sheets al iniciar
    cargarProductosDesdeDB();
    updateCartUI();

    const revealElements = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    revealElements.forEach(el => observer.observe(el));
});

// ==========================================
// 4. LÓGICA DEL MAPA DE ENVÍOS (LEAFLET)
// ==========================================
let map;
let marker;
let localCoords = [-2.220962, -79.897079]; 

function initMap() {
    if (map) return; 

    map = L.map('map').setView(localCoords, 13);
    setTimeout(() => { map.invalidateSize(); }, 200);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    L.marker(localCoords).addTo(map)
        .bindPopup('<b>SELLO 100</b><br>Punto de origen')
        .openPopup();

    map.on('click', function(e) {
        const clientCoords = [e.latlng.lat, e.latlng.lng];
        if (marker) {
            marker.setLatLng(clientCoords);
        } else {
            marker = L.marker(clientCoords, { draggable: true }).addTo(map);
        }
        calcularDistancia(localCoords, clientCoords);
    });
}

function calcularDistancia(origen, destino) {
    const R = 6371; 
    const dLat = (destino[0] - origen[0]) * Math.PI / 180;
    const dLon = (destino[1] - origen[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(origen[0] * Math.PI / 180) * Math.cos(destino[0] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanciaKm = R * c;

    const tarifaBase = 1.50; 
    const costoPorKmExtra = 0.50; 
    const kmIncluidos = 2; 
    const distanciaMaxima = 20; 

    let costoEnvio = tarifaBase;
    let mensajeExtra = "";

    if (distanciaKm > distanciaMaxima) {
        costoEnvio = 0;
        mensajeExtra = " (A convenir por WhatsApp - Zona lejana)";
        document.getElementById('shipping-cost').style.color = "#ff4444"; 
    } else {
        document.getElementById('shipping-cost').style.color = "var(--gold-primary)"; 
        if (distanciaKm > kmIncluidos) {
            costoEnvio += (distanciaKm - kmIncluidos) * costoPorKmExtra;
        }
    }

    document.getElementById('distance-text').innerText = `${distanciaKm.toFixed(1)} km`;
    document.getElementById('shipping-cost').innerText = `$${costoEnvio.toFixed(2)}${mensajeExtra}`;
    
    shippingCost = costoEnvio;
    updateCartUI(); 
}

// ==========================================
// 5. LÓGICA DEL CHECKOUT Y WHATSAPP
// ==========================================
const checkoutModal = document.getElementById('checkout-modal');
const closeCheckout = document.getElementById('close-checkout');

if (closeCheckout) {
    closeCheckout.addEventListener('click', () => checkoutModal.classList.remove('active'));
}

function abrirCheckout() {
    if (cart.length === 0) {
        alert("Tu carrito está vacío. Añade productos primero.");
        return;
    }
    if (!marker) {
        alert("Por favor, selecciona tu ubicación en el mapa para calcular el envío.");
        return;
    }

    const subtotal = cart.reduce((acc, item) => acc + item.precio, 0);
    const total = subtotal + shippingCost;
    document.getElementById('total-checkout').innerText = `$${total.toFixed(2)}`;

    cartModal.classList.remove('active');
    checkoutModal.classList.add('active');
}

function copiarTexto(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        alert("¡Número copiado al portapapeles!");
    });
}

// ==========================================
// 6. LÓGICA DE SUBIDA DE COMPROBANTE Y FINALIZAR
// ==========================================
const fileInput = document.getElementById('comprobante');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');

if (fileInput) {
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                imagePreview.src = event.target.result;
                previewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            previewContainer.style.display = 'none';
            imagePreview.src = '';
        }
    });
}

async function subirComprobante(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('to_format', 'jpg');

    const response = await fetch('https://cleverutils.com/api/v1/convert', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Servicio ocupado, intenta de nuevo.');
    }

    const result = await response.json();
    if (result.data && result.data.output && result.data.output.url) {
        return result.data.output.url;
    } else {
        throw new Error('No se pudo obtener la URL de la imagen.');
    }
}

async function finalizarCompra() {
    const btn = document.getElementById('btn-finalizar');
    const nombre = document.getElementById('nombre-cliente').value.trim();
    const cedula = document.getElementById('cedula-cliente').value.trim();

    if (!fileInput.files[0]) {
        alert("Por favor, sube tu comprobante de pago.");
        return;
    }
    if (nombre === "" || cedula === "") {
        alert("Por favor, ingresa tu nombre y cédula.");
        return;
    }

    btn.innerHTML = 'Subiendo comprobante... <i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const urlComprobante = await subirComprobante(fileInput.files[0]);

        const subtotal = cart.reduce((acc, item) => acc + item.precio, 0);
        const total = subtotal + shippingCost;
        const numeroWhatsApp = "593962576433"; 

        let mensaje = `*🛒 NUEVO PEDIDO - SELLO 100*\n\n`;
        mensaje += `*Cliente:* ${nombre}\n`;
        mensaje += `*Cédula:* ${cedula}\n\n`;
        mensaje += `*📦 Productos:*\n`;
        
        cart.forEach((item, index) => {
            mensaje += `${index + 1}. ${item.nombre} - $${item.precio.toFixed(2)}\n`;
        });

        mensaje += `\n*Subtotal:* $${subtotal.toFixed(2)}\n`;
        mensaje += `*Envío:* $${shippingCost.toFixed(2)}\n`;
        mensaje += `*TOTAL PAGADO:* $${total.toFixed(2)}\n\n`;
        mensaje += `*📍 Ubicación de entrega:*\n`;
        mensaje += `https://www.google.com/maps?q=${marker.getLatLng().lat},${marker.getLatLng().lng}\n\n`;
        mensaje += `*🧾 Comprobante de pago:*\n${urlComprobante}`;

        const mensajeCodificado = encodeURIComponent(mensaje);
        const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`;

        window.open(urlWhatsApp, '_blank');

        // Limpiar
        cart = [];
        saveCart();
        updateCartUI();
        checkoutModal.classList.remove('active');
        
        document.getElementById('comprobante').value = '';
        document.getElementById('nombre-cliente').value = '';
        document.getElementById('cedula-cliente').value = '';
        previewContainer.style.display = 'none';
        
    } catch (error) {
        console.error(error);
        alert(`Hubo un error al subir el comprobante: ${error.message}`);
    } finally {
        btn.innerHTML = 'Finalizar y Enviar por WhatsApp <i class="fa-brands fa-whatsapp"></i>';
        btn.disabled = false;
    }
}