/**
 * FNX RESTAURANT — CARTA DIGITAL MÓVIL (carta.js)
 * Conexión en tiempo real con KDS y PDA a través de WhatAuth Socket.IO
 */

(function () {
  'use strict';

  const CARTA_CONFIG = {
    wsUrl: 'https://api.whatauth.com',
    domain: 'carta.fenix.ninja'
  };

  // Parámetros de URL
  const urlParams = new URLSearchParams(window.location.search);
  const currentSessionId = urlParams.get('session') || urlParams.get('sessionId') || 'live';
  const currentTable = urlParams.get('table') || 'Mesa 04';
  const currentDinerName = urlParams.get('name') || '';

  // Canal de difusión local para sincronización instantánea en el mismo navegador
  const broadcast = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('fnx_restaurant_orders')
    : null;

  // Estado del pedido en el cliente
  const cart = {};
  let socket = null;
  let audioContext = null;

  // ========================================================
  // INICIALIZACIÓN
  // ========================================================
  window.addEventListener('DOMContentLoaded', () => {
    initUI();
    initSocket();
    initSteppers();
    initSubmitButton();
  });

  // ========================================================
  // 1. INICIALIZACIÓN UI & SALUDO
  // ========================================================
  function initUI() {
    const tablePill = document.getElementById('mobile-table-name');
    const modalTableLabel = document.getElementById('modal-table-label');
    const greetingEl = document.getElementById('welcome-greeting');

    if (tablePill) tablePill.textContent = currentTable;
    if (modalTableLabel) modalTableLabel.textContent = currentTable;

    if (greetingEl) {
      if (currentDinerName) {
        greetingEl.textContent = `¡Hola, ${currentDinerName}! 🍽️✨`;
      } else {
        greetingEl.textContent = `¡Hola! Bienvenido a ${currentTable} 🍽️✨`;
      }
    }
  }

  // ========================================================
  // 2. CONEXIÓN SOCKET.IO (SALA COMPARTIDA POR SESSIONID)
  // ========================================================
  function initSocket() {
    try {
      socket = io(CARTA_CONFIG.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socket.on('connect', () => {
        console.log('[Carta Móvil] Conectado a socket:', socket.id);
        // Suscribirse a la sala de la mesa y de la sesión
        socket.emit('subscribe_table', { table: currentTable, domain: CARTA_CONFIG.domain });
        if (currentSessionId && currentSessionId !== 'live') {
          socket.emit('join_qr_session', { sessionId: currentSessionId });
        }
      });

      socket.on('qr_verified', (data) => {
        const name = data?.user?.name || data?.senderName || 'Comensal';
        const greetingEl = document.getElementById('welcome-greeting');
        if (greetingEl) greetingEl.textContent = `¡Hola, ${name}! 🍽️✨`;
      });
    } catch (e) {
      console.warn('[Carta Móvil] Error conectando socket:', e);
    }
  }

  // ========================================================
  // 3. STEPPERS DE CANTIDAD (+ / -)
  // ========================================================
  function initSteppers() {
    const cards = document.querySelectorAll('.product-card');

    cards.forEach((card) => {
      const id = card.dataset.id;
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price || '0');
      const cat = card.dataset.cat;
      const qtyNumber = card.querySelector('.qty-number');
      const btnPlus = card.querySelector('.btn-plus');
      const btnMinus = card.querySelector('.btn-minus');

      cart[id] = { name, price, category: cat, qty: 0 };

      btnPlus?.addEventListener('click', () => {
        cart[id].qty++;
        if (qtyNumber) qtyNumber.textContent = cart[id].qty;
        card.classList.add('has-qty');
        playTapSound(600);
        updateCartTotal();

        // Emitir adición en tiempo real a la consola de escritorio (KDS & PDA)
        emitItemToDesktop({
          id,
          name,
          category: cat,
          price,
          qty: 1,
          table: currentTable,
          sessionId: currentSessionId
        });
      });

      btnMinus?.addEventListener('click', () => {
        if (cart[id].qty > 0) {
          cart[id].qty--;
          if (qtyNumber) qtyNumber.textContent = cart[id].qty;
          if (cart[id].qty === 0) {
            card.classList.remove('has-qty');
          }
          playTapSound(400);
          updateCartTotal();
        }
      });
    });
  }

  // ========================================================
  // 4. ACTUALIZACIÓN DE TOTALES Y BOTÓN DE COMANDA
  // ========================================================
  function updateCartTotal() {
    let totalItems = 0;
    let totalPrice = 0;

    Object.values(cart).forEach((item) => {
      totalItems += item.qty;
      totalPrice += item.qty * item.price;
    });

    const countEl = document.getElementById('order-items-count');
    const totalEl = document.getElementById('order-total-price');
    const submitBtn = document.getElementById('btn-submit-order');

    if (countEl) {
      countEl.textContent = totalItems === 1 ? '1 plato seleccionado' : `${totalItems} productos seleccionados`;
    }
    if (totalEl) {
      totalEl.textContent = totalPrice.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR'
      });
    }

    if (submitBtn) {
      submitBtn.disabled = totalItems === 0;
    }
  }

  // ========================================================
  // 5. ENVÍO DE COMANDA A COCINA Y SALA
  // ========================================================
  function initSubmitButton() {
    const submitBtn = document.getElementById('btn-submit-order');
    const modal = document.getElementById('order-modal');
    const btnCloseModal = document.getElementById('btn-modal-close');

    submitBtn?.addEventListener('click', () => {
      let foodCount = 0;
      let drinkCount = 0;
      const orderItems = [];

      Object.values(cart).forEach((item) => {
        if (item.qty > 0) {
          orderItems.push(item);
          if (item.category === 'paellas') {
            foodCount += item.qty;
          } else {
            drinkCount += item.qty;
          }
        }
      });

      if (orderItems.length === 0) return;

      playTapSound(800, 'triangle', 0.35);

      // Emitir comanda finalizada a KDS y PDA
      const orderPayload = {
        table: currentTable,
        sessionId: currentSessionId,
        dinerName: currentDinerName || '',
        items: orderItems,
        foodCount,
        drinkCount,
        timestamp: new Date().toISOString()
      };

      if (socket && socket.connected) {
        socket.emit('order_submitted', orderPayload);
      }
      if (broadcast) {
        broadcast.postMessage({ type: 'order_submitted', data: orderPayload });
      }

      // Mostrar modal de éxito
      if (modal) modal.classList.remove('hidden');
    });

    btnCloseModal?.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });
  }

  // ========================================================
  // 6. EMISIÓN EN TIEMPO REAL A DESKTOP
  // ========================================================
  function emitItemToDesktop(itemData) {
    if (socket && socket.connected) {
      socket.emit('order_item_added', itemData);
    }
    if (broadcast) {
      broadcast.postMessage({ type: 'order_item_added', data: itemData });
    }
  }

  // ========================================================
  // 7. SINTETIZADOR DE AUDIO MÓVIL (HAPTIC SOUND)
  // ========================================================
  function playTapSound(freq = 500, type = 'sine', duration = 0.08) {
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
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }
})();

