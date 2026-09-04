// ==UserScript==
// @name         ServiceDesk - Plantillas para tickets
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Selector de plantillas idéntico a Select2 nativo con detección reactiva continua (SPA compatible)
// @author       Tú
// @match        https://servicedesk.helphone.com:8181/*
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================
    // ⚙️ CONFIGURACIÓN GLOBAL (Modificar aquí si cambia el técnico)
    // =========================================================================
    const TECNICO_DEFECTO = 'Juanma';

    function esModoValido() {
        const url = window.location.href;
        return url.includes('woMode=newWO') || url.includes('woMode=editWO');
    }

    // 1. Inyección de estilos clonados de Select2 nativo de SDP
    const cssId = 'sdp-templates-style';
    if (!document.getElementById(cssId)) {
        const cssClean = document.createElement('style');
        cssClean.id = cssId;
        cssClean.innerHTML = `
            /* Limpieza de errores en Select2 nativo */
            .select2-container .select2-choice,
            .select2-container.select2-dropdown-open .select2-choice,
            .control-holder, .spot-field {
                border-color: #cccccc !important;
                box-shadow: none !important;
                outline: none !important;
            }
            .has-error, .error, .spot-error, .mandatory-error, .f-error {
                border-color: #cccccc !important;
            }
            .error-message, .validation-error, .mandatory-msg, .help-block.error {
                display: none !important;
            }

            /* Contenedor del selector clonado */
            #sdp-select2-custom-wrapper {
                display: inline-block;
                position: relative;
                vertical-align: middle;
                margin-left: 15px;
                width: 220px;
                font-family: Arial, Helvetica, sans-serif;
                user-select: none;
            }

            /* Caja cerrada del Select2 */
            .sdp-s2-choice {
                display: block;
                height: 28px;
                padding: 0 0 0 8px;
                overflow: hidden;
                position: relative;
                border: 1px solid #d2d2d2;
                white-space: nowrap;
                line-height: 26px;
                color: #555555;
                text-decoration: none;
                border-radius: 3px;
                background-color: #fcfcfc;
                cursor: pointer;
                box-sizing: border-box;
                transition: border-color 0.15s;
            }

            .sdp-s2-choice:hover {
                border-color: #b0b0b0;
            }

            #sdp-select2-custom-wrapper.is-open .sdp-s2-choice {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
                border-color: #aaa;
                background: #fff;
            }

            .sdp-s2-chosen {
                margin-right: 26px;
                display: block;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                font-size: 12px;
                color: #444;
                font-weight: 500;
            }

            /* Flecha triangular */
            .sdp-s2-arrow {
                display: inline-block;
                width: 18px;
                height: 100%;
                position: absolute;
                right: 0;
                top: 0;
                border-left: 1px solid #e2e2e2;
                background: #f7f7f7;
                border-top-right-radius: 3px;
                border-bottom-right-radius: 3px;
            }

            .sdp-s2-arrow b {
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

            #sdp-select2-custom-wrapper.is-open .sdp-s2-arrow b {
                border-color: transparent transparent #666 transparent;
                border-width: 0 4px 4px 4px;
            }

            /* Menú desplegable Select2 */
            .sdp-s2-drop {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                background: #fff;
                border: 1px solid #aaa;
                border-top: 0;
                box-shadow: 0 4px 5px rgba(0, 0, 0, 0.15);
                border-radius: 0 0 3px 3px;
                z-index: 99999;
                display: none;
                box-sizing: border-box;
                margin-top: -1px;
                padding-top: 4px;
            }

            #sdp-select2-custom-wrapper.is-open .sdp-s2-drop {
                display: block;
            }

            /* Caja de búsqueda interior */
            .sdp-s2-search {
                padding: 4px 6px;
                position: relative;
            }

            .sdp-s2-search input {
                width: 100%;
                height: 26px;
                padding: 3px 20px 3px 6px;
                font-size: 12px;
                font-family: inherit;
                border: 1px solid #aaa;
                border-radius: 2px;
                outline: none;
                box-sizing: border-box;
                background: #fff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23999' d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E") no-repeat right 5px center;
                background-size: 13px 13px;
            }

            /* Lista de opciones */
            .sdp-s2-results {
                max-height: 230px;
                padding: 3px 0;
                margin: 0;
                overflow-x: hidden;
                overflow-y: auto;
                list-style: none;
            }

            .sdp-s2-results li {
                padding: 5px 8px;
                font-size: 12px;
                color: #333333;
                cursor: pointer;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 16px;
            }

            .sdp-s2-results li:hover,
            .sdp-s2-results li.is-highlighted {
                background-color: #c13b38 !important;
                color: #ffffff !important;
            }

            .sdp-s2-results::-webkit-scrollbar {
                width: 6px;
            }
            .sdp-s2-results::-webkit-scrollbar-thumb {
                background-color: #ccc;
                border-radius: 3px;
            }

            @keyframes sdpPulseChoice {
                0% { background-color: #e8f0fe; }
                50% { background-color: #c7dcfa; }
                100% { background-color: #e8f0fe; }
            }
            .sdp-s2-choice.is-running {
                animation: sdpPulseChoice 1s infinite;
                border-color: #2b78e4 !important;
                color: #1967d2 !important;
                pointer-events: none;
            }
        `;
        (document.head || document.documentElement).appendChild(cssClean);
    }

    const wait = ms => new Promise(res => setTimeout(res, ms));

    function getFechaHoy() {
        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    async function selectByName(inputName, textTarget) {
        if (!textTarget) return false;

        const input = document.querySelector(`input[name="${inputName}"], select[name="${inputName}"]`);
        if (!input) return false;

        const container = input.closest('.control-holder, .spot-form') || input.parentElement;
        const choice = container ? container.querySelector('.select2-choice') : null;

        if (!choice) return false;

        choice.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        choice.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        await wait(60);

        const searchInput = document.querySelector('#select2-drop:not(.select2-display-none) .select2-search input');
        if (searchInput) {
            searchInput.value = textTarget;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            await wait(70);
        }

        const results = Array.from(document.querySelectorAll('#select2-drop .select2-result-label'));
        const matched = results.find(r => r.innerText.trim().toLowerCase() === textTarget.toLowerCase()) ||
                        results.find(r => r.innerText.trim().toLowerCase().includes(textTarget.toLowerCase()));

        if (matched) {
            matched.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await wait(70);

            if (choice) choice.style.borderColor = '#cccccc';
            return true;
        } else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            await wait(40);
            return false;
        }
    }

    async function selectCascadeByName(inputName, textTarget, maxAttempts = 15) {
        for (let i = 0; i < maxAttempts; i++) {
            const ok = await selectByName(inputName, textTarget);
            if (ok) return true;
            await wait(110);
        }
        return false;
    }

    async function seleccionarSolicitante(criterio) {
        if (!criterio) return false;

        const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const originalConfirm = targetWindow.confirm;
        targetWindow.confirm = function() { return false; };

        const scriptIntercept = document.createElement('script');
        scriptIntercept.textContent = `
            window._originalConfirm = window._originalConfirm || window.confirm;
            window.confirm = function() { return false; };
        `;
        (document.head || document.documentElement).appendChild(scriptIntercept);
        scriptIntercept.remove();

        try {
            const reqInput = document.querySelector('input[name="requester"], select[name="requester"]');
            const container = reqInput ? reqInput.closest('.control-holder, .spot-form, td') : null;
            const choice = container ? container.querySelector('.select2-choice') : document.querySelector('.select2-choice');

            if (!choice) return false;

            choice.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            choice.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            await wait(70);

            const searchInput = document.querySelector('#select2-drop .select2-search input');
            if (!searchInput) return false;

            const textoTeclear = criterio.includes('@') ? criterio.split('@')[0].replace('.', ' ') : criterio;
            searchInput.value = textoTeclear;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

            for (let i = 0; i < 18; i++) {
                await wait(90);
                const results = Array.from(document.querySelectorAll('#select2-drop .select2-result-label'));
                if (!results.length) continue;

                let matched = null;

                if (criterio.includes('@')) {
                    matched = results.find(r => r.innerText.toLowerCase().includes(criterio.toLowerCase()));
                }

                if (!matched) {
                    matched = results.find(r => {
                        const txt = r.innerText.toLowerCase();
                        return txt.includes(criterio.toLowerCase()) && txt.includes('@') && !txt.includes('correo electrónico : n/d');
                    });
                }

                if (!matched) {
                    matched = results.find(r => r.innerText.toLowerCase().includes(criterio.toLowerCase()));
                }

                if (matched) {
                    matched.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    await wait(80);

                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

                    const cancelBtn = Array.from(document.querySelectorAll('input[type="button"], button, a')).find(el => {
                        const t = el.innerText ? el.innerText.trim().toLowerCase() : (el.value ? el.value.trim().toLowerCase() : '');
                        return t === 'cancelar' || t === 'cancel';
                    });
                    if (cancelBtn && cancelBtn.offsetParent !== null) {
                        cancelBtn.click();
                    }

                    await wait(80);
                    return true;
                }
            }

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
            return false;

        } finally {
            targetWindow.confirm = originalConfirm;
            const scriptRestore = document.createElement('script');
            scriptRestore.textContent = `if (window._originalConfirm) window.confirm = window._originalConfirm;`;
            (document.head || document.documentElement).appendChild(scriptRestore);
            scriptRestore.remove();
        }
    }

    function purgarBordesRojos() {
        const selectores = '.select2-choice, .select2-container, .control-holder, .spot-field';
        document.querySelectorAll(selectores).forEach(el => {
            el.classList.remove('has-error', 'error', 'mandatory-error', 'spot-error', 'f-error');
            el.style.setProperty('border-color', '#cccccc', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });
    }

    async function aplicarPreset(config) {
        if (config.asunto) {
            const subject = document.querySelector('input[name="subject"]');
            if (subject) {
                subject.value = config.asunto;
                subject.dispatchEvent(new Event('input', { bubbles: true }));
                subject.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        if (config.descripcion) {
            try {
                const iframes = Array.from(document.querySelectorAll('iframe'));
                for (let f of iframes) {
                    try {
                        const doc = f.contentDocument || (f.contentWindow && f.contentWindow.document);
                        if (doc && doc.body && (doc.body.classList.contains('ze_body') || doc.body.getAttribute('contenteditable') === 'true')) {
                            doc.body.innerHTML = `<div>${config.descripcion}</div>`;
                            doc.body.dispatchEvent(new Event('input', { bubbles: true }));

                            f.contentWindow.focus();
                            doc.body.focus();

                            const win = f.contentWindow;
                            const sel = win.getSelection();
                            if (sel) {
                                const range = doc.createRange();
                                range.selectNodeContents(doc.body);
                                range.collapse(false);
                                sel.removeAllRanges();
                                sel.addRange(range);
                            }
                            break;
                        }
                    } catch (e) {}
                }

                const hiddenTextarea = document.querySelector('textarea[name="description"], textarea[id*="description"]');
                if (hiddenTextarea) {
                    hiddenTextarea.value = config.descripcion;
                    hiddenTextarea.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } catch (e) {}
        }

        if (config.solicitante) await seleccionarSolicitante(config.solicitante);
        if (config.grupo)       await selectByName('udf_fields.udf_pick_2720', config.grupo);
        if (config.subgrupo)    await selectCascadeByName('udf_fields.udf_pick_2722', config.subgrupo);
        if (config.elemento)    await selectCascadeByName('udf_fields.udf_pick_2723', config.elemento);

        if (config.grupoAsignado) await selectByName('udf_fields.udf_pick_2726', config.grupoAsignado);
        if (config.tecnico)       await selectByName('technician', config.tecnico);
        if (config.tipoTicket)    await selectByName('udf_fields.udf_pick_2719', config.tipoTicket);
        if (config.viaTicket)     await selectByName('udf_fields.udf_pick_2724', config.viaTicket);
        if (config.ubicacion)     await selectByName('udf_fields.udf_pick_2725', config.ubicacion);
        if (config.proveedor)     await selectByName('udf_fields.udf_pick_2703', config.proveedor);
        if (config.estado)        await selectByName('status', config.estado);

        purgarBordesRojos();
    }

    // =========================================================================
    // 🎛️ DEFINICIÓN DE TUS PRESETS
    // =========================================================================
    const MIS_PRESETS = [
        {
            nombre: "✅ Alta Eduardo Infante",
            obtenerDatos: () => ({
                solicitante: 'eduardo.infante@cinfa.com',
                grupo: 'Administrativa',
                subgrupo: 'Usuario',
                elemento: 'Alta',
                grupoAsignado: 'Front Office',
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Usuario - Alta - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "✅ Alta Laura Moreno",
            obtenerDatos: () => ({
                solicitante: 'lmoreno@cinfa.com',
                grupo: 'Administrativa',
                subgrupo: 'Usuario',
                elemento: 'Alta',
                grupoAsignado: 'Front Office',
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Areta',
                asunto: 'Usuario - Alta - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "✅ Alta Itziar Sánchez",
            obtenerDatos: () => ({
                solicitante: 'isanchez@cinfa.com',
                grupo: 'Administrativa',
                subgrupo: 'Usuario',
                elemento: 'Alta',
                grupoAsignado: 'Front Office',
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Usuario - Alta - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🪑 Salas",
            obtenerDatos: () => ({
                grupo: 'Administrativa',
                subgrupo: 'Salas/Equipamiento Prest',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Sala {{Nombre de la sala}} - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "❌ Baja",
            obtenerDatos: () => ({
                grupo: 'Administrativa',
                subgrupo: 'Usuario',
                elemento: 'Baja',
                grupoAsignado: 'Front Office',
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Usuario - Baja - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "📩 Correo de SAP",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones corporativas',
                subgrupo: 'SAP',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Aplicaciones',
                tipoTicket: 'Incidencia',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'SAP - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "📩 Correo de GII",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones corporativas',
                subgrupo: 'GII/Comer',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Aplicaciones',
                tipoTicket: 'Incidencia',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'GII - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "📺 VDI",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones citrix',
                subgrupo: 'Escritorios virtuales',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Incidencia',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'VDI - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🍋‍🟩 Aplicaciones publicadas",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones citrix',
                subgrupo: 'Aplicaciones publicadas',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Incidencia',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: '{Nombre de la aplicación} - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🍋 Cliente Citrix",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones citrix',
                subgrupo: 'Cliente Citrix',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Incidencia',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Citrix - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "☢️ Líder NEO",
            obtenerDatos: () => ({
                solicitante: 'lider.neo@cinfa.com',
                grupo: 'Aplicaciones corporativas',
                subgrupo: 'NEO',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Aplicaciones Neo',
                tecnico: 'Soporte Neo',
                tipoTicket: 'Incidencia',
                viaTicket: 'Correo electrónico',
                ubicacion: 'NEO',
                asunto: 'NEO - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "💻 Hardware (portátil)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Portatil',
                elemento: 'Configuracion',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Portatil - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🖨️ Hardware (impresora)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Impresora',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Impresora - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🖨️ Hardware (etiquetadora)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Etiquetadora',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Etiquetadora - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "⚒️ Hardware (accesorios)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Accesorios (material)',
                elemento: 'Configuracion',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Accesorios - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "📺 Hardware (pantalla)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Pantalla',
                elemento: 'Configuracion',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Pantalla - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "⚒️ Hardware (servidores)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Servidores',
                elemento: 'Configuracion',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Servidor - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "💁 Delegado (portátil delegado)",
            obtenerDatos: () => ({
                grupo: 'Hardware',
                subgrupo: 'Portatil delegados',
                elemento: 'Configuracion',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Portatil delegado - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "😭 Recuperación de datos",
            obtenerDatos: () => ({
                grupo: 'Monitorización',
                subgrupo: 'Backup/restore',
                elemento: 'Recuperacion datos',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Backup - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "©️ Docuware (eliminar contrato)",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones corporativas',
                subgrupo: 'Docuware web',
                elemento: 'Eliminacion contratos',
                grupoAsignado: 'Aplicaciones',
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Docuware - Eliminar contrato',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "©️ Docuware (estado de firmas)",
            obtenerDatos: () => ({
                grupo: 'Aplicaciones corporativas',
                subgrupo: 'Docuware web',
                elemento: 'Estados de firma',
                grupoAsignado: 'Aplicaciones',
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Docuware - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🛜 LAN/WAN",
            obtenerDatos: () => ({
                grupo: 'Comunicaciones',
                subgrupo: 'LAN/WAN',
                elemento: 'Configuracion-NAC',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Red - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🛜 Parchear tomas de red",
            obtenerDatos: () => ({
                grupo: 'Comunicaciones',
                subgrupo: 'LAN/WAN',
                elemento: 'Instalacion-parcheado tomas',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Red - Parchear tomas',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "📱 Móviles (general)",
            obtenerDatos: () => ({
                grupo: 'Comunicaciones',
                subgrupo: 'Telefonia',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Movil - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "📱 Móviles (roaming)",
            obtenerDatos: () => ({
                grupo: 'Comunicaciones',
                subgrupo: 'Telefonia',
                elemento: 'Roaming',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Movil - Solicitud de Roaming',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🈲 VPN (general)",
            obtenerDatos: () => ({
                grupo: 'Comunicaciones',
                subgrupo: 'VPN',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Aplicaciones',
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'VPN - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🈲 VPN (alta de usuarios)",
            obtenerDatos: () => ({
                grupo: 'Comunicaciones',
                subgrupo: 'VPN',
                elemento: 'Gestion usuarios',
                grupoAsignado: 'Aplicaciones',
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'VPN - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🅰️ Software (Adobe)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Adobe pro',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Adobe - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "♿ Software (navegadores)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Navegadores chrome y edge',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Chrome - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "♿ Software (Office)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Office M365',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Office - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🚮 Software (Contraseña de Windows)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Sistema Operativo',
                elemento: 'Usuario/contraseña',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Petición',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Windows - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "👨‍🦽‍➡️ Software (Windows)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Sistema Operativo',
                elemento: 'Usuario/contraseña',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: 'Windows - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🥽 Software (ofimática general)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Ofimatica general',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: '{{Nombre del programa}} - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        },
        {
            nombre: "🥽 Software (webs corporativas y certificados)",
            obtenerDatos: () => ({
                grupo: 'Software',
                subgrupo: 'Webs corp. y certificados',
                elemento: 'Funcionamiento',
                grupoAsignado: 'Front Office',
                tecnico: TECNICO_DEFECTO,
                tipoTicket: 'Consulta',
                viaTicket: 'Correo electrónico',
                ubicacion: 'Olloki',
                asunto: '{{Nombre del de la web}} - ',
                descripcion: `<b>${getFechaHoy()} ${TECNICO_DEFECTO}</b><br><br>`
            })
        }
    ];

    // =========================================================================
    // 🖥️ INYECCIÓN NATIVA SELECT2 CLONADO AL LADO DE SOLICITANTE
    // =========================================================================
    function inyectarSelect2Plantillas() {
        if (!esModoValido()) return;
        if (document.getElementById('sdp-select2-custom-wrapper')) return;

        const requesterRightCol = document.querySelector('.col-fields[data-fname="requester"] .right-col .col-xs-12');
        if (!requesterRightCol) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'sdp-select2-custom-wrapper';
        wrapper.className = 'fl';

        const choice = document.createElement('a');
        choice.className = 'sdp-s2-choice';
        choice.href = 'javascript:void(0)';
        choice.tabIndex = -1;
        choice.innerHTML = `
            <span class="sdp-s2-chosen">⚡ Plantillas</span>
            <span class="sdp-s2-arrow" role="presentation"><b role="presentation"></b></span>
        `;

        const drop = document.createElement('div');
        drop.className = 'sdp-s2-drop';

        const searchDiv = document.createElement('div');
        searchDiv.className = 'sdp-s2-search';
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.autocomplete = 'off';
        searchInput.placeholder = '';
        searchDiv.appendChild(searchInput);
        drop.appendChild(searchDiv);

        const resultsList = document.createElement('ul');
        resultsList.className = 'sdp-s2-results';

        let isExecuting = false;

        MIS_PRESETS.forEach(preset => {
            const li = document.createElement('li');
            li.innerText = preset.nombre;
            li.title = `Rellenar con: ${preset.nombre}`;

            li.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isExecuting) return;

                isExecuting = true;
                wrapper.classList.remove('is-open');

                const chosenSpan = choice.querySelector('.sdp-s2-chosen');
                choice.classList.add('is-running');
                chosenSpan.innerText = '⏳ Aplicando...';

                try {
                    await aplicarPreset(preset.obtenerDatos());
                    chosenSpan.innerText = `✔ ${preset.nombre.split(' ')[1] || 'Aplicado'}`;
                    await wait(600);
                } catch (err) {
                    console.error('[SDP] Error al aplicar plantilla:', err);
                } finally {
                    choice.classList.remove('is-running');
                    chosenSpan.innerText = '⚡ Plantillas';
                    isExecuting = false;
                }
            });

            resultsList.appendChild(li);
        });

        drop.appendChild(resultsList);
        wrapper.appendChild(choice);
        wrapper.appendChild(drop);

        searchInput.addEventListener('input', () => {
            const filtro = searchInput.value.toLowerCase().trim();
            resultsList.querySelectorAll('li').forEach(li => {
                const coincide = li.innerText.toLowerCase().includes(filtro);
                li.style.display = coincide ? 'block' : 'none';
            });
        });

        choice.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isExecuting) return;

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

        requesterRightCol.appendChild(wrapper);
    }

    // Observador reactivo puro sobre el DOM (sin timeouts fijos que expiren)
    const observer = new MutationObserver(() => {
        inyectarSelect2Plantillas();
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Intercepción para navegación interna SPA
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const reaccionarRuta = () => requestAnimationFrame(inyectarSelect2Plantillas);

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
        inyectarSelect2Plantillas();
    } else {
        document.addEventListener('DOMContentLoaded', inyectarSelect2Plantillas);
    }

})();
