// Referencias al DOM
const draggableDesign = document.getElementById('draggable-design');
const designArea = document.getElementById('design-area');

// Variables para el arrastre
let isDragging = false;
let currentX = 0;
let currentY = 0;
let initialX;
let initialY;

// Función para seleccionar un diseño de la barra lateral
function selectDesign(imageSrc) {
    draggableDesign.src = imageSrc;
    draggableDesign.style.display = 'block';
    // Resetear posición al centro del área
    draggableDesign.style.left = '0px';
    draggableDesign.style.top = '0px';
    draggableDesign.style.width = '100%'; // Empieza ocupando el ancho del área
}

// --- Lógica de Arrastre (Drag & Drop) ---
draggableDesign.addEventListener('pointerdown', dragStart);
document.addEventListener('pointermove', drag);
document.addEventListener('pointerup', dragEnd);

function dragStart(e) {
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    
    if (e.target === draggableDesign) {
        isDragging = true;
        draggableDesign.style.cursor = 'grabbing';
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault(); // Evita que se scrollee la pantalla en móviles
        
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // Aplicar la nueva posición
        draggableDesign.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
}

function dragEnd(e) {
    isDragging = false;
    draggableDesign.style.cursor = 'grab';
}

// --- Controles de Tamaño ---
function scaleDesign(factor) {
    if (draggableDesign.style.display === 'none') return;
    
    // Obtener el ancho actual en porcentaje
    let currentWidth = parseFloat(draggableDesign.style.width) || 100;
    let newWidth = currentWidth + (factor * 100);
    
    // Limitar el tamaño (entre 20% y 150%)
    if (newWidth >= 20 && newWidth <= 150) {
        draggableDesign.style.width = newWidth + '%';
    }
}

// --- Centrar Diseño ---
function centerDesign() {
    currentX = 0;
    currentY = 0;
    draggableDesign.style.transform = `translate(0px, 0px)`;
}

// --- Guardar y añadir al carrito ---
function guardarPersonalizacion() {
    if (draggableDesign.style.display === 'none') {
        alert('Por favor, selecciona un diseño primero.');
        return;
    }

    // Aquí capturamos los datos de cómo quedó el diseño
    const personalizacion = {
        disenoUrl: draggableDesign.src,
        posicionX: currentX,
        posicionY: currentY,
        escala: draggableDesign.style.width
    };

    console.log("Diseño listo para enviar al carrito:", personalizacion);
    
    // En la siguiente fase, esto se guardará en el localStorage del carrito
    alert('¡Diseño personalizado guardado! (Revisa la consola para ver los datos)');
    
    // Opcional: Redirigir al catálogo o abrir el carrito
    // window.location.href = '../index.html';
}