// ==UserScript==
// @name         ServiceDesk - Plantillas de Resolución
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Selector Select2 con buscador integrado en la barra de herramientas del editor de resolución
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @updateURL    https://archmageoki.github.io/CinfaEnhacer/servicedesk-resoluciones.user.js
// @downloadURL  https://archmageoki.github.io/CinfaEnhacer/servicedesk-resoluciones.user.js
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // ⚙️ GESTIÓN COMPARTIDA DE TÉCNICO
    // =========================================================================
    function obtenerNombreTecnico() {
        let nombre = localStorage.getItem('sdp_tecnico_nombre');
        while (!nombre || !nombre.trim()) {
            nombre = prompt('⚙️ Configuración ServiceDesk:\nIntroduce tu nombre de técnico (tal como aparece en SDP):', 'Juanma');
            if (nombre && nombre.trim()) {
                localStorage.setItem('sdp_tecnico_nombre', nombre.trim());
            } else {
                alert('El nombre de técnico es obligatorio para las funciones automáticas.');
            }
        }
        return localStorage.getItem('sdp_tecnico_nombre');
    }

    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('✏️ Configurar nombre de Técnico', () => {
            const actual = localStorage.getItem('sdp_tecnico_nombre') || '';
            const nuevo = prompt('Introduce tu nuevo nombre de técnico:', actual);
            if (nuevo && nuevo.trim()) {
                localStorage.setItem('sdp_tecnico_nombre', nuevo.trim());
                alert(`Nombre actualizado a: ${nuevo.trim()}.\nSe recargará la página para aplicar los cambios.`);
                location.reload();
            }
        });
    }

    const TECNICO_DEFECTO = obtenerNombreTecnico();

    function getFechaHoy() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    function esModoValido() {
        const url = window.location.href;
        return url.includes('woMode=editWO') || url.includes('woMode=newWO');
    }

    const wait = ms => new Promise(res => setTimeout(res, ms));

    // =========================================================================
    // 🎨 ESTILOS (evitar recorte por overflow del editor nativo)
    // =========================================================================
    const cssId = 'sdp-res-templates-style';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
            /* Permitir que los menús se desborden de la barra de herramientas */
            #resolution\\.content_control .ze,
            #resolution\\.content_control .ze_SCmb,
            #resolution\\.content_control .ze_SCmb > div {
                overflow: visible !important;
                display: flex !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                position: relative !important;
            }

            #sdp-res-select2-wrapper {
                display: inline-block !important;
                position: relative !important;
                margin-left: auto !important;
                margin-right: 6px !important;
                width: 210px !important;
                font-family: Arial, Helvetica, sans-serif !important;
                user-select: none !important;
                z-index: 100000 !important;
            }

            .sdp-res-choice {
                display: block !important;
                height: 24px !important;
                padding: 0 0 0 8px !important;
                overflow: hidden !important;
                position: relative !important;
                border: 1px solid #c9c9c9 !important;
                white-space: nowrap !important;
                line-height: 22px !important;
                color: #444444 !important;
                text-decoration: none !important;
                border-radius: 3px !important;
                background-color: #fafafa !important;
                cursor: pointer !important;
                box-sizing: border-box !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                transition: all 0.15s ease !important;
            }

            .sdp-res-choice:hover {
                background-color: #f0f0f0 !important;
                border-color: #a8a8a8 !important;
                color: #111 !important;
            }

            #sdp-res-select2-wrapper.is-open .sdp-res-choice {
                border-bottom-left-radius: 0 !important;
                border-bottom-right-radius: 0 !important;
                border-color: #aaa !important;
                background: #fff !important;
            }

            .sdp-res-chosen {
                margin-right: 22px !important;
                display: block !important;
                overflow: hidden !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
            }

            .sdp-res-arrow {
                display: inline-block !important;
                width: 18px !important;
                height: 100% !important;
                position: absolute !important;
                right: 0 !important;
                top: 0 !important;
                border-left: 1px solid #e0e0e0 !important;
                background: #f4f4f4 !important;
                border-top-right-radius: 2px !important;
                border-bottom-right-radius: 2px !important;
            }

            .sdp-res-arrow b {
                border-color: #666 transparent transparent transparent !important;
                border-style: solid !important;
                border-width: 4px 4px 0 4px !important;
                height: 0 !important;
                left: 50% !important;
                margin-left: -4px !important;
                margin-top: -2px !important;
                position: absolute !important;
                top: 50% !important;
                width: 0 !important;
            }

            #sdp-res-select2-wrapper.is-open .sdp-res-arrow b {
                border-color: transparent transparent #666 transparent !important;
                border-width: 0 4px 4px 4px !important;
            }

            .sdp-res-drop {
                position: absolute !important;
                top: 100% !important;
                right: 0 !important;
                width: 250px !important;
                background: #ffffff !important;
                border: 1px solid #aaa !important;
                border-top: 0 !important;
                box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25) !important;
                border-radius: 0 0 3px 3px !important;
                z-index: 9999999 !important;
                display: none;
                box-sizing: border-box !important;
                margin-top: -1px !important;
                padding-top: 5px !important;
            }

            #sdp-res-select2-wrapper.is-open .sdp-res-drop {
                display: block !important;
            }

            .sdp-res-search {
                padding: 4px 6px !important;
                box-sizing: border-box !important;
            }

            .sdp-res-search input {
                width: 100% !important;
                height: 24px !important;
                padding: 2px 6px !important;
                font-size: 11px !important;
                font-family: inherit !important;
                border: 1px solid #aaa !important;
                border-radius: 2px !important;
                outline: none !important;
                box-sizing: border-box !important;
                background: #fff !important;
            }

            .sdp-res-results {
                max-height: 220px !important;
                padding: 3px 0 !important;
                margin: 0 !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                list-style: none !important;
            }

            .sdp-res-results li {
                padding: 6px 8px !important;
                font-size: 11px !important;
                color: #333 !important;
                cursor: pointer !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                line-height: 16px !important;
            }

            .sdp-res-results li:hover {
                background-color: #c13b38 !important;
                color: #fff !important;
            }

            .sdp-res-choice.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(estilo);
    }

    // =========================================================================
    // 📝 PLANTILLAS DE RESOLUCIÓN
    // =========================================================================
    const RESOLUCIONES = [
        {
            titulo: "🧪 Resolución de Prueba",
            obtenerTexto: () => `Texto de prueba de la resolución.<br>Se solucionó reiniciando el equipo.<br><br><b>${getFechaHoy()} - ${TECNICO_DEFECTO}</b>`
        },
        {
            titulo: "✅ Resuelto estándar",
            obtenerTexto: () => `Se realizan las comprobaciones pertinentes y se da por resuelta la petición.<br><br><b>${getFechaHoy()} - ${TECNICO_DEFECTO}</b>`
        },
        {
            titulo: "📞 Sin respuesta del usuario",
            obtenerTexto: () => `Se intenta contactar con el usuario mediante llamada y correo sin obtener respuesta. Se procede al cierre del ticket. Si persiste la incidencia, por favor reabrir.<br><br><b>${getFechaHoy()} - ${TECNICO_DEFECTO}</b>`
        },
        {
            titulo: "👤 Resuelto por el usuario",
            obtenerTexto: () => `El propio usuario confirma que ya funciona correctamente o no requiere asistencia adicional.<br><br><b>${getFechaHoy()} - ${TECNICO_DEFECTO}</b>`
        },
        {
            titulo: "🏢 Escalado / Trámite externo",
            obtenerTexto: () => `Se deriva la gestión a proveedor / soporte externo correspondiente para su tramitación.<br><br><b>${getFechaHoy()} - ${TECNICO_DEFECTO}</b>`
        },
        {
            titulo: "🔑 Contraseña / Acceso restablecido",
            obtenerTexto: () => `Se procede al restablecimiento de las credenciales de acceso y se valida el correcto inicio de sesión junto al usuario.<br><br><b>${getFechaHoy()} - ${TECNICO_DEFECTO}</b>`
        },
        {
            titulo: "🧹 Limpiar resolución",
            obtenerTexto: () => ``
        }
    ];

    // =========================================================================
    // 💉 INSERCIÓN Y SOBRESCRITURA
    // =========================================================================
    async function sobrescribirResolucion(htmlContent) {
        const resolutionBox = document.getElementById('rf-resolutionBox') || document.querySelector('.desc-row[data-fname="resolution.content"]');
        if (!resolutionBox) return false;

        let insertado = false;

        // 1. Escribir dentro del iframe del editor enriquecido
        const iframe = resolutionBox.querySelector('iframe.ze_area') || resolutionBox.querySelector('iframe');
        if (iframe) {
            try {
                const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                if (doc && doc.body) {
                    doc.body.innerHTML = htmlContent ? `<div>${htmlContent}</div>` : '';
                    doc.body.dispatchEvent(new Event('input', { bubbles: true }));

                    iframe.contentWindow.focus();
                    doc.body.focus();

                    const win = iframe.contentWindow;
                    const sel = win.getSelection();
                    if (sel) {
                        const range = doc.createRange();
                        range.selectNodeContents(doc.body);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    insertado = true;
                }
            } catch (e) {
                console.warn('[SDP Res] Error iframe:', e);
            }
        }

        // 2. Textarea oculto
        const textarea = document.getElementById('form_req-form_resolution_content') || resolutionBox.querySelector('textarea[name="resolution.content"]');
        if (textarea) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            textarea.value = tempDiv.innerText || tempDiv.textContent || '';
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            insertado = true;
        }

        return insertado;
    }

    // =========================================================================
    // 🛠️ INYECCIÓN
    // =========================================================================
    function inyectarBotonResoluciones() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-res-select2-wrapper')) return;

        const toolbar = document.querySelector('#resolution\\.content_control .ze_SCmb > div');
        if (!toolbar) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-res-select2-wrapper';

        const choice = document.createElement('a');
        choice.className = 'sdp-res-choice';
        choice.href = 'javascript:void(0)';
        choice.tabIndex = -1;
        choice.innerHTML = `
            <span class="sdp-res-chosen">📝 Plantilla Resolución</span>
            <span class="sdp-res-arrow" role="presentation"><b role="presentation"></b></span>
        `;

        const drop = document.createElement('div');
        drop.className = 'sdp-res-drop';

        const searchDiv = document.createElement('div');
        searchDiv.className = 'sdp-res-search';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.autocomplete = 'off';
        searchInput.placeholder = 'Buscar resolución...';
        searchDiv.appendChild(searchInput);
        drop.appendChild(searchDiv);

        const resultsList = document.createElement('ul');
        resultsList.className = 'sdp-res-results';

        RESOLUCIONES.forEach(resItem => {
            const li = document.createElement('li');
            li.innerText = resItem.titulo;
            li.title = resItem.titulo;

            // Se usa mousedown para actuar antes de cualquier blur del editor
            li.addEventListener('mousedown', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                wrapper.classList.remove('is-open');

                const chosenSpan = choice.querySelector('.sdp-res-chosen');
                chosenSpan.innerText = '⏳ Aplicando...';

                await sobrescribirResolucion(resItem.obtenerTexto());

                choice.classList.add('is-done');
                chosenSpan.innerText = `✔ ${resItem.titulo.replace(/^[^\w]+/g, '').split(' ')[0] || 'Listo'}`;
                await wait(800);
                choice.classList.remove('is-done');
                chosenSpan.innerText = '📝 Plantilla Resolución';
            });

            resultsList.appendChild(li);
        });

        drop.appendChild(resultsList);
        wrapper.appendChild(choice);
        wrapper.appendChild(drop);

        // Búsqueda en vivo
        searchInput.addEventListener('input', () => {
            const filtro = searchInput.value.toLowerCase().trim();
            resultsList.querySelectorAll('li').forEach(li => {
                const coincide = li.innerText.toLowerCase().includes(filtro);
                li.style.display = coincide ? 'block' : 'none';
            });
        });

        // Toggle del desplegable
        const toggleMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('is-open');
            if (isOpen) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                setTimeout(() => searchInput.focus(), 60);
            }
        };

        choice.addEventListener('click', toggleMenu);
        choice.addEventListener('mousedown', (e) => e.stopPropagation());
        drop.addEventListener('mousedown', (e) => e.stopPropagation());

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('is-open');
            }
        });

        toolbar.appendChild(wrapper);
    }

    const observer = new MutationObserver(() => {
        inyectarBotonResoluciones();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const reaccionarRuta = () => requestAnimationFrame(inyectarBotonResoluciones);

    const wrapHistoryMethod = (method) => {
        const original = win.history[method];
        if (typeof original === 'function') {
            win.history[method] = function() {
                const res = original.apply(this, arguments);
                reaccionarRuta();
                return res;
            };
        }
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
    win.addEventListener('popstate', reaccionarRuta);

    if (document.readyState !== 'loading') {
        inyectarBotonResoluciones();
    } else {
        document.addEventListener('DOMContentLoaded', inyectarBotonResoluciones);
    }
})();
