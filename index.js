/**
 * FNX RESTAURANT — LÓGICA DE CONTROL DESKTOP (KDS, PDA & POSA-QR)
 * Integración WhatAuth Pixel QR en tiempo real con Socket.IO
 */

(function () {
  'use strict';

  // Configuración WhatAuth & Restaurante
  const RESTAURANT_CONFIG = {
    domain: 'carta.fenix.ninja',
    phone: '34627118121',
    wsUrl: 'https://api.whatauth.com',
    logoUrl: 'src/img/logo.png',
    currentTable: 'Mesa 04',
    currentZone: 'Terraza Principal',
    soundEnabled: true
  };

  // Vídeos gastronómicos para el carrusel de fondo
  const BG_VIDEOS = [
    'src/video/chef_cooking.mp4',
    'src/video/waiter_taking_order.mp4',
    'src/video/patrons_dining_terrace.mp4',
    'src/video/couple_dining.mp4',
    'src/video/chefs_kitchen.mp4'
  ];
  let currentVideoIdx = 0;

  // Estado reactivo
  let whatAuthSocket = null;
  let currentQrSession = null;
  let activeQrStyling = null;
  let activeDiner = null;
  let audioContext = null;

  // Temporizadores KDS
  let kdsTimerInterval = null;
  let kdsElapsedSeconds = 0;

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  window.addEventListener('DOMContentLoaded', () => {
    initClock();
    initVideoBackground();
    initTableSwitcher();
    initSoundToggle();
    initKdsTimer();
    initWhatAuthSocket();
  });

  // ========================================================
  // 1. RELOJ EN VIVO
  // ========================================================
  function initClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;

    function update() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    update();
    setInterval(update, 1000);
  }

  // ========================================================
  // 2. FONDO DE VÍDEO EN BUCLE Y TRANSICIÓN
  // ========================================================
  function initVideoBackground() {
    const videoPlayer = document.getElementById('bg-video-player');
    if (!videoPlayer) return;

    videoPlayer.addEventListener('ended', () => {
      currentVideoIdx = (currentVideoIdx + 1) % BG_VIDEOS.length;
      videoPlayer.style.opacity = '0';
      setTimeout(() => {
        videoPlayer.src = BG_VIDEOS[currentVideoIdx];
        videoPlayer.play().catch(() => {});
        videoPlayer.style.opacity = '1';
      }, 600);
    });

    videoPlayer.play().catch((err) => {
      console.warn('[Video] Autoplay mitigado por política del navegador:', err);
    });
  }

  // ========================================================
  // 3. SELECTOR DE MESAS (DEMO)
  // ========================================================
  function initTableSwitcher() {
    const tabs = document.querySelectorAll('.table-tab-btn');
    const standTableTitle = document.getElementById('stand-table-title');
    const standZoneTitle = document.getElementById('stand-zone-title');
    const btnOpenMobile = document.getElementById('btn-open-mobile-menu');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const tableName = tab.dataset.table || 'Mesa 04';
        const zoneName = tab.dataset.zone || 'Terraza';
        const pin = tab.dataset.pin || 'N-401';

        RESTAURANT_CONFIG.currentTable = tableName;
        RESTAURANT_CONFIG.currentZone = zoneName;

        if (standTableTitle) standTableTitle.textContent = tableName.toUpperCase();
        if (standZoneTitle) standZoneTitle.textContent = zoneName;

        // Actualizar enlace de carta móvil
        if (btnOpenMobile) {
          const sessId = currentQrSession?.sessionId || 'live';
          btnOpenMobile.href = `carta.html?session=${sessId}&table=${encodeURIComponent(tableName)}`;
        }

        // Resetear estado de verificación al cambiar mesa
        resetStandVerification();

        // Solicitar nuevo QR para esta mesa
        requestTableQr(tableName, pin);
        playChime(440, 'sine', 0.1);
      });
    });
  }

  function resetStandVerification() {
    activeDiner = null;
    const statusWaiting = document.getElementById('status-waiting');
    const statusVerified = document.getElementById('status-verified');
    if (statusWaiting) statusWaiting.classList.remove('hidden');
    if (statusVerified) statusVerified.classList.add('hidden');

    const kdsDiner = document.getElementById('kds-diner-04');
    const pdaDiner = document.getElementById('pda-diner-04');
    if (kdsDiner) kdsDiner.textContent = 'Comensal: Pendiente...';
    if (pdaDiner) pdaDiner.textContent = 'Comensal: Conectando...';
  }

  // ========================================================
  // 4. SINTETIZADOR DE AUDIO (BELL CHIME SIN ASSETS EXTERNOS)
  // ========================================================
  function initSoundToggle() {
    const btn = document.getElementById('btn-sound-toggle');
    const icon = document.getElementById('sound-icon');
    const label = document.getElementById('sound-label');

    btn?.addEventListener('click', () => {
      RESTAURANT_CONFIG.soundEnabled = !RESTAURANT_CONFIG.soundEnabled;
      if (icon) icon.textContent = RESTAURANT_CONFIG.soundEnabled ? '🔔' : '🔕';
      if (label) label.textContent = RESTAURANT_CONFIG.soundEnabled ? 'Sonido ON' : 'Silencio';
      if (RESTAURANT_CONFIG.soundEnabled) playChime(587.33, 'triangle', 0.2);
    });
  }

  function playChime(freq = 523.25, type = 'sine', duration = 0.35) {
    if (!RESTAURANT_CONFIG.soundEnabled) return;
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioContext.currentTime);
      gain.gain.setValueAtTime(0.18, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }

  // ========================================================
  // 5. TEMPORIZADOR DE MARCHAS KDS
  // ========================================================
  function initKdsTimer() {
    const timerDigits = document.getElementById('timer-kds-04');
    if (!timerDigits) return;

    kdsElapsedSeconds = 145; // Arrancar en ~02:25 para dinamismo visual

    kdsTimerInterval = setInterval(() => {
      kdsElapsedSeconds++;
      const m = Math.floor(kdsElapsedSeconds / 60).toString().padStart(2, '0');
      const s = (kdsElapsedSeconds % 60).toString().padStart(2, '0');
      timerDigits.textContent = `${m}:${s}`;
    }, 1000);
  }

  // ========================================================
  // 6. CONEXIÓN WEBSOCKET WHATAUTH
  // ========================================================
  function initWhatAuthSocket() {
    try {
      const socket = io(RESTAURANT_CONFIG.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1500
      });

      socket.on('connect', () => {
        console.log('[WhatAuth WS] Conectado a', RESTAURANT_CONFIG.wsUrl, 'ID:', socket.id);
        socket.emit('subscribe_pixel', { domain: RESTAURANT_CONFIG.domain });
        requestTableQr(RESTAURANT_CONFIG.currentTable, 'N-401');
      });

      // Recepción de QR generado por el servidor
      socket.on('qr_ready', (data) => {
        if (!data || !data.success) return;
        currentQrSession = data;
        console.log('[WhatAuth WS] QR Ready para mesa:', data);

        let walink = data.walink || '';
        // Forzar número oficial de FNX en wa.me si aplica
        if (RESTAURANT_CONFIG.phone && walink) {
          try {
            const u = new URL(walink);
            if (u.hostname === 'wa.me') {
              u.pathname = `/${RESTAURANT_CONFIG.phone}`;
            } else {
              u.searchParams.set('phone', RESTAURANT_CONFIG.phone);
            }
            walink = u.toString();
          } catch (_) {}
        }
        currentQrSession.walink = walink;

        renderStandQr(walink);

        // Actualizar botón directo de WhatsApp
        const btnDirectWa = document.getElementById('btn-direct-wa');
        if (btnDirectWa) btnDirectWa.href = walink;

        // Actualizar botón de carta móvil con sessionId
        const btnOpenMobile = document.getElementById('btn-open-mobile-menu');
        if (btnOpenMobile) {
          btnOpenMobile.href = `carta.html?session=${data.sessionId}&table=${encodeURIComponent(RESTAURANT_CONFIG.currentTable)}`;
        }
      });

      // Escaneo verificado de WhatsApp
      socket.on('res_pixel_qr', handleScanVerified);
      socket.on('qr_verified', handleScanVerified);

      // Eventos de comanda interactiva desde carta móvil
      socket.on('order_item_added', handleMobileOrderItem);
      socket.on('order_submitted', handleMobileOrderSubmit);

      whatAuthSocket = socket;
    } catch (err) {
      console.warn('[WhatAuth WS] Error inicializando socket:', err);
    }
  }

  function requestTableQr(tableName, pin) {
    if (!whatAuthSocket || !whatAuthSocket.connected) return;
    whatAuthSocket.emit('req_pixel_qr', {
      domain: RESTAURANT_CONFIG.domain,
      id: `${tableName.replace(/\s+/g, '')}_${pin}`,
      text: tableName,
      pin: pin
    });
  }

  // ========================================================
  // 7. RENDERIZADO DEL QR PIXEL EN EL ATRIL
  // ========================================================
  function renderStandQr(walink) {
    const target = document.getElementById('stand-qr-target');
    if (!target || !walink || typeof QRCodeStyling === 'undefined') return;

    target.innerHTML = '';

    try {
      activeQrStyling = new QRCodeStyling({
        width: 220,
        height: 220,
        type: 'svg',
        data: walink,
        image: RESTAURANT_CONFIG.logoUrl,
        margin: 2,
        qrOptions: { mode: 'Byte', errorCorrectionLevel: 'Q' },
        dotsOptions: {
          color: '#121624',
          type: 'rounded'
        },
        backgroundOptions: { color: '#ffffff' },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4,
          imageSize: 0.26
        },
        cornersSquareOptions: {
          color: '#9B51E0',
          type: 'extra-rounded'
        },
        cornersDotOptions: {
          color: '#E056FD',
          type: 'dot'
        }
      });

      activeQrStyling.append(target);
    } catch (e) {
      console.warn('[QR] Error renderizando QR Styling:', e);
    }
  }

  // ========================================================
  // 8. ESCANEO VERIFICADO (CAMBIO DE ESTADO EN VIVO)
  // ========================================================
  function handleScanVerified(data) {
    console.log('[WhatAuth] 🎯 ¡Mesa escaneada y verificada!', data);

    const userObj = data?.user || {};
    const rawName = userObj.name || data?.senderName || data?.pushName || 'Carlos Rivas';
    const cleanName = String(rawName).trim();
    const rawPhone = userObj.phone || data?.senderPhone || data?.phone || RESTAURANT_CONFIG.phone;

    activeDiner = { name: cleanName, phone: rawPhone };

    // 1. Posa-QR: Revelar tarjeta verificada
    const statusWaiting = document.getElementById('status-waiting');
    const statusVerified = document.getElementById('status-verified');
    const verifiedName = document.getElementById('verified-customer-name');
    const verifiedPhone = document.getElementById('verified-customer-phone');

    if (statusWaiting) statusWaiting.classList.add('hidden');
    if (statusVerified) statusVerified.classList.remove('hidden');
    if (verifiedName) verifiedName.textContent = cleanName;
    if (verifiedPhone) verifiedPhone.textContent = '🔒 ' + maskPhone(rawPhone);

    // 2. KDS y PDA: Asignar nombre del comensal en los tickets
    const kdsDiner = document.getElementById('kds-diner-04');
    const pdaDiner = document.getElementById('pda-diner-04');
    if (kdsDiner) kdsDiner.textContent = `Comensal: ${cleanName}`;
    if (pdaDiner) pdaDiner.textContent = `Comensal: ${cleanName}`;

    // Campanada de bienvenida
    playChime(659.25, 'triangle', 0.5);
  }

  function maskPhone(phone) {
    if (!phone) return '+34 ••• •• 121';
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length < 4) return '••••' + clean;
    if (clean.startsWith('34') && clean.length === 11) {
      return `+34 ••• •• ${clean.slice(-3)}`;
    }
    return `+34 ••• •• ${clean.slice(-3)}`;
  }

  // ========================================================
  // 9. RECEPCIÓN EN TIEMPO REAL DESDE CARTA MÓVIL
  // ========================================================
  function handleMobileOrderItem(item) {
    console.log('[Socket] 📦 Producto añadido en móvil:', item);
    playChime(784, 'sine', 0.2);

    if (!item || !item.name) return;

    // Si es paella -> va a KDS Cocina
    if (item.category === 'paellas' || item.name.toLowerCase().includes('paella')) {
      addKdsItem(item);
    } else {
      // Si es vino o agua -> va a PDA Camarero
      addPdaItem(item);
    }
  }

  function handleMobileOrderSubmit(order) {
    console.log('[Socket] 🚀 Comanda confirmada desde carta móvil:', order);
    playChime(880, 'sine', 0.4);

    // Actualizar badges
    const kdsCount = document.getElementById('kds-count');
    const pdaCount = document.getElementById('pda-count');
    if (kdsCount && order?.foodCount) kdsCount.textContent = order.foodCount;
    if (pdaCount && order?.drinkCount) pdaCount.textContent = order.drinkCount;
  }

  function addKdsItem(item) {
    const list = document.getElementById('kds-items-04');
    if (!list) return;

    const li = document.createElement('li');
    li.className = 'ticket-item popIn';
    li.innerHTML = `
      <span class="item-qty">${item.qty || 1}x</span>
      <div class="item-info">
        <span class="item-name">${item.name}</span>
        <span class="item-note">Pedido móvil en directo</span>
      </div>
      <span class="item-status-pill cooking">Fuego Activo</span>
    `;
    list.appendChild(li);

    const kdsCount = document.getElementById('kds-count');
    if (kdsCount) {
      kdsCount.textContent = parseInt(kdsCount.textContent || '0', 10) + 1;
    }
  }

  function addPdaItem(item) {
    const list = document.getElementById('pda-items-04');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'pda-item-row popIn';
    const icon = item.name.toLowerCase().includes('vino') ? '🍷' : '💧';
    div.innerHTML = `
      <div class="pda-item-main">
        <span class="pda-qty">${item.qty || 1}x</span>
        <span class="pda-icon">${icon}</span>
        <span class="pda-label">${item.name}</span>
      </div>
      <button type="button" class="btn-pda-serve" onclick="serveItem(this, '${item.name}')">
        <span>✓ Servir</span>
      </button>
    `;
    list.appendChild(div);

    const pdaCount = document.getElementById('pda-count');
    if (pdaCount) {
      pdaCount.textContent = parseInt(pdaCount.textContent || '0', 10) + 1;
    }
  }

  // ========================================================
  // 10. ACCIONES INTERACTIVAS DEL KDS & PDA
  // ========================================================
  window.markDishReady = function (tableName) {
    const ticket = document.getElementById('ticket-kds-04');
    if (ticket) {
      ticket.classList.add('ready');
      const pills = ticket.querySelectorAll('.item-status-pill');
      pills.forEach((p) => {
        p.className = 'item-status-pill done';
        p.textContent = 'Emplatado';
      });
    }

    // Avisar al PDA
    const pdaAlert = document.getElementById('pda-kitchen-alert');
    const pdaAlertText = document.getElementById('pda-alert-text');
    if (pdaAlert && pdaAlertText) {
      pdaAlertText.textContent = `Llevar Paellas a ${tableName}`;
      pdaAlert.classList.remove('hidden');
    }

    playChime(987.77, 'triangle', 0.6);
  };

  window.serveItem = function (btn, itemName) {
    const row = btn.closest('.pda-item-row');
    if (row) {
      row.classList.toggle('served');
      btn.textContent = row.classList.contains('served') ? 'Servido' : '✓ Servir';
      playChime(523.25, 'sine', 0.15);
    }
  };

  window.clearKitchenAlert = function () {
    const pdaAlert = document.getElementById('pda-kitchen-alert');
    if (pdaAlert) pdaAlert.classList.add('hidden');
    playChime(659.25, 'sine', 0.2);
  };

  // Exponer API global para pruebas manuales desde consola
  window.FNXRestaurant = {
    simulateScan: (name = 'Carlos Rivas', phone = '34627118121') => {
      handleScanVerified({ user: { name, phone } });
    },
    simulateMobileItem: (name, category = 'paellas', qty = 1) => {
      handleMobileOrderItem({ name, category, qty });
    }
  };
})();
