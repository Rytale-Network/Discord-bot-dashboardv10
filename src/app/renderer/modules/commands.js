export default class CommandManager {
    constructor() {
        this.commandsList = null;
        this.commands = [];
        this.selectedCommands = new Set();
        this.initialize();
    }

    async initialize() {
        // Update HTML structure
        this.updateHTMLStructure();
        
        // Get reference to commands list after HTML is updated
        this.commandsList = document.getElementById('commands-list');
        
        // Set up event listeners
        window.electronAPI.onCommandsUpdate((commands) => {
            this.updateCommandsList(commands);
        });

        // Set up UI event listeners
        this.setupEventListeners();

        // Initial commands load
        await this.loadCommands();
    }

    updateHTMLStructure() {
        const commandsPage = document.getElementById('commands');
        if (!commandsPage) return;

        commandsPage.innerHTML = `
            <div class="commands-container">
                <div class="commands-header">
                    <div class="commands-search">
                        <input type="text" placeholder="Search commands..." id="command-search">
                    </div>
                    <div class="commands-actions">
                        <button id="import-commands" class="btn">Import Commands</button>
                        <button id="export-commands" class="btn">Export Commands</button>
                        <button id="reload-commands" class="btn">Reload Commands</button>
                    </div>
                </div>
                <div class="commands-selection-bar">
                    <div class="selection-info">
                        <span id="selection-count">0</span> commands selected
                    </div>
                    <div class="selection-actions">
                        <button id="select-all" class="btn">Select All</button>
                        <button id="deselect-all" class="btn">Deselect All</button>
                        <button id="export-selected" class="btn">Export Selected</button>
                    </div>
                </div>
                <div id="commands-list" class="commands-list">
                    <div class="commands-loading">
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            </div>

            <!-- Import Modal -->
            <div class="modal" id="import-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Import Commands</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <input type="file" id="import-file" accept=".js,.json" style="display: none">
                        <button id="choose-file" class="btn">Choose File</button>
                        <p id="selected-file"></p>
                        <div id="import-command-list" class="command-list-modal">
                            <!-- Commands to import will be listed here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-import" class="btn">Cancel</button>
                        <button id="confirm-import" class="btn primary">Import Selected</button>
                    </div>
                </div>
            </div>

            <!-- Export Modal -->
            <div class="modal" id="export-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Export Commands</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <label>
                                <input type="radio" name="export-type" value="js" checked>
                                JavaScript (.js)
                            </label>
                            <label>
                                <input type="radio" name="export-type" value="json">
                                JSON (.json)
                            </label>
                        </div>
                        <div id="export-command-list" class="command-list-modal">
                            <!-- Commands to export will be listed here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="cancel-export" class="btn">Cancel</button>
                        <button id="confirm-export" class="btn primary">Export Selected</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('command-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterCommands(e.target.value));
        }

        // Import/Export buttons
        const importBtn = document.getElementById('import-commands');
        const exportBtn = document.getElementById('export-commands');
        const reloadBtn = document.getElementById('reload-commands');

        if (importBtn) importBtn.addEventListener('click', () => this.showImportModal());
        if (exportBtn) exportBtn.addEventListener('click', () => this.showExportModal());
        if (reloadBtn) {
            reloadBtn.addEventListener('click', async () => {
                try {
                    reloadBtn.disabled = true;
                    reloadBtn.textContent = 'Reloading...';

                    await window.electronAPI.reloadCommands();
                    await this.loadCommands();

                    reloadBtn.textContent = 'Reload Successful';
                    setTimeout(() => {
                        reloadBtn.disabled = false;
                        reloadBtn.textContent = 'Reload Commands';
                    }, 2000);
                } catch (error) {
                    console.error('Failed to reload commands:', error);
                    this.showError('Failed to reload commands');
                    
                    reloadBtn.textContent = 'Reload Failed';
                    setTimeout(() => {
                        reloadBtn.disabled = false;
                        reloadBtn.textContent = 'Reload Commands';
                    }, 2000);
                }
            });
        }

        // Selection actions
        const selectAllBtn = document.getElementById('select-all');
        const deselectAllBtn = document.getElementById('deselect-all');
        const exportSelectedBtn = document.getElementById('export-selected');

        if (selectAllBtn) selectAllBtn.addEventListener('click', () => this.selectAllCommands());
        if (deselectAllBtn) deselectAllBtn.addEventListener('click', () => this.deselectAllCommands());
        if (exportSelectedBtn) exportSelectedBtn.addEventListener('click', () => this.showExportModal(true));

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Import modal
        const chooseFileBtn = document.getElementById('choose-file');
        const importFile = document.getElementById('import-file');
        const confirmImportBtn = document.getElementById('confirm-import');
        const cancelImportBtn = document.getElementById('cancel-import');

        if (chooseFileBtn && importFile) {
            chooseFileBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    document.getElementById('selected-file').textContent = file.name;
                    this.loadImportFile(file);
                }
            });
        }

        if (confirmImportBtn) confirmImportBtn.addEventListener('click', () => this.importSelectedCommands());
        if (cancelImportBtn) cancelImportBtn.addEventListener('click', () => this.closeModals());

        // Export modal
        const confirmExportBtn = document.getElementById('confirm-export');
        const cancelExportBtn = document.getElementById('cancel-export');

        if (confirmExportBtn) confirmExportBtn.addEventListener('click', () => this.exportSelectedCommands());
        if (cancelExportBtn) cancelExportBtn.addEventListener('click', () => this.closeModals());
    }

    async loadCommands() {
        try {
            const commands = await window.electronAPI.getCommands();
            this.updateCommandsList(commands);
        } catch (error) {
            console.error('Failed to load commands:', error);
            this.showError('Failed to load commands');
        }
    }

    updateCommandsList(commands) {
        if (!this.commandsList) {
            console.error('Commands list element not found');
            return;
        }

        this.commands = commands;
        this.commandsList.innerHTML = ''; // Clear existing commands

        if (!commands || commands.length === 0) {
            this.showEmptyState();
            return;
        }

        commands.forEach(command => {
            const commandCard = this.createCommandCard(command);
            this.commandsList.appendChild(commandCard);
        });

        this.updateSelectionUI();
    }

    createCommandCard(command) {
        const card = document.createElement('div');
        card.className = 'command-card';
        if (this.selectedCommands.has(command.name)) {
            card.classList.add('selected');
        }

        const select = document.createElement('div');
        select.className = 'command-select';
        if (this.selectedCommands.has(command.name)) {
            select.classList.add('selected');
        }

        const name = document.createElement('div');
        name.className = 'command-name';
        name.textContent = `/${command.name}`;

        const description = document.createElement('div');
        description.className = 'command-description';
        description.textContent = command.description || 'No description available';

        const usage = document.createElement('div');
        usage.className = 'command-usage';
        usage.textContent = this.formatCommandUsage(command);

        const category = document.createElement('div');
        category.className = 'command-category';
        category.textContent = command.metadata?.category || 'General';

        const controls = document.createElement('div');
        controls.className = 'command-controls';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            this.editCommand(command);
        };

        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test';
        testBtn.onclick = (e) => {
            e.stopPropagation();
            this.testCommand(command);
        };

        controls.appendChild(editBtn);
        controls.appendChild(testBtn);

        card.appendChild(select);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(usage);
        card.appendChild(category);
        card.appendChild(controls);

        card.addEventListener('click', () => this.toggleCommandSelection(command.name));

        return card;
    }

    toggleCommandSelection(commandName) {
        if (this.selectedCommands.has(commandName)) {
            this.selectedCommands.delete(commandName);
        } else {
            this.selectedCommands.add(commandName);
        }
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const selectionBar = document.querySelector('.commands-selection-bar');
        const selectionCount = document.getElementById('selection-count');
        
        if (this.selectedCommands.size > 0) {
            selectionBar.classList.add('active');
            selectionCount.textContent = this.selectedCommands.size;
        } else {
            selectionBar.classList.remove('active');
        }

        // Update command cards
        document.querySelectorAll('.command-card').forEach(card => {
            const commandName = card.querySelector('.command-name').textContent.slice(1); // Remove '/'
            const select = card.querySelector('.command-select');
            
            if (this.selectedCommands.has(commandName)) {
                card.classList.add('selected');
                select.classList.add('selected');
            } else {
                card.classList.remove('selected');
                select.classList.remove('selected');
            }
        });
    }

    selectAllCommands() {
        this.commands.forEach(command => {
            this.selectedCommands.add(command.name);
        });
        this.updateSelectionUI();
    }

    deselectAllCommands() {
        this.selectedCommands.clear();
        this.updateSelectionUI();
    }

    formatCommandUsage(command) {
        let usage = `/${command.name}`;
        if (command.options && command.options.length > 0) {
            usage += ' ' + command.options.map(opt => {
                const required = opt.required ? '' : '?';
                return `<${opt.name}${required}>`;
            }).join(' ');
        }
        return usage;
    }

    filterCommands(searchTerm) {
        const filteredCommands = this.commands.filter(command => {
            const searchString = `${command.name} ${command.description} ${command.metadata?.category || 'General'}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });

        this.updateCommandsList(filteredCommands);
    }

    async loadImportFile(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                let commands;
                if (file.name.endsWith('.json')) {
                    commands = JSON.parse(e.target.result);
                } else if (file.name.endsWith('.js')) {
                    // For .js files, we'll need to evaluate it
                    const tempFunc = new Function('return ' + e.target.result);
                    commands = tempFunc();
                }

                this.showImportCommandList(commands);
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('Failed to load import file:', error);
        }
    }

    showImportCommandList(commands) {
        const listContainer = document.getElementById('import-command-list');
        listContainer.innerHTML = '';

        Object.entries(commands).forEach(([filename, command]) => {
            const item = document.createElement('div');
            item.className = 'command-list-item';
            item.dataset.filename = filename;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'command-list-checkbox';
            checkbox.checked = true;

            const info = document.createElement('div');
            info.className = 'command-list-info';

            const name = document.createElement('div');
            name.className = 'command-list-name';
            name.textContent = filename;

            const description = document.createElement('div');
            description.className = 'command-list-description';
            description.textContent = typeof command === 'string' 
                ? 'Raw command file'
                : (command.description || 'No description available');

            info.appendChild(name);
            info.appendChild(description);

            item.appendChild(checkbox);
            item.appendChild(info);
            listContainer.appendChild(item);
        });
    }

    async importSelectedCommands() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            console.error('No file selected');
            return;
        }

        try {
            const selectedItems = Array.from(document.querySelectorAll('.command-list-item'))
                .filter(item => item.querySelector('input[type="checkbox"]').checked)
                .map(item => item.dataset.filename);

            await window.electronAPI.importCommands(file.path, selectedItems);
            this.closeModals();
            await this.loadCommands();
        } catch (error) {
            console.error('Failed to import commands:', error);
        }
    }

    async exportSelectedCommands() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        
        try {
            await window.electronAPI.exportCommands(exportType, Array.from(this.selectedCommands));
            this.closeModals();
        } catch (error) {
            console.error('Failed to export commands:', error);
        }
    }

    showImportModal() {
        document.getElementById('import-modal').classList.add('active');
    }

    showExportModal(selectedOnly = false) {
        const modal = document.getElementById('export-modal');
        const listContainer = document.getElementById('export-command-list');
        listContainer.innerHTML = '';

        const commands = selectedOnly ? this.commands.filter(cmd => this.selectedCommands.has(cmd.name)) : this.commands;

        commands.forEach(command => {
            const item = document.createElement('div');
            item.className = 'command-list-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'command-list-checkbox';
            checkbox.checked = this.selectedCommands.has(command.name);

            const info = document.createElement('div');
            info.className = 'command-list-info';

            const name = document.createElement('div');
            name.className = 'command-list-name';
            name.textContent = command.name;

            const description = document.createElement('div');
            description.className = 'command-list-description';
            description.textContent = command.description || 'No description available';

            info.appendChild(name);
            info.appendChild(description);

            item.appendChild(checkbox);
            item.appendChild(info);
            listContainer.appendChild(item);
        });

        modal.classList.add('active');
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.getElementById('selected-file').textContent = '';
        document.getElementById('import-file').value = '';
        document.getElementById('import-command-list').innerHTML = '';
        document.getElementById('export-command-list').innerHTML = '';
    }

    showEmptyState() {
        this.commandsList.innerHTML = `
            <div class="commands-empty">
                <h3>No Commands Available</h3>
                <p>No commands have been registered yet.</p>
            </div>
        `;
    }

    showError(message) {
        this.commandsList.innerHTML = `
            <div class="commands-empty">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    async editCommand(command) {
        // TODO: Implement command editing functionality
        console.log('Edit command:', command.name);
    }

    async testCommand(command) {
        try {
            await window.electronAPI.testCommand(command.name);
        } catch (error) {
            console.error('Failed to test command:', error);
        }
    }
}

