# 🍽️ FNX RESTAURANT — Smart Table, KDS & PDA Experience (WhatAuth)

Sistema interactivo de restauración inteligente y comandero en tiempo real que conecta el **Posa-QR Físico de Mesa**, la **Carta Digital Móvil del Comensal**, el **KDS de Cocina** (Kitchen Display System) y el **PDA del Camarero** (Servicio de Sala) mediante **WhatAuth Pixel** y **WhatsApp**.

> 🌐 **Dominio oficial:** [https://carta.fenix.ninja/](https://carta.fenix.ninja/)

---

## 📌 Arquitectura y Flujo del Ecosistema

El proyecto demuestra la integración del **Pixel QR de WhatAuth** en una experiencia gastronómica integral sin fricción:

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Posa-QR Físico en Mesa  │ ──────> │  Escaneo con WhatsApp    │
│  (Mesa 01, 04, 07)       │         │  (Mensaje verificado)    │
└──────────────────────────┘         └────────────┬─────────────┘
                                                  │
                                                  ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  Auto-Reply WhatAuth     │ <────── │  Confirmación Instantánea│
│  Enlace a Carta Digital  │         │  (res_pixel_qr / WS)     │
└────────────┬─────────────┘         └────────────┬─────────────┘
             │                                    │
             ▼                                    ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│  Carta Móvil Comensal    │         │  Consola de Restaurante  │
│  (carta.html en móvil)   │ ──────> │  • Posa-QR Verificado    │
│  Añade Paellas / Bebidas │         │  • KDS Cocina (Arriba)   │
│  en tiempo real          │         │  • PDA Camarero (Abajo)  │
└──────────────────────────┘         └──────────────────────────┘
```

1. **Posa-QR Físico Realista (Atril de Acrílico y Madera):**
   - El comensal se sienta en la mesa y encuentra un atril con el QR Pixel de WhatAuth.
   - El selector superior permite cambiar de mesa en la demo (**Mesa 01 - Salón**, **Mesa 04 - Terraza**, **Mesa 07 - VIP**).
2. **Escaneo y Verificación Instantánea:**
   - Al escanear con la cámara o WhatsApp, el evento `res_pixel_qr` llega a la pantalla en milisegundos.
   - La tarjeta del atril pasa a **`✓ MESA CONECTADA (VERIFICADO)`** mostrando el nombre del cliente (`👤 Carlos Rivas`) y su teléfono enmascarado (`🔒 +34 ••• •• 121`).
   - El nombre del comensal se vincula automáticamente a los tickets de cocina y sala.
3. **Auto-Reply y Carta Móvil (`carta.html`):**
   - El cliente recibe en WhatsApp el mensaje de bienvenida con el enlace directo a la carta interactiva.
   - Al abrirla en su smartphone, ve la carta minimalista (Paella Valenciana, Paella Señorret, Vino Rioja, Vino Rueda, Agua Mineral).
4. **Enrutamiento Inteligente KDS vs PDA:**
   - **Comida (Paellas):** Entra automáticamente al **KDS de Cocina** con temporizador de marcha (`00:00`) y botón `[Marcar Listo para Servir]`.
   - **Bebidas (Vinos, Agua):** Entra automáticamente al **PDA del Camarero** con botón `[✓ Servir]`.
   - Cuando cocina marca el plato como listo, se dispara una campanada y una alerta parpadeante en el PDA del camarero: `🛎️ Llevar Paellas a Mesa 04`.

---

## 🎨 Identidad Visual y Paleta

- **Logo Oficial:** Mano estilizada con bandeja de servicio y destellos luminosos (`src/img/logo.png`), procesado con fondo transparente.
- **Paleta Extraída:**
  - Púrpura Imperial: `#9B51E0`
  - Magenta Neón: `#E056FD`
  - Azul Cobalto: `#607AFE`
  - Naranja Fuego (KDS): `#FF7A00`
  - Verde Esmeralda (Verificado): `#10B981`
- **Fondo Dinámico:** Carrusel de vídeo con desenfoque cinematográfico (*blur overlay*) mostrando el ambiente real de cocina, baristas y comensales.

---

## 📂 Estructura del Repositorio

```plaintext
cartafenix/
├── index.html              # Consola principal (Posa-QR + KDS + PDA)
├── style.css               # Estilos glassmorphism y paleta neón púrpura
├── index.js                # Lógica de escritorio, WebSocket y sincronización
├── carta.html              # Web-app táctil responsive para el comensal
├── carta.css               # Estilos móviles de la carta
├── carta.js                # Steppers, carrito y emisión a sala de socket
├── CNAME                   # carta.fenix.ninja (GitHub Pages)
├── README.md               # Documentación canónica
└── src/
    ├── img/
    │   ├── logo.png        # Logo oficial transparente
    │   ├── favicon-96x96.png
    │   └── favicon.ico
    └── video/
        ├── chef_cooking.mp4
        ├── waiter_taking_order.mp4
        ├── patrons_dining_terrace.mp4
        └── ...
```

---

## 🚀 Despliegue en GitHub Pages

1. Rama `main` configurada con raíz `/` (root).
2. Servidor DNS configurado con registro CNAME apuntando a `carta.fenix.ninja`.
3. Certificado SSL automático emitido por Cloudflare / GitHub Pages.
