// Navigation management module
class NavigationManager {
    constructor() {
        this.navLinks = document.querySelectorAll('nav a');
        this.pages = document.querySelectorAll('.page');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
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
            }
        });
    }
}

export default NavigationManager;
