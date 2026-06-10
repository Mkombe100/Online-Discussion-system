// Dashboard JavaScript Module
// Handles user profile, theme management, and group operations

class Dashboard {
    constructor() {
        this.user = this.loadUserData();
        this.theme = localStorage.getItem('theme') || 'light';
        this.initializeUI();
    }

    loadUserData() {
        // This would typically come from the backend
        return {
            name: localStorage.getItem('userName') || 'User Name',
            email: localStorage.getItem('userEmail') || 'user@example.com'
        };
    }

    initializeUI() {
        this.updateProfileInfo();
        this.setupEventListeners();
        this.applyTheme(this.theme);
    }

    updateProfileInfo() {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        
        if (profileName) profileName.textContent = this.user.name;
        if (profileEmail) profileEmail.textContent = this.user.email;
    }

    setupEventListeners() {
        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.toggleProfilePopup());
        }

        // Theme button
        const themeBtn = document.getElementById('themeBtn');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.cycleTheme());
        }

        // Close modals on outside click
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
    }

    toggleProfilePopup() {
        const popup = document.getElementById('profilePopup');
        if (popup) {
            popup.classList.toggle('active');
        }
    }

    closeModals() {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }

    cycleTheme() {
        const isDark = document.body.classList.contains('dark');
        this.applyTheme(isDark ? 'light' : 'dark');
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        this.updateThemeIndicators(theme);
        localStorage.setItem('theme', theme);
    }

    updateThemeIndicators(theme) {
        const themeLight = document.getElementById('themeLight');
        const themeDark = document.getElementById('themeDark');
        const themeBtn = document.getElementById('themeBtn');

        if (themeLight) {
            themeLight.classList.toggle('active', theme === 'light');
        }
        if (themeDark) {
            themeDark.classList.toggle('active', theme === 'dark');
        }
        if (themeBtn) {
            themeBtn.innerHTML = theme === 'dark' 
                ? '<i class="fas fa-moon"></i>' 
                : '<i class="fas fa-sun"></i>';
        }
    }

    async createGroup(name, description) {
        try {
            const response = await fetch('/createGroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}`
            });

            if (response.ok) {
                return { success: true, message: 'Group created successfully!' };
            } else {
                return { success: false, message: 'Failed to create group' };
            }
        } catch (error) {
            console.error('Create group error:', error);
            return { success: false, message: 'An error occurred' };
        }
    }

    async joinGroup(code) {
        try {
            const response = await fetch('/joinGroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `group_code=${encodeURIComponent(code)}`
            });

            if (response.ok) {
                return { success: true, message: 'Joined group successfully!' };
            } else if (response.status === 404) {
                return { success: false, message: 'Group code not found' };
            } else {
                return { success: false, message: 'Failed to join group' };
            }
        } catch (error) {
            console.error('Join group error:', error);
            return { success: false, message: 'An error occurred' };
        }
    }

    showNotification(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = message;
        
        toast.classList.remove('success', 'error');
        toast.classList.add(type, 'active');

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    logout() {
        this.showNotification('Signing out...', 'success');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
    }

    updateUserData(name, email) {
        this.user.name = name;
        this.user.email = email;
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        this.updateProfileInfo();
    }
}

// Initialize dashboard on page load
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});
