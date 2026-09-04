// ==UserScript==
// @name         ServiceDesk - Añadir cabecera a la descripción
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Inyección reactiva pura del botón de cabecera bajo Descripción tanto en edición como en creación de tickets
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @updateURL    https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-cabecera.user.js
// @downloadURL  https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/servicedesk-cabecera.user.js
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // ⚙️ CONFIGURACIÓN GLOBAL (Modificar aquí si cambia el técnico)
    // =========================================================================
    const TECNICO_DEFECTO = 'Juanma';

    function getFechaHoy() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    // Permite la ejecución tanto en edición (editWO) como en creación (newWO)
    function esModoValido() {
        const url = window.location.href;
        return url.includes('woMode=editWO') || url.includes('woMode=newWO');
    }

    // Inyección inmediata de CSS para evitar reflows
    const cssId = 'sdp-header-btn-style';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
            .sdp-btn-container-desc {
                display: flex !important;
                flex-direction: column !important;
                align-items: flex-end !important;
                margin-top: 8px !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }

            .sdp-btn-insert-header {
                background-color: #f7f7f7;
                border: 1px solid #d2d2d2;
                color: #444444;
                padding: 2px 7px;
                font-size: 11px;
                font-weight: 600;
                border-radius: 3px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                height: 24px;
                box-sizing: border-box;
                line-height: 1;
                font-family: inherit;
                white-space: nowrap;
                transition: all 0.15s ease;
                user-select: none;
            }

            .sdp-btn-insert-header:hover {
                background-color: #ededed;
                border-color: #b5b5b5;
                color: #111111;
            }

            .sdp-btn-insert-header:active {
                transform: translateY(1px);
            }

            .sdp-btn-insert-header.is-done {
                background-color: #e6f4ea !important;
                border-color: #34a853 !important;
                color: #137333 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(estilo);
    }

    function insertarCabeceraEncima() {
        const fechaHoy = getFechaHoy();
        const textoCabecera = `<b>${fechaHoy} ${TECNICO_DEFECTO}</b><div><br></div><div><br></div><div><br></div>`;

        const iframes = Array.from(document.querySelectorAll('iframe'));
        let editorEncontrado = false;

        for (let f of iframes) {
            try {
                const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                    const contenidoActual = doc.body.innerHTML;

                    doc.body.innerHTML = `${textoCabecera}${contenidoActual}`;
                    doc.body.dispatchEvent(new Event('input', { bubbles: true }));

                    f.contentWindow.focus();
                    doc.body.focus();

                    const win = f.contentWindow;
                    const sel = win.getSelection();
                    if (sel) {
                        const range = doc.createRange();
                        const saltos = doc.body.querySelectorAll('div');
                        const objetivo = saltos.length > 1 ? saltos[1] : saltos[0];

                        if (objetivo) {
                            range.selectNodeContents(objetivo);
                            range.collapse(true);
                        } else {
                            range.selectNodeContents(doc.body);
                            range.collapse(true);
                        }

                        sel.removeAllRanges();
                        sel.addRange(range);
                    }

                    editorEncontrado = true;
                    break;
                }
            } catch (e) {}
        }

        const hiddenTextarea = document.querySelector('textarea[name="description"], textarea[id*="description"]');
        if (hiddenTextarea) {
            const contenidoPrevio = hiddenTextarea.value || '';
            hiddenTextarea.value = `${fechaHoy} ${TECNICO_DEFECTO}\n\n\n${contenidoPrevio}`;
            hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
            if (!editorEncontrado) {
                hiddenTextarea.focus();
                const posSegundoSalto = (`${fechaHoy} ${TECNICO_DEFECTO}\n\n`).length;
                hiddenTextarea.setSelectionRange(posSegundoSalto, posSegundoSalto);
            }
        }
    }

    // Inyección reactiva basada en nodo
    function verificarYInyectar(targetNode) {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-btn-insert-header')) return;

        let labelDesc = null;
        if (targetNode && targetNode.matches && targetNode.matches('label[for="for_description"], label[data-title="description"]')) {
            labelDesc = targetNode;
        } else if (targetNode && targetNode.querySelector) {
            labelDesc = targetNode.querySelector('label[for="for_description"], label[data-title="description"]');
        } else {
            labelDesc = document.querySelector('label[for="for_description"], label[data-title="description"]');
        }

        if (!labelDesc) return;

        const container = document.createElement('div');
        container.className = 'sdp-btn-container-desc';

        const btn = document.createElement('button');
        btn.id = 'sdp-btn-insert-header';
        btn.type = 'button';
        btn.className = 'sdp-btn-insert-header';
        btn.innerHTML = `<span>➕ Cabecera (${TECNICO_DEFECTO})</span>`;
        btn.title = 'Insertar fecha y técnico al principio';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            insertarCabeceraEncima();

            btn.classList.add('is-done');
            btn.innerHTML = `<span>✔ Añadido</span>`;
            setTimeout(() => {
                btn.classList.remove('is-done');
                btn.innerHTML = `<span>➕ Cabecera (${TECNICO_DEFECTO})</span>`;
            }, 800);
        });

        container.appendChild(btn);
        labelDesc.appendChild(container);
    }

    // 1. Observador reactivo continuo sobre inserciones DOM
    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const addedNodes = mutations[i].addedNodes;
            for (let j = 0; j < addedNodes.length; j++) {
                const node = addedNodes[j];
                if (node.nodeType === 1) {
                    verificarYInyectar(node);
                }
            }
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // 2. Intercepción en el contexto nativo (unsafeWindow) para navegación SPA
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const reaccionarCambioRuta = () => {
        requestAnimationFrame(() => verificarYInyectar(document));
    };

    const wrapHistoryMethod = (method) => {
        const original = win.history[method];
        if (typeof original === 'function') {
            win.history[method] = function() {
                const result = original.apply(this, arguments);
                reaccionarCambioRuta();
                return result;
            };
        }
    };

    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
    win.addEventListener('popstate', reaccionarCambioRuta);

    // Intento síncrono inicial
    if (document.readyState !== 'loading') {
        verificarYInyectar(document);
    } else {
        document.addEventListener('DOMContentLoaded', () => verificarYInyectar(document));
    }

})();
