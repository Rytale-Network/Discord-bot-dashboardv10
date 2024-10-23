// Navigation management module
class NavigationManager {
    constructor() {
        this.navLinks = document.querySelectorAll('nav a');
        this.pages = document.querySelectorAll('.page');
        this.activePageListeners = new Set();
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
    }

    onPageActive(pageId, callback) {
        this.activePageListeners.add({ pageId, callback });
    }

    handleNavigation(e) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').substring(1);
        
        // Update active states
        this.navLinks.forEach(l => l.parentElement.classList.remove('active'));
        e.target.parentElement.classList.add('active');
        
        // Show target page
        this.pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === targetId) {
                page.classList.add('active');
                // Notify listeners for this page
                this.activePageListeners.forEach(listener => {
                    if (listener.pageId === targetId) {
                        listener.callback();
                    }
                });
            }
        });
    }
}

// Export singleton instance
const navigationManager = new NavigationManager();
export default navigationManager;
