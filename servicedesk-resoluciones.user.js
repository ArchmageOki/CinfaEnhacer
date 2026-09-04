// ==UserScript==
// @name         ServiceDesk - Plantillas de Resolución
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Selector Select2 con buscador integrado en la barra de herramientas del editor de resolución
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @updateURL    https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-resoluciones.user.js
// @downloadURL  https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-resoluciones.user.js
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
    // 🎨 ESTILOS INTEGRADOS (Toolbar + Desplegable Select2)
    // =========================================================================
    const cssId = 'sdp-res-templates-style';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
            /* Alinear la barra de herramientas como flex para mandar el botón a la derecha */
            #resolution\\.content_control .ze_SCmb > div {
                display: flex !important;
                flex-wrap: wrap !important;
                align-items: center !important;
            }

            #sdp-res-select2-wrapper {
                display: inline-block;
                position: relative;
                margin-left: auto !important; /* Lo empuja a la derecha de los iconos */
                margin-right: 5px !important;
                width: 210px;
                font-family: Arial, Helvetica, sans-serif;
                user-select: none;
                z-index: 100;
            }

            .sdp-res-choice {
                display: block;
                height: 24px;
                padding: 0 0 0 8px;
                overflow: hidden;
                position: relative;
                border: 1px solid #c9c9c9;
                white-space: nowrap;
                line-height: 22px;
                color: #444444;
                text-decoration: none;
                border-radius: 3px;
                background-color: #fafafa;
                cursor: pointer;
                box-sizing: border-box;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.15s ease;
            }

            .sdp-res-choice:hover {
                background-color: #f0f0f0;
                border-color: #a8a8a8;
                color: #111;
            }

            #sdp-res-select2-wrapper.is-open .sdp-res-choice {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-color: #aaa;
                background: #fff;
            }

            .sdp-res-chosen {
                margin-right: 22px;
                display: block;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }

            .sdp-res-arrow {
                display: inline-block;
                width: 18px;
                height: 100%;
                position: absolute;
                right: 0;
                top: 0;
                border-left: 1px solid #e0e0e0;
                background: #f4f4f4;
                border-top-right-radius: 2px;
                border-bottom-right-radius: 2px;
            }

            .sdp-res-arrow b {
                border-color: #666 transparent transparent transparent;
                border-style: solid;
                border-width: 4px 4px 0 4px;
                height: 0;
                left: 50%;
                margin-left: -4px;
                margin-top: -2px;
                position: absolute;
                top: 50%;
                width: 0;
            }

            #sdp-res-select2-wrapper.is-open .sdp-res-arrow b {
                border-color: transparent transparent #666 transparent;
                border-width: 0 4px 4px 4px;
            }

            .sdp-res-drop {
                position: absolute;
                top: 100%;
                right: 0;
                width: 240px;
                background: #fff;
                border: 1px solid #aaa;
                border-top: 0;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                border-radius: 0 0 3px 3px;
                z-index: 999999;
                display: none;
                box-sizing: border-box;
                margin-top: -1px;
                padding-top: 4px;
            }

            #sdp-res-select2-wrapper.is-open .sdp-res-drop {
                display: block;
            }

            .sdp-res-search {
                padding: 4px 6px;
            }

            .sdp-res-search input {
                width: 100%;
                height: 24px;
                padding: 2px 6px;
                font-size: 11px;
                font-family: inherit;
                border: 1px solid #aaa;
                border-radius: 2px;
                outline: none;
                box-sizing: border-box;
            }

            .sdp-res-results {
                max-height: 200px;
                padding: 3px 0;
                margin: 0;
                overflow-x: hidden;
                overflow-y: auto;
                list-style: none;
            }

            .sdp-res-results li {
                padding: 5px 8px;
                font-size: 11px;
                color: #333;
                cursor: pointer;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 16px;
            }

            .sdp-res-results li:hover,
            .sdp-res-results li.is-highlighted {
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
    // 📝 PLANTILLAS DE RESOLUCIÓN (Personaliza tus textos aquí)
    // =========================================================================
    const RESOLUCIONES = [
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
    // 💉 INSERCIÓN Y SOBRESCRITURA DEL CONTENIDO
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
                console.warn('[SDP Res] Error accediendo al iframe:', e);
            }
        }

        // 2. Sobrescribir textarea oculto nativo de sincronización
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
    // 🛠️ INYECCIÓN DEL DESPLEGABLE EN LA BARRA DE HERRAMIENTAS
    // =========================================================================
    function inyectarBotonResoluciones() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-res-select2-wrapper')) return;

        // Contenedor exacto de la barra de botones del editor de resolución
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

            li.addEventListener('click', async (e) => {
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

        // Apertura / Cierre
        choice.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = wrapper.classList.toggle('is-open');
            if (isOpen) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                setTimeout(() => searchInput.focus(), 60);
            }
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                wrapper.classList.remove('is-open');
            }
        });

        toolbar.appendChild(wrapper);
    }

    // Observador continuo para páginas dinámicas SPA
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
