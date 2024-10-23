export default class CommandModals {
    constructor(onImport, onExport) {
        this.onImport = onImport;
        this.onExport = onExport;
    }

    showImportModal() {
        const modal = document.getElementById('import-modal');
        modal.classList.add('active');
    }

    showExportModal(commands, selectedCommands) {
        const modal = document.getElementById('export-modal');
        const listContainer = document.getElementById('export-command-list');
        listContainer.innerHTML = '';

        const commandsToShow = selectedCommands.size > 0 ? 
            commands.filter(cmd => selectedCommands.has(cmd.name)) : 
            commands;

        commandsToShow.forEach(command => {
            const item = document.createElement('div');
            item.className = 'command-list-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'command-list-checkbox';
            checkbox.checked = selectedCommands.has(command.name);

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

    async handleImport(file) {
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                let commands;
                if (file.name.endsWith('.json')) {
                    commands = JSON.parse(e.target.result);
                } else if (file.name.endsWith('.js')) {
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

    async importSelectedCommands(file) {
        if (!file) {
            console.error('No file selected');
            return;
        }

        try {
            const selectedItems = Array.from(document.querySelectorAll('.command-list-item'))
                .filter(item => item.querySelector('input[type="checkbox"]').checked)
                .map(item => item.dataset.filename);

            await this.onImport(file.path, selectedItems);
            this.closeModals();
        } catch (error) {
            console.error('Failed to import commands:', error);
        }
    }

    async exportSelectedCommands(selectedCommands) {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        
        try {
            await this.onExport(exportType, Array.from(selectedCommands));
            this.closeModals();
        } catch (error) {
            console.error('Failed to export commands:', error);
        }
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
}
