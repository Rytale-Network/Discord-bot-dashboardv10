import CommandList from './CommandList.js';
import CommandModals from './CommandModals.js';
import EventHandler from './EventHandler.js';
import { commandsTemplate } from './template.js';

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
        
        // Initialize components
        this.commandsList = new CommandList(
            document.getElementById('commands-list'),
            this.handleCommandSelection.bind(this),
            this.handleCommandEdit.bind(this),
            this.handleCommandTest.bind(this)
        );

        this.commandModals = new CommandModals(
            this.handleImport.bind(this),
            this.handleExport.bind(this)
        );

        // Set up event handlers
        this.eventHandler = new EventHandler(this);
        this.eventHandler.setup();

        // Set up command updates
        window.electronAPI.onCommandsUpdate((commands) => {
            this.updateCommands(commands);
        });

        // Initial commands load
        await this.loadCommands();
    }

    updateHTMLStructure() {
        const commandsPage = document.getElementById('commands');
        if (!commandsPage) return;
        commandsPage.innerHTML = commandsTemplate;
    }

    async loadCommands() {
        try {
            const commands = await window.electronAPI.getCommands();
            this.updateCommands(commands);
        } catch (error) {
            console.error('Failed to load commands:', error);
            this.commandsList.showError('Failed to load commands');
        }
    }

    updateCommands(commands) {
        this.commands = commands;
        this.commandsList.updateCommands(commands);
    }

    handleCommandSelection(selectedCommands) {
        this.selectedCommands = selectedCommands;
        const selectionCount = document.getElementById('selection-count');
        if (selectionCount) {
            selectionCount.textContent = selectedCommands.size;
        }
    }

    async handleCommandEdit(command) {
        // TODO: Implement command editing functionality
        console.log('Edit command:', command.name);
    }

    async handleCommandTest(command) {
        try {
            await window.electronAPI.testCommand(command.name);
        } catch (error) {
            console.error('Failed to test command:', error);
        }
    }

    async handleImport(filePath, selectedItems) {
        await window.electronAPI.importCommands(filePath, selectedItems);
        await this.loadCommands();
    }

    async handleExport(format, selectedCommands) {
        await window.electronAPI.exportCommands(format, selectedCommands);
    }
}
