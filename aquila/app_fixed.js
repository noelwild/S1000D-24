
// Simplified Aquila App with project creation functionality
class SimpleAquilaApp {
    constructor() {
        this.currentDocument = null;
        this.currentModule = null;
        this.currentProject = null;
        this.isSTEView = true;
        this.documents = [];
        this.modules = [];
        this.projects = [];
        
        this.initializeApp();
    }
    
    async initializeApp() {
        console.log('Initializing simplified app...');
        this.setupEventListeners();
        
        // Check if we have a current project
        await this.checkCurrentProject();
        
        // If no project is selected, show project selection
        if (!this.currentProject) {
            console.log('No current project, showing project selection');
            this.showProjectSelection();
        } else {
            console.log('Current project exists, showing main interface');
            this.showMainInterface();
            await this.loadDocuments();
        }
    }
    
    async checkCurrentProject() {
        try {
            console.log('Checking current project...');
            const response = await fetch('/api/projects/current');
            if (response.ok) {
                const result = await response.json();
                console.log('Current project API response:', result);
                if (result.status === 'no_project_selected') {
                    this.currentProject = null;
                    console.log('No project selected');
                } else {
                    this.currentProject = result;
                    console.log('Current project set to:', this.currentProject);
                }
                this.updateProjectDisplay();
            } else {
                console.log('Failed to check current project');
            }
        } catch (error) {
            console.error('Error checking current project:', error);
        }
    }
    
    setupEventListeners() {
        // View toggle
        document.getElementById('steBtn').addEventListener('click', () => this.switchToSTE());
        document.getElementById('verbatimBtn').addEventListener('click', () => this.switchToVerbatim());
        
        // Document selection
        document.getElementById('documentSelect').addEventListener('change', async (e) => {
            this.currentDocument = e.target.value;
            await this.loadDataModules();
        });
        
        // Upload functionality
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadModal());
        document.getElementById('uploadBtn2').addEventListener('click', () => this.showUploadModal());
        document.getElementById('cancelUpload').addEventListener('click', () => this.hideUploadModal());
        document.getElementById('confirmUpload').addEventListener('click', () => this.handleUpload());
        document.getElementById('fileInput').addEventListener('change', (e) => {
            document.getElementById('confirmUpload').disabled = !e.target.files[0];
        });
        
        // Project management
        document.getElementById('projectBtn').addEventListener('click', () => this.showProjectSelection());
        document.getElementById('newProjectBtn').addEventListener('click', () => this.showNewProjectModal());
        document.getElementById('cancelNewProject').addEventListener('click', () => this.hideNewProjectModal());
        document.getElementById('confirmNewProject').addEventListener('click', () => this.handleCreateProject());
        document.getElementById('cancelProjectSelection').addEventListener('click', () => this.hideProjectSelection());
    }
    
    showMainInterface() {
        document.getElementById('mainInterface').classList.remove('hidden');
        // Hide project selection modal
        document.getElementById('projectSelectionModal').classList.add('hidden');
    }
    
    async loadDocuments() {
        try {
            console.log('Loading documents...');
            const response = await fetch('/api/documents');
            if (response.ok) {
                this.documents = await response.json();
                console.log('Documents loaded:', this.documents);
                this.updateDocumentSelect();
                
                // Auto-select first document
                if (this.documents.length > 0) {
                    this.currentDocument = this.documents[0].id;
                    document.getElementById('documentSelect').value = this.currentDocument;
                    await this.loadDataModules();
                }
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }
    
    updateDocumentSelect() {
        const select = document.getElementById('documentSelect');
        select.innerHTML = '<option value="">Select document...</option>';
        
        this.documents.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${doc.filename} (${doc.status})`;
            select.appendChild(option);
        });
    }
    
    async loadDataModules() {
        if (!this.currentDocument) {
            console.log('No document selected, clearing modules');
            this.updateModulesList([]);
            return;
        }
        
        try {
            console.log('Loading data modules for document:', this.currentDocument);
            const response = await fetch(`/api/data-modules?document_id=${this.currentDocument}`);
            if (response.ok) {
                this.modules = await response.json();
                console.log('Data modules loaded:', this.modules.length);
                this.updateModulesList(this.modules);
            }
        } catch (error) {
            console.error('Error loading data modules:', error);
        }
    }
    
    updateModulesList(modules) {
        const container = document.getElementById('modulesList');
        
        if (modules.length === 0) {
            container.innerHTML = `
                <div class="text-gray-400 text-sm text-center py-8">
                    No data modules found
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        modules.forEach((module, index) => {
            const moduleElement = document.createElement('div');
            moduleElement.className = 'module-item';
            moduleElement.innerHTML = `
                <div class="dmc">${module.dmc}</div>
                <div class="title">${module.title}</div>
                <div class="type">${module.type}</div>
            `;
            
            // Add click event listener - THIS IS THE KEY FIX
            moduleElement.addEventListener('click', (e) => {
                console.log('Module clicked:', module.title);
                this.selectModule(module, moduleElement);
            });
            
            container.appendChild(moduleElement);
        });
        
        console.log('Modules rendered with click handlers');
    }
    
    selectModule(module, element) {
        console.log('Selecting module:', module.title);
        
        // Update active state
        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');
        
        this.currentModule = module;
        this.updateContentArea();
        this.updateModuleInfo();
    }
    
    updateContentArea() {
        const contentArea = document.getElementById('contentArea');
        
        if (!this.currentModule) {
            contentArea.innerHTML = `
                <div class="h-full flex items-center justify-center text-gray-400">
                    <div class="text-center">
                        <div class="text-6xl mb-4">📋</div>
                        <h3 class="text-xl font-semibold mb-2">Select a Data Module</h3>
                        <p class="text-gray-500">Choose a module from the sidebar to view its content</p>
                    </div>
                </div>
            `;
            return;
        }
        
        const content = this.isSTEView ? this.currentModule.ste_content : this.currentModule.verbatim_content;
        
        contentArea.innerHTML = `
            <div class="content-editor">
                <div class="prose prose-invert max-w-none">
                    ${this.formatContent(content)}
                </div>
            </div>
        `;
    }
    
    formatContent(content) {
        // Simple content formatting
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
    
    updateModuleInfo() {
        const infoElement = document.getElementById('moduleInfo');
        const titleElement = document.getElementById('moduleTitle');
        
        if (!this.currentModule) {
            infoElement.textContent = '';
            titleElement.textContent = 'Select a data module';
            return;
        }
        
        titleElement.textContent = this.currentModule.title;
        infoElement.innerHTML = `
            <div class="flex items-center space-x-4">
                <span>DMC: <code class="bg-gray-700 px-2 py-1 rounded text-sm">${this.currentModule.dmc}</code></span>
                <span>Type: ${this.currentModule.type}</span>
                <span>Info Code: ${this.currentModule.info_code}</span>
            </div>
        `;
    }
    
    switchToSTE() {
        this.isSTEView = true;
        document.getElementById('steBtn').className = 'px-3 py-1 text-sm rounded bg-blue-600 text-white';
        document.getElementById('verbatimBtn').className = 'px-3 py-1 text-sm rounded text-gray-300 hover:text-white';
        this.updateContentArea();
    }
    
    switchToVerbatim() {
        this.isSTEView = false;
        document.getElementById('verbatimBtn').className = 'px-3 py-1 text-sm rounded bg-blue-600 text-white';
        document.getElementById('steBtn').className = 'px-3 py-1 text-sm rounded text-gray-300 hover:text-white';
        this.updateContentArea();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.app = new SimpleAquilaApp();
});
