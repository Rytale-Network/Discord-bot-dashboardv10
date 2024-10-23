import CommandCard from './CommandCard.js';

export default class CommandList {
    constructor(container, onSelect, onEdit, onTest) {
        this.container = container;
        this.onSelect = onSelect;
        this.onEdit = onEdit;
        this.onTest = onTest;
        this.commands = [];
        this.selectedCommands = new Set();
    }

    updateCommands(commands) {
        this.commands = commands;
        this.render();
    }

    render() {
        if (!this.container) {
            console.error('Commands list container not found');
            return;
        }

        this.container.innerHTML = ''; // Clear existing commands

        if (!this.commands || this.commands.length === 0) {
            this.showEmptyState();
            return;
        }

        this.commands.forEach(command => {
            const card = new CommandCard(
                command,
                (name) => this.toggleCommandSelection(name),
                this.onEdit,
                this.onTest
            );
            this.container.appendChild(card.render(this.selectedCommands.has(command.name)));
        });
    }

    toggleCommandSelection(commandName) {
        if (this.selectedCommands.has(commandName)) {
            this.selectedCommands.delete(commandName);
        } else {
            this.selectedCommands.add(commandName);
        }
        this.onSelect(this.selectedCommands);
        this.render();
    }

    selectAll() {
        this.commands.forEach(command => {
            this.selectedCommands.add(command.name);
        });
        this.onSelect(this.selectedCommands);
        this.render();
    }

    deselectAll() {
        this.selectedCommands.clear();
        this.onSelect(this.selectedCommands);
        this.render();
    }

    filterCommands(searchTerm) {
        const filteredCommands = this.commands.filter(command => {
            const searchString = `${command.name} ${command.description} ${command.metadata?.category || 'General'}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
        this.updateCommands(filteredCommands);
    }

    showEmptyState() {
        this.container.innerHTML = `
            <div class="commands-empty">
                <h3>No Commands Available</h3>
                <p>No commands have been registered yet.</p>
            </div>
        `;
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="commands-empty">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    getSelectedCommands() {
        return Array.from(this.selectedCommands);
    }
}
