// ==UserScript==
// @name         Vozitel - Copiar Correo con Imágenes para ServiceDesk
// @namespace    https://vozitel.com/
// @version      1.0
// @description  Captura imágenes incluso dentro de iframes y repara el correo al copiar (botón arrastrable)
// @match        https://apps7v20.vozitel.com/*
// @updateURL    https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/vozitel-copiar-correo.user.js
// @downloadURL  https://github.com/ArchmageOki/CinfaEnhacer/raw/refs/heads/main/vozitel-copiar-correo.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    function getRecordId() {
        const match = window.location.pathname.match(/\/records\/id\/(\d+)/);
        return match ? match[1] : 'default';
    }

    let lastRecordId = getRecordId();

    function getAllBase64Images(doc) {
        let results = [];
        try {
            const imgs = doc.querySelectorAll('img');
            imgs.forEach(img => {
                const src = img.getAttribute('src') || img.src || '';
                if (src.startsWith('data:image') && src.length > 100) {
                    if (!results.includes(src)) {
                        results.push(src);
                    }
                }
            });

            const iframes = doc.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                    if (iframeDoc) {
                        results = results.concat(getAllBase64Images(iframeDoc));
                    }
                } catch (e) {}
            });
        } catch (e) {
            console.warn('Error escaneando imágenes:', e);
        }
        return Array.from(new Set(results));
    }

    setInterval(() => {
        const currentRec = getRecordId();
        if (currentRec !== lastRecordId) {
            lastRecordId = currentRec;
            window._vozitel_cached_images = [];
            sessionStorage.removeItem('_vozitel_cached_imgs');
        }

        if (isReplying()) return;

        const found = getAllBase64Images(document);
        if (found.length > 0) {
            sessionStorage.setItem('_vozitel_cached_imgs', JSON.stringify(found));
            window._vozitel_cached_images = found;
        }
    }, 800);

    if (window.self !== window.top) {
        return;
    }

    function isReplying() {
        const replyButtons = Array.from(document.querySelectorAll('.btn-label, button, app-button'));
        const hasReplyAllButton = replyButtons.some(el => el.textContent && el.textContent.includes('Responder a Todos'));
        const hasToolbar = document.querySelector('.fr-toolbar') !== null;

        return hasToolbar && !hasReplyAllButton;
    }

    async function copyRichText(htmlContent, plainText) {
        let listenerApplied = false;
        const copyHandler = (e) => {
            e.preventDefault();
            e.clipboardData.setData('text/html', htmlContent);
            e.clipboardData.setData('text/plain', plainText);
            listenerApplied = true;
        };

        document.addEventListener('copy', copyHandler);
        const success = document.execCommand('copy');
        document.removeEventListener('copy', copyHandler);

        if (success && listenerApplied) return true;

        if (navigator.clipboard && window.ClipboardItem) {
            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
            const blobText = new Blob([plainText], { type: 'text/plain' });
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': blobHtml,
                    'text/plain': blobText
                })
            ]);
            return true;
        }

        throw new Error('No compatible con el portapapeles');
    }

    function extractSenderEmail() {
        const mailtos = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
        for (const a of mailtos) {
            const email = a.href.replace(/^mailto:/i, '').trim().split('?')[0];
            if (email && !email.toLowerCase().includes('helpdesk')) {
                return email;
            }
        }

        const allHtml = document.body.innerHTML;
        const matches = allHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        for (const email of matches) {
            const lower = email.toLowerCase();
            if (!lower.includes('helpdesk') && !lower.includes('vozitel') && !lower.includes('cinfa.com/')) {
                return email;
            }
        }

        return '';
    }

    function injectButton() {
        let btn = document.getElementById('btn-copiar-ticketera');

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-copiar-ticketera';
            btn.innerHTML = '📋 Copiar para ServiceDesk';

            const savedTop = localStorage.getItem('_vozitel_btn_top') || (window.innerHeight - 100) + 'px';
            const savedLeft = localStorage.getItem('_vozitel_btn_left') || (window.innerWidth - 240) + 'px';

            btn.style.cssText = `
                position: fixed;
                top: ${savedTop};
                left: ${savedLeft};
                z-index: 999999;
                background-color: #007bff;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 18px;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                cursor: grab;
                user-select: none;
                display: none;
                transition: background-color 0.2s;
            `;

            let isDragging = false;
            let startX = 0, startY = 0;
            let initialLeft = 0, initialTop = 0;
            let hasMoved = false;

            btn.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                isDragging = true;
                hasMoved = false;
                startX = e.clientX;
                startY = e.clientY;

                const rect = btn.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;

                btn.style.cursor = 'grabbing';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                if (Math.hypot(deltaX, deltaY) > 4) {
                    hasMoved = true;
                }

                let newLeft = initialLeft + deltaX;
                let newTop = initialTop + deltaY;

                newLeft = Math.max(10, Math.min(window.innerWidth - btn.offsetWidth - 10, newLeft));
                newTop = Math.max(10, Math.min(window.innerHeight - btn.offsetHeight - 10, newTop));

                btn.style.left = `${newLeft}px`;
                btn.style.top = `${newTop}px`;
            });

            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                btn.style.cursor = 'grab';

                if (hasMoved) {
                    localStorage.setItem('_vozitel_btn_top', btn.style.top);
                    localStorage.setItem('_vozitel_btn_left', btn.style.left);
                }
            });

            btn.onclick = async () => {
                if (hasMoved) return;

                const textarea = document.querySelector('textarea[name="TEXTO"]');

                if (!textarea || !textarea.value) {
                    btn.style.backgroundColor = '#dc3545';
                    btn.innerText = '⚠️ Pulsa primero "Responder a todos"';
                    setTimeout(() => {
                        btn.style.backgroundColor = '#007bff';
                        btn.innerText = '📋 Copiar para ServiceDesk';
                    }, 2500);
                    return;
                }

                let pool = window._vozitel_cached_images || [];
                if (pool.length === 0) {
                    try {
                        pool = JSON.parse(sessionStorage.getItem('_vozitel_cached_imgs') || '[]');
                    } catch(e) {}
                }

                let raw = textarea.value;

                // 1. Detectar el email del remitente si venía en el textarea o en la vista
                let detectedSenderEmail = '';
                const senderLineMatch = raw.match(/Remitente:([^\n\r<]+)(?:<|&lt;)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?(?:>|&gt;)?/i);
                if (senderLineMatch && senderLineMatch[2]) {
                    detectedSenderEmail = senderLineMatch[2];
                } else {
                    detectedSenderEmail = extractSenderEmail();
                }

                // 2. Normalizar la línea de Remitente preservando el salto de línea <br />
                raw = raw.replace(/Remitente:[^\n\r<]+(?:(?:<|&lt;)[^>\n\r]+(?:>|&gt;))?(?:<br\s*\/?>)?/i, (match) => {
                    const nameOnly = match.replace(/^Remitente:\s*/i, '').replace(/(?:<|&lt;).*$/, '').replace(/<br\s*\/?>/gi, '').trim();
                    const emailPart = detectedSenderEmail ? ` &lt;${detectedSenderEmail}&gt;` : '';
                    return `Remitente: ${nameOnly}${emailPart}<br />`;
                });

                // 3. Normalizar la línea de Destinatario preservando el salto de línea <br />
                raw = raw.replace(/Destinatario:[^\n\r<]+(?:(?:<|&lt;)[^>\n\r]+(?:>|&gt;))?(?:<br\s*\/?>)?/i, (match) => {
                    const nameOnly = match.replace(/^Destinatario:\s*/i, '').replace(/(?:<|&lt;).*$/, '').replace(/<br\s*\/?>/gi, '').trim();
                    const destEmail = 'helpdesk@cinfa.com';
                    return `Destinatario: ${nameOnly || 'HelpDesk CINFA'} &lt;${destEmail}&gt;<br />`;
                });

                // 4. Proteger cualquier otro correo entre <...>
                raw = raw.replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, '&lt;$1&gt;');

                let tempDiv = document.createElement('div');
                tempDiv.innerHTML = raw;

                const brokenImgs = tempDiv.querySelectorAll('img');
                let replacedCount = 0;

                brokenImgs.forEach((img) => {
                    if (img.closest('.gmail_signature, [class*="signature"], u')) {
                        return;
                    }

                    const src = img.getAttribute('src') || '';
                    if (!src.startsWith('data:image') || src.length < 100) {
                        if (pool[replacedCount]) {
                            img.setAttribute('src', pool[replacedCount]);
                            replacedCount++;
                        }
                    }
                });

                const finalHtml = tempDiv.innerHTML;
                const plainText = tempDiv.innerText;

                try {
                    await copyRichText(finalHtml, plainText);

                    btn.style.backgroundColor = '#28a745';
                    btn.innerText = `✅ ¡Copiado (${replacedCount} imágenes reparadas)!`;
                    setTimeout(() => {
                        btn.style.backgroundColor = '#007bff';
                        btn.innerText = '📋 Copiar para ServiceDesk';
                    }, 2500);
                } catch (err) {
                    console.error('Error al copiar:', err);
                    btn.style.backgroundColor = '#dc3545';
                    btn.innerText = '❌ Error al acceder al portapapeles';
                    setTimeout(() => {
                        btn.style.backgroundColor = '#007bff';
                        btn.innerText = '📋 Copiar para ServiceDesk';
                    }, 2500);
                }
            };

            document.body.appendChild(btn);
        }

        if (window.location.pathname.includes('/records/id/') && isReplying()) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    }

    setInterval(injectButton, 400);
})();
