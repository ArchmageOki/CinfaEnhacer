// ==UserScript==
// @name         ServiceDesk - Plantillas de Resolución
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Selector Select2 perfectamente alineado en la barra de herramientas del editor Ze
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
    // 🎨 ESTILOS INTEGRADOS Y ENCUADRE
    // =========================================================================
    const cssId = 'sdp-res-toolbar-style';
    if (!document.getElementById(cssId)) {
        const estilo = document.createElement('style');
        estilo.id = cssId;
        estilo.innerHTML = `
            /* Asegurar referencia de posición en la barra de herramientas */
            #resolution\\.content_control .ze_SCmb {
                position: relative !important;
            }

            #sdp-res-select2-wrapper {
                position: absolute !important;
                right: 6px !important;
                top: 2px !important;
                width: 175px !important;
                height: 22px !important;
                font-family: Arial, Helvetica, sans-serif !important;
                user-select: none !important;
                z-index: 100 !important;
            }

            .sdp-res-choice {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                height: 22px !important;
                padding: 0 6px !important;
                border: 1px solid #c9c9c9 !important;
                border-radius: 2px !important;
                background-color: #fafafa !important;
                color: #333 !important;
                text-decoration: none !important;
                cursor: pointer !important;
                box-sizing: border-box !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                line-height: 20px !important;
                transition: all 0.15s ease !important;
            }

            .sdp-res-choice:hover {
                background-color: #f0f0f0 !important;
                border-color: #888888 !important;
                color: #000 !important;
            }

            .sdp-res-chosen {
                overflow: hidden !important;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
                padding-right: 4px !important;
            }

            .sdp-res-arrow {
                display: inline-block !important;
                width: 0 !important;
                height: 0 !important;
                border-left: 4px solid transparent !important;
                border-right: 4px solid transparent !important;
                border-top: 4px solid #555555 !important;
                margin-left: 2px !important;
                flex-shrink: 0 !important;
            }

            /* Desplegable portal anclado a pantalla completa */
            #sdp-res-portal-drop {
                position: fixed !important;
                width: 240px !important;
                background: #ffffff !important;
                border: 1px solid #999999 !important;
                box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important;
                border-radius: 3px !important;
                z-index: 2147483647 !important;
                display: none;
                box-sizing: border-box !important;
                padding: 4px !important;
                font-family: Arial, Helvetica, sans-serif !important;
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
                margin-bottom: 3px !important;
            }

            .sdp-res-results {
                max-height: 220px !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                list-style: none !important;
            }

            .sdp-res-results li {
                padding: 5px 8px !important;
                font-size: 11px !important;
                color: #333 !important;
                cursor: pointer !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                line-height: 16px !important;
                border-radius: 2px !important;
            }

            .sdp-res-results li:hover {
                background-color: #c13b38 !important;
                color: #ffffff !important;
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
            titulo: "✳️ Instrucciones de TIM",
            obtenerTexto: () => `Para cambiar tu contraseña debes acceder a TIM desde el siguiente enlace<br><br>
            http://virtualpassword.cinfa.com/Tim/Index<br><br>
            Deberás iniciar sesión con el número de tu tarjeta blanca de Cinfa y tu DNI con la letra mayúscula.<br>
            Dentro de TIM tienes las siguientes opciones:<br>
            -Windows: para cambiar tu contraseña de Windows, Gmail y acceso al escritorio virtual<br>
            -GII<br>
            -SAP<br>
            -Intranet: para cambiar tu contraseña de la intranet de aplicaciones (la del fondo morado)<br><br>
            La contraseña de Windows e Intranet debe cumplir los siguientes requisitos:<br><br>
            -Al menos 12 caracteres<br>
            -Al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial. No admite algunos caracteres como ñ, ¡, ¿ o letras acentuadas<br>
            -No puede contener tu nombre o apellidos, tampoco palabras comunes completas<br><br>
            La contraseña de GII y SAP debe tener entre 8 y 12 caracteres de longitud y no tiene los requisitos anteriores.`
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
    // 💉 SOBRESCRITURA DE RESOLUCIÓN
    // =========================================================================
    
async function sobrescribirResolucion(htmlContent) {
        const resolutionBox = document.getElementById('rf-resolutionBox') || document.querySelector('.desc-row[data-fname="resolution.content"]');
        if (!resolutionBox) return false;

        let insertado = false;

        // 1. Intentar inyección a través de la API nativa de Zoho Editor (unsafeWindow)
        try {
            const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            const editorId = 'ze_form_req-form_resolution_content';
            
            if (targetWin.ZE && typeof targetWin.ZE.getEditor === 'function') {
                const zeInst = targetWin.ZE.getEditor(editorId);
                if (zeInst && typeof zeInst.setContent === 'function') {
                    zeInst.setContent(htmlContent);
                    insertado = true;
                }
            }
        } catch (e) {
            console.warn('[SDP Res] Error usando API nativa ZE:', e);
        }

        // 2. Inyección directa en el cuerpo editable del iframe con comandos de ejecución nativos
        const iframe = resolutionBox.querySelector('iframe.ze_area') || resolutionBox.querySelector('iframe');
        if (iframe) {
            try {
                const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                const win = iframe.contentWindow;

                if (doc && doc.body) {
                    const editableBody = doc.body.classList.contains('ze_body') ? doc.body : (doc.querySelector('.ze_body') || doc.body);

                    win.focus();
                    editableBody.focus();

                    // Seleccionar todo el contenido previo para sobrescribir
                    const sel = win.getSelection();
                    if (sel) {
                        const range = doc.createRange();
                        range.selectNodeContents(editableBody);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }

                    // Intentar sustitución mediante execCommand para disparar eventos internos del editor
                    let cmdSuccess = false;
                    try {
                        cmdSuccess = doc.execCommand('insertHTML', false, htmlContent);
                    } catch (cmdErr) {
                        cmdSuccess = false;
                    }

                    // Respaldo manual si execCommand falla
                    if (!cmdSuccess) {
                        editableBody.innerHTML = htmlContent ? `<div>${htmlContent}</div>` : '<div><br></div>';
                    }

                    // Disparar ciclo completo de eventos de mutación
                    editableBody.dispatchEvent(new Event('beforeinput', { bubbles: true }));
                    editableBody.dispatchEvent(new Event('input', { bubbles: true }));
                    editableBody.dispatchEvent(new Event('change', { bubbles: true }));
                    editableBody.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

                    // Posicionar el cursor al final del texto insertado
                    if (sel) {
                        const range = doc.createRange();
                        range.selectNodeContents(editableBody);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }

                    insertado = true;
                }
            } catch (e) {
                console.warn('[SDP Res] Error accediendo al iframe de resolución:', e);
            }
        }

        // 3. Sincronización del Textarea oculto de formulario
        const textarea = document.getElementById('form_req-form_resolution_content') || resolutionBox.querySelector('textarea[name="resolution.content"]');
        if (textarea) {
            textarea.value = htmlContent;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            insertado = true;
        }

        return insertado;
    }
    // =========================================================================
    // 🛠️ PORTAL FLOTANTE ROBUSTO
    // =========================================================================
    let portalDrop = null;
    let portalInput = null;
    let portalList = null;
    let activeChoiceBtn = null;

    function crearPortal() {
        if (portalDrop) return portalDrop;

        portalDrop = document.createElement('div');
        portalDrop.id = 'sdp-res-portal-drop';

        const searchDiv = document.createElement('div');
        searchDiv.className = 'sdp-res-search';
        portalInput = document.createElement('input');
        portalInput.type = 'text';
        portalInput.autocomplete = 'off';
        portalInput.placeholder = 'Buscar resolución...';
        searchDiv.appendChild(portalInput);
        portalDrop.appendChild(searchDiv);

        portalList = document.createElement('ul');
        portalList.className = 'sdp-res-results';

        RESOLUCIONES.forEach(resItem => {
            const li = document.createElement('li');
            li.innerText = resItem.titulo;
            li.title = resItem.titulo;

            li.addEventListener('mousedown', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                cerrarPortal();

                if (activeChoiceBtn) {
                    const chosenSpan = activeChoiceBtn.querySelector('.sdp-res-chosen');
                    chosenSpan.innerText = '⏳ Aplicando...';

                    await sobrescribirResolucion(resItem.obtenerTexto());

                    activeChoiceBtn.classList.add('is-done');
                    chosenSpan.innerText = `✔ ${resItem.titulo.replace(/^[^\w]+/g, '').split(' ')[0] || 'Listo'}`;
                    await wait(800);
                    activeChoiceBtn.classList.remove('is-done');
                    chosenSpan.innerText = '📝 Resolución';
                }
            });

            portalList.appendChild(li);
        });

        portalDrop.appendChild(portalList);

        portalInput.addEventListener('input', () => {
            const filtro = portalInput.value.toLowerCase().trim();
            portalList.querySelectorAll('li').forEach(li => {
                const coincide = li.innerText.toLowerCase().includes(filtro);
                li.style.display = coincide ? 'block' : 'none';
            });
        });

        portalDrop.addEventListener('mousedown', (e) => e.stopPropagation());
        portalDrop.addEventListener('click', (e) => e.stopPropagation());

        document.body.appendChild(portalDrop);

        // Cierre solo si se hace clic fuera del portal y fuera del botón activo
        document.addEventListener('mousedown', (e) => {
            if (!portalDrop || portalDrop.style.display !== 'block') return;
            if (!portalDrop.contains(e.target) && (!activeChoiceBtn || !activeChoiceBtn.contains(e.target))) {
                cerrarPortal();
            }
        });

        return portalDrop;
    }

    function abrirPortal(choiceBtn) {
        crearPortal();
        activeChoiceBtn = choiceBtn;

        const rect = choiceBtn.getBoundingClientRect();
        portalDrop.style.top = `${rect.bottom + 2}px`;
        portalDrop.style.left = `${Math.max(10, rect.right - 240)}px`;
        portalDrop.style.display = 'block';

        portalInput.value = '';
        portalInput.dispatchEvent(new Event('input'));
        setTimeout(() => portalInput.focus(), 60);
    }

    function cerrarPortal() {
        if (portalDrop) {
            portalDrop.style.display = 'none';
            activeChoiceBtn = null;
        }
    }

    // =========================================================================
    // 🛠️ INYECCIÓN
    // =========================================================================
    function inyectarBotonResoluciones() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-res-select2-wrapper')) return;

        // Anclamos exactamente a la barra de herramientas del editor Ze de resolución
        const toolbar = document.querySelector('#resolution\\.content_control .ze_SCmb');
        if (!toolbar) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-res-select2-wrapper';

        const choice = document.createElement('a');
        choice.className = 'sdp-res-choice';
        choice.href = 'javascript:void(0)';
        choice.tabIndex = -1;
        choice.innerHTML = `
            <span class="sdp-res-chosen">📝 Resolución</span>
            <span class="sdp-res-arrow"></span>
        `;

        // Intercepción en mousedown para adelantarnos al blur del editor Ze
        choice.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (portalDrop && portalDrop.style.display === 'block' && activeChoiceBtn === choice) {
                cerrarPortal();
            } else {
                abrirPortal(choice);
            }
        });

        wrapper.appendChild(choice);
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
