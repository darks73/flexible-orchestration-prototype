// Main JavaScript file for Flexible Orchestration Prototype

class OrchestrationApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadDashboard();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('href').substring(1);
                this.navigateToSection(targetSection);
            });
        });
    }

    navigateToSection(sectionId) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[href="#${sectionId}"]`).classList.add('active');

        // Update active section
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');

        this.currentSection = sectionId;
        this.loadSectionContent(sectionId);
    }

    loadSectionContent(sectionId) {
        switch(sectionId) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'workflows':
                this.loadWorkflows();
                break;
            case 'monitoring':
                this.loadMonitoring();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    loadDashboard() {
        // Simulate loading dashboard data
        console.log('Loading dashboard data...');
        this.updateMetrics();
    }

    loadWorkflows() {
        console.log('Loading workflow management...');
        // Future implementation for workflow canvas
    }

    loadMonitoring() {
        console.log('Loading monitoring data...');
        // Future implementation for charts and monitoring
    }

    loadSettings() {
        console.log('Loading settings...');
        this.setupSettingsForm();
    }

    updateMetrics() {
        // Simulate real-time metric updates
        const metrics = document.querySelectorAll('.metric');
        metrics.forEach(metric => {
            const currentValue = parseInt(metric.textContent);
            const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
            const newValue = Math.max(0, currentValue + variation);
            
            if (metric.textContent !== newValue.toString()) {
                metric.style.transform = 'scale(1.1)';
                metric.textContent = newValue;
                setTimeout(() => {
                    metric.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }

    setupSettingsForm() {
        const saveButton = document.querySelector('.btn-primary');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveSettings();
            });
        }
    }

    saveSettings() {
        const systemName = document.getElementById('system-name').value;
        const maxWorkflows = document.getElementById('max-workflows').value;
        const notificationEmail = document.getElementById('notification-email').value;

        // Simulate saving settings
        console.log('Saving settings:', {
            systemName,
            maxWorkflows,
            notificationEmail
        });

        // Show success message
        this.showNotification('Settings saved successfully!', 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#059669' : '#2563eb'};
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    setupEventListeners() {
        // Add any global event listeners here
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Handle escape key if needed
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OrchestrationApp();
});

// Export for potential module usage
export default OrchestrationApp;
