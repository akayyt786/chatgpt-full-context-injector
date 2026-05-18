(function() {
    // Avoid double injection
    if (document.getElementById('cip-sidebar')) return;

    // Standard ignore patterns - highly optimized for modern projects to eliminate noise
    const defaultIgnores = 'node_modules, .git, .github, venv, .venv, env, .env, logs, log, __pycache__, pycache, dist, build, .next, .nuxt, .turbo, out, target, .DS_Store, Thumbs.db, .png, .jpg, .jpeg, .gif, .ico, .webp, .bin, .pdf, .zip, .tar, .gz, .mp4, .mp3, .wav, .mov, .dmg, .exe, .pkg';
    
    // Inject Toggle Trigger Button
    const trigger = document.createElement('div');
    trigger.id = 'cip-trigger';
    trigger.innerHTML = `
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
        </svg>
    `;
    document.body.appendChild(trigger);

    // Inject Sidebar DOM Structure
    const sidebar = document.createElement('div');
    sidebar.id = 'cip-sidebar';
    sidebar.innerHTML = `
        <div class="cip-header">
            <div class="cip-brand">
                <div class="cip-logo">C</div>
                <div class="cip-title">Context Injector</div>
            </div>
            <button class="cip-close" id="cip-close-btn">&times;</button>
        </div>

        <div class="cip-row">
            <span class="cip-row-label">Auto-Submit Chat</span>
            <label class="cip-switch">
                <input type="checkbox" id="cip-auto-submit" checked>
                <span class="cip-slider"></span>
            </label>
        </div>

        <!-- Filter Accordion -->
        <div>
            <div class="cip-accordion-header" id="cip-acc-btn">
                <span>⚙️ Filters (.ignore)</span>
                <span id="cip-acc-arrow">▼</span>
            </div>
            <div class="cip-accordion-content" id="cip-acc-content">
                <textarea id="cip-ignore-patterns" class="cip-ignore-box">${defaultIgnores}</textarea>
                <div style="text-align: right; margin-top: 4px; margin-bottom: 8px;">
                    <span id="cip-reset-ignores" style="font-size: 10px; color: #818cf8; cursor: pointer; text-decoration: underline; transition: color 0.2s;">Reset to defaults</span>
                </div>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="cip-stats">
            <div class="cip-stat-card">
                <div class="cip-stat-val" id="cip-stat-files">0</div>
                <div class="cip-stat-lbl">Files</div>
            </div>
            <div class="cip-stat-card">
                <div class="cip-stat-val" id="cip-stat-size">0 KB</div>
                <div class="cip-stat-lbl">Size</div>
            </div>
            <div class="cip-stat-card">
                <div class="cip-stat-val" id="cip-stat-tokens">0</div>
                <div class="cip-stat-lbl">Est. Tokens</div>
            </div>
        </div>

        <!-- Scanned File List (Interactive Checklist) -->
        <div class="cip-file-list" id="cip-files-view" style="display: none; max-height: 200px; overflow-y: auto;"></div>

        <!-- Hidden Webkit Directory Input -->
        <input type="file" id="cip-folder-input" webkitdirectory directory multiple style="display: none;">

        <button id="cip-scan-btn" class="cip-btn">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
            </svg>
            Select Workspace (Tree First)
        </button>

        <button id="cip-inject-selected-btn" class="cip-btn" style="display: none; margin-top: 10px; background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
            </svg>
            Inject Selected Files
        </button>

        <div class="cip-console">
            <div class="cip-console-header">
                <span>Injector Console</span>
                <span class="cip-pulse" id="cip-console-pulse"></span>
            </div>
            <div id="cip-log-output">Console ready. Click 'Select Workspace' to begin.</div>
        </div>
    `;
    document.body.appendChild(sidebar);

    // Dynamic Variables & State
    let scannedFiles = [];
    let rootFolderName = 'Workspace';
    
    const logOutput = document.getElementById('cip-log-output');
    const pulseDot = document.getElementById('cip-console-pulse');
    const ignoreBox = document.getElementById('cip-ignore-patterns');
    const autoSubmitSwitch = document.getElementById('cip-auto-submit');
    const filesView = document.getElementById('cip-files-view');
    const folderInput = document.getElementById('cip-folder-input');
    const injectSelectedBtn = document.getElementById('cip-inject-selected-btn');

    const statFiles = document.getElementById('cip-stat-files');
    const statSize = document.getElementById('cip-stat-size');
    const statTokens = document.getElementById('cip-stat-tokens');

    // UI Event Listeners
    trigger.addEventListener('click', toggleSidebar);
    document.getElementById('cip-close-btn').addEventListener('click', closeSidebar);

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        trigger.classList.toggle('sidebar-open');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        trigger.classList.remove('sidebar-open');
    }

    // Load saved settings
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['autoSubmit', 'ignorePatterns'], (result) => {
            if (result.autoSubmit !== undefined) autoSubmitSwitch.checked = result.autoSubmit;
            if (result.ignorePatterns !== undefined) ignoreBox.value = result.ignorePatterns;
            log('In-page settings restored.', 'success');
        });

        autoSubmitSwitch.addEventListener('change', () => {
            chrome.storage.local.set({ autoSubmit: autoSubmitSwitch.checked });
            log(`Auto-submit: ${autoSubmitSwitch.checked ? 'ENABLED' : 'DISABLED'}`);
        });

        ignoreBox.addEventListener('input', () => {
            chrome.storage.local.set({ ignorePatterns: ignoreBox.value });
        });
    }

    document.getElementById('cip-reset-ignores').addEventListener('click', () => {
        ignoreBox.value = defaultIgnores;
        if (chrome && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ignorePatterns: defaultIgnores });
        }
        log('Filters reset to optimized defaults.', 'success');
    });

    // Accordion Toggle
    const accBtn = document.getElementById('cip-acc-btn');
    const accContent = document.getElementById('cip-acc-content');
    const accArrow = document.getElementById('cip-acc-arrow');
    accBtn.addEventListener('click', () => {
        const isOpen = accContent.classList.contains('open');
        if (isOpen) {
            accContent.classList.remove('open');
            accArrow.textContent = '▼';
        } else {
            accContent.classList.add('open');
            accArrow.textContent = '▲';
        }
    });

    // Logger
    function log(msg, type = 'info') {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let className = 'cip-log-info';
        if (type === 'error') className = 'cip-log-err';
        if (type === 'warn') className = 'cip-log-warn';
        if (type === 'success') className = 'cip-log-success';

        logOutput.innerHTML += `\n<span class="${className}">[${time}] ${msg}</span>`;
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    function clearLog() {
        logOutput.innerHTML = '';
    }

    // Click trigger on hidden folder input
    document.getElementById('cip-scan-btn').addEventListener('click', () => {
        folderInput.click();
    });

    // Handle selected folder files change (Tree-First Strategy)
    folderInput.addEventListener('change', async (e) => {
        const rawFiles = Array.from(e.target.files);
        if (rawFiles.length === 0) return;

        clearLog();
        pulseDot.classList.add('running');
        injectSelectedBtn.style.display = 'none'; // hide secondary button during scan
        filesView.style.display = 'none';
        
        log(`Mapping workspace containing ${rawFiles.length} items...`, 'info');

        const ignoreList = ignoreBox.value
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        try {
            scannedFiles = [];
            rootFolderName = rawFiles[0]?.webkitRelativePath.split('/')[0] || 'Workspace';
            
            for (let i = 0; i < rawFiles.length; i++) {
                // YIELD TO MAIN THREAD EVERY 200 FILES - Prevents Browser Crashing completely!
                if (i % 200 === 0) await new Promise(r => setTimeout(r, 1)); 

                const file = rawFiles[i];
                const fullPath = file.webkitRelativePath;
                const pathParts = fullPath.split('/');
                const relativePath = pathParts.slice(1).join('/');

                const shouldSkip = ignoreList.some(pattern => {
                    const cleanPattern = pattern.toLowerCase();
                    const fileNameLower = file.name.toLowerCase();
                    const pathPartsLower = relativePath.toLowerCase().split('/');

                    if (cleanPattern.startsWith('.') && cleanPattern.length > 1) {
                        if (pathPartsLower.includes(cleanPattern)) return true;
                        return fileNameLower.endsWith(cleanPattern);
                    }
                    return fileNameLower === cleanPattern || pathPartsLower.includes(cleanPattern);
                });

                if (shouldSkip) continue;
                if (file.size > 100 * 1024) continue;

                // Extract a tiny micro-snippet for context without loading full file
                let preview = "";
                try {
                    const snippet = await file.slice(0, 300).text();
                    preview = snippet.split('\n').slice(0, 2).join(' ').replace(/\s+/g, ' ').trim();
                    if (preview.length > 100) preview = preview.substring(0, 100) + "...";
                } catch(e) {}

                scannedFiles.push({
                    fileObj: file, // Store the raw File object to read deferred later
                    path: relativePath,
                    size: file.size,
                    preview: preview,
                    selected: false // Tree first: don't auto select
                });
            }

            if (scannedFiles.length === 0) {
                log('Zero files matched search filter restrictions.', 'warn');
                return;
            }

            log(`Indexed ${scannedFiles.length} valid files without freezing.`, 'success');

            renderFileList();
            updateMetrics();
            
            injectSelectedBtn.style.display = 'flex'; // Reveal deferred injection button
            
            log('Injecting Tree Architecture to ChatGPT...', 'info');
            injectTreePayload();

        } catch (err) {
            log(`Error scanning folder: ${err.message}`, 'error');
            console.error(err);
        } finally {
            pulseDot.classList.remove('running');
            folderInput.value = '';
        }
    });

    // Handle "Inject Selected Files" button click
    injectSelectedBtn.addEventListener('click', async () => {
        const activeFiles = scannedFiles.filter(f => f.selected);
        if (activeFiles.length === 0) {
            log('Please check at least one file from the list above.', 'warn');
            return;
        }

        pulseDot.classList.add('running');
        log(`Reading contents of ${activeFiles.length} files...`, 'info');

        try {
            let payload = `Here is the code for the requested files:\n\n`;
            
            for (let i = 0; i < activeFiles.length; i++) {
                // Yield to main thread to prevent UI freezing while reading text
                if (i % 25 === 0) await new Promise(r => setTimeout(r, 1)); 
                
                const fileItem = activeFiles[i];
                const text = await fileItem.fileObj.text();
                
                payload += `--- BEGIN FILE: ${fileItem.path} ---\n`;
                payload += text;
                payload += `\n--- END FILE: ${fileItem.path} ---\n\n`;
                
                log(`Read: ${fileItem.path}`, 'success');
            }

            doInjection(payload);
        } catch (err) {
            log(`Failed to read files: ${err.message}`, 'error');
        } finally {
            pulseDot.classList.remove('running');
        }
    });

    // Render Scanned Files Checklist
    function renderFileList() {
        filesView.style.display = 'block';
        filesView.innerHTML = '';
        
        const renderCap = 150;
        const filesToRender = scannedFiles.slice(0, renderCap);
        
        filesToRender.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'cip-file-item';
            item.innerHTML = `
                <span class="cip-file-path" title="${file.path}">${file.path} (${(file.size / 1024).toFixed(1)} KB)</span>
                <input type="checkbox" data-index="${index}" ${file.selected ? 'checked' : ''}>
            `;
            
            item.querySelector('input').addEventListener('change', (e) => {
                scannedFiles[index].selected = e.target.checked;
                updateMetrics();
            });
            
            filesView.appendChild(item);
        });

        if (scannedFiles.length > renderCap) {
            const warning = document.createElement('div');
            warning.style.fontSize = '10px';
            warning.style.color = '#fbbf24';
            warning.style.padding = '6px';
            warning.style.textAlign = 'center';
            warning.style.borderTop = '1px solid var(--cip-border)';
            warning.textContent = `⚠️ Showing first ${renderCap} of ${scannedFiles.length} files for UI performance.`;
            filesView.appendChild(warning);
        }
    }

    function updateMetrics() {
        const activeFiles = scannedFiles.filter(f => f.selected);
        let totalBytes = 0;
        activeFiles.forEach(f => totalBytes += f.size);

        const totalKB = (totalBytes / 1024).toFixed(1);
        const estTokens = Math.round(totalBytes / 4);

        statFiles.textContent = activeFiles.length;
        statSize.textContent = `${totalKB} KB`;
        statTokens.textContent = estTokens.toLocaleString();
    }

    // Injects the initial tree payload
    function injectTreePayload() {
        let payload = `[ChatGPT Folder Connector Pro]\n`;
        payload += `Workspace Root: ${rootFolderName}\n`;
        payload += `I am working on this project. Here are the ${scannedFiles.length} files in my repository.\n`;
        payload += `Please review the structure and the brief code snippets provided for context.\n`;
        payload += `CRITICAL INSTRUCTION: If you need to see the full code of any file, you must request it by replying with exactly this format: [REQUEST_FILE: path/to/file.js]. The user's Autonomous Agent will automatically fetch it and inject it for you.\n\n`;
        payload += `Directory Structure:\n`;
        scannedFiles.forEach(f => {
            payload += ` - ${f.path} (${(f.size / 1024).toFixed(1)} KB)\n`;
            if (f.preview) payload += `   ↳ 📝 ${f.preview}\n`;
        });
        
        doInjection(payload);
    }

    // Core injection utility
    function doInjection(payload) {
        const promptEditor = document.querySelector('#prompt-textarea') || 
                             document.querySelector('textarea[placeholder*="Message"]') || 
                             document.querySelector('.chat-input');

        if (!promptEditor) {
            log('Error: Prompt input box not found on ChatGPT interface.', 'error');
            return;
        }

        promptEditor.focus();

        if (promptEditor.getAttribute('contenteditable') === 'true' || promptEditor.isContentEditable) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(promptEditor);
            selection.removeAllRanges();
            selection.addRange(range);
            
            document.execCommand('insertText', false, payload);
        } else {
            promptEditor.value = payload;
            promptEditor.dispatchEvent(new Event('input', { bubbles: true }));
            promptEditor.dispatchEvent(new Event('change', { bubbles: true }));
        }

        log('Payload successfully loaded into chat input!', 'success');

        if (autoSubmitSwitch.checked) {
            let retries = 0;
            const trySend = () => {
                const sendBtn = document.querySelector('button[data-testid="send-button"]') || 
                                document.querySelector('button[aria-label*="Send"]') || 
                                promptEditor.parentElement.querySelector('button');
                                
                if (sendBtn && !sendBtn.disabled) {
                    sendBtn.click();
                    log('Chat submitted automatically.', 'success');
                } else if (retries < 30) {
                    retries++;
                    setTimeout(trySend, 1000); // Wait 1 second and try again (in case ChatGPT is still generating)
                }
            };
            setTimeout(trySend, 300);
        }
    }

    // ==========================================
    // Autonomous Agent Loop (Auto-Fetch Files)
    // ==========================================
    const requestedFilesCache = new Set();

    setInterval(async () => {
        if (!autoSubmitSwitch.checked || scannedFiles.length === 0) return;

        const assistantMessages = document.querySelectorAll('div[data-message-author-role="assistant"]');
        let filesToInject = [];

        assistantMessages.forEach(msg => {
            const text = msg.textContent;
            const regex = /\[REQUEST_FILE:\s*(.+?)\]/g;
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                const filePath = match[1].trim();
                if (!requestedFilesCache.has(filePath)) {
                    requestedFilesCache.add(filePath);
                    
                    const fileObj = scannedFiles.find(f => f.path === filePath);
                    if (fileObj && !fileObj.selected) {
                        filesToInject.push(fileObj);
                    }
                }
            }
        });

        if (filesToInject.length > 0) {
            log(`Agent detected file request! Auto-fetching ${filesToInject.length} files...`, 'success');
            pulseDot.classList.add('running');
            
            let payload = `[Autonomous Agent Auto-Fetch]\nHere is the full code for the requested files:\n\n`;
            for (let f of filesToInject) {
                const text = await f.fileObj.text();
                payload += `--- BEGIN FILE: ${f.path} ---\n${text}\n--- END FILE: ${f.path} ---\n\n`;
                f.selected = true; // Update UI state
            }
            
            renderFileList();
            updateMetrics();
            doInjection(payload);
            pulseDot.classList.remove('running');
        }
    }, 2500);

})();
