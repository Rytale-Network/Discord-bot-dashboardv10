// Server management module
import navigationManager from './navigation.js';

class ServerManager {
    constructor() {
        // Initialize elements as null
        this.serverList = null;
        this.serverCount = null;
        this.userCount = null;
        this.currentModal = null;
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeElements();
                this.updateServers(); // Immediate initial update
            });
        } else {
            this.initializeElements();
            this.updateServers(); // Immediate initial update
        }
        
        this.setupEventListeners();

        // Register for page activation events
        navigationManager.onPageActive('servers', () => {
            console.log('Servers page activated');
            this.initializeElements();
            this.updateServers();
        });
    }

    initializeElements() {
        console.log('Initializing server elements');
        this.serverList = document.getElementById('server-list');
        this.serverCount = document.getElementById('server-count');
        this.userCount = document.getElementById('user-count');

        if (this.serverList) {
            // Clear any existing content
            this.serverList.innerHTML = '';
            // Add click handler
            this.serverList.onclick = (event) => {
                const serverCard = event.target.closest('.server-card');
                if (serverCard) {
                    const serverId = serverCard.dataset.serverId;
                    console.log('Server clicked:', serverId);
                    if (serverId) {
                        this.showServerDetails(serverId);
                    }
                }
            };
        }
    }

    setupEventListeners() {
        // Listen for bot status changes to trigger immediate updates
        window.electronAPI.onBotStatusUpdate(status => {
            if (status.online) {
                this.updateServers();
            }
        });

        // Listen for server updates
        window.electronAPI.onServersUpdate(servers => {
            try {
                this.updateDisplay(servers);
            } catch (error) {
                console.error('Error updating servers display:', error);
            }
        });
    }

    updateDisplay(servers) {
        console.log('Updating server display with servers:', servers);
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
            serverCard.dataset.serverId = server.id; // Add server ID as data attribute
            
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
            
            this.serverList.appendChild(serverCard);
        } catch (error) {
            console.error('Error adding server card:', error);
        }
    }

    async showServerDetails(serverId) {
        console.log('Fetching server details for:', serverId);
        try {
            const details = await window.electronAPI.getServerDetails(serverId);
            console.log('Received server details:', details);
            if (details) {
                this.createDetailsModal(details);
            }
        } catch (error) {
            console.error('Failed to fetch server details:', error);
            alert('Failed to load server details');
        }
    }

    removeCurrentModal() {
        if (this.currentModal && document.body.contains(this.currentModal)) {
            document.body.removeChild(this.currentModal);
            this.currentModal = null;
        }
    }

    createDetailsModal(details) {
        console.log('Creating modal for server:', details.name);
        try {
            // Remove any existing modal
            this.removeCurrentModal();

            const modal = document.createElement('div');
            modal.className = 'modal';
            this.currentModal = modal;
            
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
            
            // Add click event listener to the modal for closing
            const closeModal = () => {
                this.removeCurrentModal();
                document.removeEventListener('keydown', escapeHandler);
            };

            modal.addEventListener('click', (event) => {
                if (event.target.classList.contains('modal') || event.target.classList.contains('close-modal')) {
                    closeModal();
                }
            });

            // Add escape key listener
            const escapeHandler = (event) => {
                if (event.key === 'Escape') {
                    closeModal();
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
            document.body.appendChild(modal);
            console.log('Modal created and added to document');
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
