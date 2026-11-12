# SELLO 100 | Moda Masculina Futurista

Bienvenido al repositorio oficial de **Sello 100**, una tienda online de moda masculina con un diseño web futurista, minimalista y oscuro (estilo *Dark Mode*).

Este proyecto fue diseñado para ser **100% gratuito**, utilizando servicios en la nube con capas gratuitas para el catálogo, las imágenes y el despliegue.

## 🚀 Características Principales

*   **Catálogo Dinámico:** Los productos se cargan en tiempo real desde una hoja de cálculo de Google Sheets.
*   **Vista Rápida de Producto:** Modal con carrusel de imágenes automático (cada 5 segundos), selector de tallas y colores.
*   **Carrito de Compras:** Funcional y persistente (se guarda en el `localStorage` del navegador).
*   **Cotizador de Envíos:** Mapa interactivo con buscador de direcciones (Leaflet + OpenStreetMap) que calcula el costo de envío según la distancia.
*   **Checkout Inteligente:** Subida de comprobante de pago a ImgBB y generación automática de mensaje estructurado para WhatsApp.
*   **Panel de Administración:** Acceso protegido (con cookies para persistir la sesión) para que el dueño pueda añadir, editar y eliminar productos, gestionar múltiples fotos, tallas y colores.
*   **Diseño Responsivo:** Adaptado para computadoras, tablets y celulares.
*   **Notificaciones Toast:** Reemplazo de los `alert()` nativos por notificaciones elegantes y propias del sistema.
*   **Preloader:** Pantalla de carga con el logo de la marca antes de mostrar el contenido.

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
*   **Base de Datos:** Google Sheets + Google Apps Script (como API REST).
*   **Almacenamiento de Imágenes:** ImgBB (vía API).
*   **Mapas:** Leaflet.js + OpenStreetMap + Nominatim (Geocoder).
*   **Hosting:** GitHub Pages.
*   **Tipografías:** Google Fonts (Orbitron y Montserrat).
*   **Iconos:** Font Awesome.

## 📁 Estructura del Proyecto

```text
├── css/
│   └── main.css          # Estilos globales, animaciones y diseño responsive
├── js/
│   └── app-v4.js         # Lógica del catálogo, carrito, mapa y checkout
├── page/
│   └── admin.html        # Panel de administración para el dueño
└── index.html            # Página principal (Catálogo)
