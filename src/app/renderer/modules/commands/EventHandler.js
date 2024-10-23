export default class EventHandler {
    constructor(manager) {
        this.manager = manager;
    }

    setup() {
        this.setupSearch();
        this.setupMainButtons();
        this.setupSelectionButtons();
        this.setupModalButtons();
        this.setupImportHandlers();
        this.setupExportHandlers();
    }

    setupSearch() {
        const searchInput = document.getElementById('command-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => 
                this.manager.commandsList.filterCommands(e.target.value)
            );
        }
    }

    setupMainButtons() {
        const importBtn = document.getElementById('import-commands');
        const exportBtn = document.getElementById('export-commands');
        const reloadBtn = document.getElementById('reload-commands');

        if (importBtn) {
            importBtn.addEventListener('click', () => 
                this.manager.commandModals.showImportModal()
            );
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => 
                this.manager.commandModals.showExportModal(
                    this.manager.commands, 
                    this.manager.selectedCommands
                )
            );
        }

        if (reloadBtn) {
            reloadBtn.addEventListener('click', async () => {
                try {
                    reloadBtn.disabled = true;
                    reloadBtn.textContent = 'Reloading...';

                    await window.electronAPI.reloadCommands();
                    await this.manager.loadCommands();

                    reloadBtn.textContent = 'Reload Successful';
                    setTimeout(() => {
                        reloadBtn.disabled = false;
                        reloadBtn.textContent = 'Reload Commands';
                    }, 2000);
                } catch (error) {
                    console.error('Failed to reload commands:', error);
                    this.manager.commandsList.showError('Failed to reload commands');
                    
                    reloadBtn.textContent = 'Reload Failed';
                    setTimeout(() => {
                        reloadBtn.disabled = false;
                        reloadBtn.textContent = 'Reload Commands';
                    }, 2000);
                }
            });
        }
    }

    setupSelectionButtons() {
        const selectAllBtn = document.getElementById('select-all');
        const deselectAllBtn = document.getElementById('deselect-all');
        const exportSelectedBtn = document.getElementById('export-selected');

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => 
                this.manager.commandsList.selectAll()
            );
        }

        if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => 
                this.manager.commandsList.deselectAll()
            );
        }

        if (exportSelectedBtn) {
            exportSelectedBtn.addEventListener('click', () => {
                this.manager.commandModals.showExportModal(
                    this.manager.commands, 
                    this.manager.selectedCommands
                );
            });
        }
    }

    setupModalButtons() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => 
                this.manager.commandModals.closeModals()
            );
        });
    }

    setupImportHandlers() {
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
                    this.manager.commandModals.handleImport(file);
                }
            });
        }

        if (confirmImportBtn) {
            confirmImportBtn.addEventListener('click', () => {
                const file = document.getElementById('import-file').files[0];
                this.manager.commandModals.importSelectedCommands(file);
            });
        }

        if (cancelImportBtn) {
            cancelImportBtn.addEventListener('click', () => 
                this.manager.commandModals.closeModals()
            );
        }
    }

    setupExportHandlers() {
        const confirmExportBtn = document.getElementById('confirm-export');
        const cancelExportBtn = document.getElementById('cancel-export');

        if (confirmExportBtn) {
            confirmExportBtn.addEventListener('click', () => {
                this.manager.commandModals.exportSelectedCommands(
                    this.manager.selectedCommands
                );
            });
        }

        if (cancelExportBtn) {
            cancelExportBtn.addEventListener('click', () => 
                this.manager.commandModals.closeModals()
            );
        }
    }
}
