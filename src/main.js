// Main JavaScript file for Flexible Orchestration Prototype

class OrchestrationApp {
    constructor() {
        this.currentSection = 'workflows';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadWorkflows();
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
            case 'workflows':
                this.loadWorkflows();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    loadWorkflows() {
        console.log('Loading workflow management...');
        this.setupWorkflowInteractions();
    }

    loadSettings() {
        console.log('Loading settings...');
        this.setupSettingsForm();
    }

    setupWorkflowInteractions() {
        // Setup workflow node interactions
        const nodes = document.querySelectorAll('.node');
        nodes.forEach(node => {
            node.addEventListener('click', () => {
                this.selectNode(node);
            });
        });

        // Setup workflow action buttons
        const actionButtons = document.querySelectorAll('.workflow-actions .btn-icon');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.getAttribute('title');
                this.handleWorkflowAction(action, button);
            });
        });

        // Setup toolbar buttons
        const createBtn = document.querySelector('.toolbar-left .btn-primary');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createNewWorkflow();
            });
        }
    }

    selectNode(node) {
        // Remove previous selection
        document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
        
        // Add selection to clicked node
        node.classList.add('selected');
        
        console.log('Selected node:', node.querySelector('.node-label').textContent);
    }

    handleWorkflowAction(action, button) {
        const workflowItem = button.closest('.workflow-item');
        const workflowName = workflowItem.querySelector('h4').textContent;
        
        console.log(`Action: ${action} on workflow: ${workflowName}`);
        
        // Show feedback
        this.showNotification(`${action} action triggered for ${workflowName}`, 'info');
    }

    createNewWorkflow() {
        console.log('Creating new workflow...');
        this.showNotification('Opening workflow creation dialog...', 'info');
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
