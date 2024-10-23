// Server management module
class ServerManager {
    constructor() {
        // Initialize elements as null
        this.serverList = null;
        this.serverCount = null;
        this.userCount = null;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeElements());
        } else {
            this.initializeElements();
        }
        
        this.setupEventListeners();
    }

    initializeElements() {
        this.serverList = document.getElementById('server-list');
        this.serverCount = document.getElementById('server-count');
        this.userCount = document.getElementById('user-count');
    }

    setupEventListeners() {
        window.electronAPI.onServersUpdate(servers => {
            try {
                this.updateDisplay(servers);
            } catch (error) {
                console.error('Error updating servers display:', error);
            }
        });
    }

    updateDisplay(servers) {
        // Ensure elements exist before updating
        if (!this.serverList || !this.serverCount || !this.userCount) {
            this.initializeElements();
            if (!this.serverList || !this.serverCount || !this.userCount) {
                console.error('Required DOM elements not found');
                return;
            }
        }

        try {
            this.serverCount.textContent = servers.length;
            let totalUsers = 0;
            
            // Clear existing server list
            this.serverList.innerHTML = '';
            
            // Add server cards
            servers.forEach(server => {
                totalUsers += server.memberCount;
                this.addServerCard(server);
            });
            
            this.userCount.textContent = totalUsers;
        } catch (error) {
            console.error('Error updating servers display:', error);
        }
    }

    addServerCard(server) {
        if (!this.serverList) return;

        try {
            const serverCard = document.createElement('div');
            serverCard.className = 'server-card';
            
            // Create a default icon using server initials if no icon URL
            const iconContent = server.iconURL ? 
                `<img src="${server.iconURL}" alt="${server.name}" class="server-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'50\\' height=\\'50\\' style=\\'background:%237289da;border-radius:50%\\'><text x=\\'50%\\' y=\\'50%\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\' font-size=\\'20\\'>${server.name.charAt(0)}</text></svg>'">` :
                `<div class="server-icon-placeholder">${server.name.charAt(0)}</div>`;

            serverCard.innerHTML = `
                ${iconContent}
                <div class="server-info">
                    <h3>${server.name}</h3>
                    <p>${server.memberCount} members</p>
                </div>
            `;
            
            // Add click handler for server details
            serverCard.addEventListener('click', () => this.showServerDetails(server.id));
            
            this.serverList.appendChild(serverCard);
        } catch (error) {
            console.error('Error adding server card:', error);
        }
    }

    async showServerDetails(serverId) {
        try {
            const details = await window.electronAPI.getServerDetails(serverId);
            if (details) {
                this.createDetailsModal(details);
            }
        } catch (error) {
            console.error('Failed to fetch server details:', error);
            alert('Failed to load server details');
        }
    }

    createDetailsModal(details) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            const iconContent = details.iconURL ? 
                `<img src="${details.iconURL}" alt="${details.name}" class="server-icon-large" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' style=\\'background:%237289da;border-radius:50%\\'><text x=\\'50%\\' y=\\'50%\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'white\\' font-size=\\'40\\'>${details.name.charAt(0)}</text></svg>'">` :
                `<div class="server-icon-placeholder-large">${details.name.charAt(0)}</div>`;

            modal.innerHTML = `
                <div class="modal-content">
                    ${iconContent}
                    <h2>${details.name}</h2>
                    <div class="server-details">
                        <p>Members: ${details.memberCount}</p>
                        <h3>Channels</h3>
                        <ul>
                            ${details.channels.map(channel => 
                                `<li>${channel.name} (${channel.type})</li>`
                            ).join('')}
                        </ul>
                        <h3>Roles</h3>
                        <ul>
                            ${details.roles.map(role => 
                                `<li style="color: #${role.color.toString(16)}">${role.name}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <button class="close-modal">Close</button>
                </div>
            `;
            
            const closeButton = modal.querySelector('.close-modal');
            if (closeButton) {
                closeButton.onclick = () => {
                    document.body.removeChild(modal);
                };
            }
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error creating details modal:', error);
        }
    }

    async updateServers() {
        try {
            const servers = await window.electronAPI.getServers();
            this.updateDisplay(servers);
        } catch (error) {
            console.error('Failed to update servers:', error);
        }
    }
}

export default ServerManager;
