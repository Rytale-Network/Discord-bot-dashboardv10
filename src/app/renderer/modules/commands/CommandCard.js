export default class CommandCard {
    constructor(command, onSelect, onEdit, onTest) {
        this.command = command;
        this.onSelect = onSelect;
        this.onEdit = onEdit;
        this.onTest = onTest;
    }

    render(isSelected) {
        const card = document.createElement('div');
        card.className = 'command-card';
        if (isSelected) {
            card.classList.add('selected');
        }

        const select = document.createElement('div');
        select.className = 'command-select';
        if (isSelected) {
            select.classList.add('selected');
        }

        const name = document.createElement('div');
        name.className = 'command-name';
        name.textContent = `/${this.command.name}`;

        const description = document.createElement('div');
        description.className = 'command-description';
        description.textContent = this.command.description || 'No description available';

        const usage = document.createElement('div');
        usage.className = 'command-usage';
        usage.textContent = this.formatCommandUsage();

        const category = document.createElement('div');
        category.className = 'command-category';
        category.textContent = this.command.metadata?.category || 'General';

        const controls = document.createElement('div');
        controls.className = 'command-controls';

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            this.onEdit(this.command);
        };

        const testBtn = document.createElement('button');
        testBtn.textContent = 'Test';
        testBtn.onclick = (e) => {
            e.stopPropagation();
            this.onTest(this.command);
        };

        controls.appendChild(editBtn);
        controls.appendChild(testBtn);

        card.appendChild(select);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(usage);
        card.appendChild(category);
        card.appendChild(controls);

        card.addEventListener('click', () => this.onSelect(this.command.name));

        return card;
    }

    formatCommandUsage() {
        let usage = `/${this.command.name}`;
        if (this.command.options && this.command.options.length > 0) {
            usage += ' ' + this.command.options.map(opt => {
                const required = opt.required ? '' : '?';
                return `<${opt.name}${required}>`;
            }).join(' ');
        }
        return usage;
    }
}
