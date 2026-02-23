// Main JavaScript for Meeting AI Frontend

class MeetingAI {
    constructor() {
        this.baseURL = 'http://localhost:8000';
        this.currentJobId = null;
        this.statusCheckInterval = null;
        this.selectedFile = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.createParticles();
        this.checkServerHealth();
    }
    
    setupEventListeners() {
        // File upload
        const fileInput = document.getElementById('fileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');
        const uploadArea = document.getElementById('uploadArea');
        
        selectFileBtn?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        
        // Drag and drop
        uploadArea?.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea?.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea?.addEventListener('drop', this.handleDrop.bind(this));
        
        // Upload options
        const startProcessingBtn = document.getElementById('startProcessing');
        const cancelUploadBtn = document.getElementById('cancelUpload');
        
        startProcessingBtn?.addEventListener('click', this.startProcessing.bind(this));
        cancelUploadBtn?.addEventListener('click', this.cancelUpload.bind(this));
        
        // Processing controls
        const cancelProcessingBtn = document.getElementById('cancelProcessing');
        cancelProcessingBtn?.addEventListener('click', this.cancelProcessing.bind(this));
        
        // Result actions
        const newAnalysisBtn = document.getElementById('newAnalysis');
        newAnalysisBtn?.addEventListener('click', this.startNewAnalysis.bind(this));
        
        // Download buttons
        document.getElementById('downloadJson')?.addEventListener('click', () => this.downloadResults('json'));
        document.getElementById('downloadTxt')?.addEventListener('click', () => this.downloadResults('txt'));
        document.getElementById('downloadSrt')?.addEventListener('click', () => this.downloadResults('srt'));
        
        // Copy buttons
        document.getElementById('copySummary')?.addEventListener('click', () => this.copyToClipboard('summary'));
        document.getElementById('copyKeyPoints')?.addEventListener('click', () => this.copyToClipboard('keyPoints'));
        document.getElementById('copyActionItems')?.addEventListener('click', () => this.copyToClipboard('actionItems'));
        document.getElementById('copyTranscript')?.addEventListener('click', () => this.copyToClipboard('transcript'));
        
        // Search functionality
        const searchTranscriptBtn = document.getElementById('searchTranscript');
        const searchBtn = document.getElementById('searchBtn');
        const closeSearchBtn = document.getElementById('closeSearch');
        const searchInput = document.getElementById('searchInput');
        
        searchTranscriptBtn?.addEventListener('click', this.toggleSearch.bind(this));
        searchBtn?.addEventListener('click', this.searchTranscript.bind(this));
        closeSearchBtn?.addEventListener('click', this.closeSearch.bind(this));
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchTranscript();
        });
    }
    
    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = (15 + Math.random() * 10) + 's';
            particlesContainer.appendChild(particle);
        }
    }
    
    async checkServerHealth() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const health = await response.json();
            
            if (!health.transcription_engine || !health.summarizer) {
                this.showLoadingOverlay('Initializing AI models...');
                // Check again in a few seconds
                setTimeout(() => this.checkServerHealth(), 3000);
            } else {
                this.hideLoadingOverlay();
            }
        } catch (error) {
            console.error('Server health check failed:', error);
            this.showToast('Warning', 'Cannot connect to server. Please ensure the backend is running.', 'warning');
        }
    }
    
    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            const text = overlay.querySelector('p');
            if (text) text.textContent = message;
        }
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    handleDragOver(e) {
        e.preventDefault();
        const uploadArea = document.getElementById('uploadArea');
        uploadArea?.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        const uploadArea = document.getElementById('uploadArea');
        uploadArea?.classList.remove('drag-over');
    }
    
    handleDrop(e) {
        e.preventDefault();
        const uploadArea = document.getElementById('uploadArea');
        uploadArea?.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files[0]);
        }
    }
    
    handleFileSelect(file) {
        if (!file) return;
        
        // Validate file type
        const validTypes = [
            'audio/mp3', 'audio/wav', 'audio/flac', 'audio/m4a', 'audio/aac', 'audio/ogg',
            'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm', 'video/flv'
        ];
        
        const validExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', 
                               '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'];
        
        const fileName = file.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!validTypes.includes(file.type) && !hasValidExtension) {
            this.showToast('Error', 'Unsupported file format. Please select an audio or video file.', 'error');
            return;
        }
        
        // Check file size (2GB limit)
        const maxSize = 2 * 1024 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showToast('Error', 'File too large. Maximum size is 2GB.', 'error');
            return;
        }
        
        this.selectedFile = file;
        this.showUploadOptions();
        
        // Update upload area to show selected file
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-file-${file.type.startsWith('video/') ? 'video' : 'audio'}"></i>
                </div>
                <h3>File Selected</h3>
                <p><strong>${file.name}</strong></p>
                <p>Size: ${this.formatFileSize(file.size)}</p>
                <p>Type: ${file.type || 'Unknown'}</p>
            `;
        }
        
        this.showToast('Success', `File "${file.name}" selected successfully!`, 'success');
    }
    
    showUploadOptions() {
        const uploadOptions = document.getElementById('uploadOptions');
        if (uploadOptions) {
            uploadOptions.style.display = 'block';
            uploadOptions.classList.add('fade-in');
        }
    }
    
    hideUploadOptions() {
        const uploadOptions = document.getElementById('uploadOptions');
        if (uploadOptions) {
            uploadOptions.style.display = 'none';
        }
    }
    
    async startProcessing() {
        if (!this.selectedFile) {
            this.showToast('Error', 'No file selected', 'error');
            return;
        }
        
        try {
            this.showProcessingSection();
            this.hideUploadSection();
            
            // Get options
            const language = document.getElementById('languageSelect')?.value || null;
            const minSpeakers = parseInt(document.getElementById('speakersMin')?.value) || null;
            const maxSpeakers = parseInt(document.getElementById('speakersMax')?.value) || null;
            const summaryType = document.getElementById('summaryType')?.value || 'comprehensive';
            
            // Create form data
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            if (language) formData.append('language', language);
            if (minSpeakers) formData.append('min_speakers', minSpeakers);
            if (maxSpeakers) formData.append('max_speakers', maxSpeakers);
            formData.append('summary_type', summaryType);
            
            // Upload file
            this.updateProcessingStatus('Uploading file...', 0);
            
            const response = await fetch(`${this.baseURL}/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.currentJobId = result.job_id;
                this.showToast('Success', 'File uploaded! Processing started.', 'success');
                this.startStatusChecking();
            } else {
                throw new Error(result.detail || 'Upload failed');
            }
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Error', error.message, 'error');
            this.showUploadSection();
            this.hideProcessingSection();
        }
    }
    
    startStatusChecking() {
        this.statusCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`${this.baseURL}/status/${this.currentJobId}`);
                const status = await response.json();
                
                this.updateProcessingProgress(status);
                
                if (status.status === 'completed') {
                    clearInterval(this.statusCheckInterval);
                    this.showResults(status.result);
                } else if (status.status === 'failed') {
                    clearInterval(this.statusCheckInterval);
                    this.showToast('Error', status.error || 'Processing failed', 'error');
                    this.showUploadSection();
                    this.hideProcessingSection();
                }
                
            } catch (error) {
                console.error('Status check error:', error);
            }
        }, 2000); // Check every 2 seconds
    }
    
    updateProcessingProgress(status) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const processingStatus = document.getElementById('processingStatus');
        
        let progress = status.progress || 0;
        let statusText = this.getStatusText(status.status);
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
        if (processingStatus) processingStatus.textContent = statusText;
        
        // Update step indicators
        this.updateStepIndicators(status.status, progress);
    }
    
    updateStepIndicators(status, progress) {
        const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
        const stepThresholds = [10, 20, 50, 70, 90];
        
        steps.forEach((stepId, index) => {
            const step = document.getElementById(stepId);
            if (!step) return;
            
            step.classList.remove('active', 'completed');
            
            if (progress > stepThresholds[index]) {
                step.classList.add('completed');
            } else if (progress >= (stepThresholds[index] - 10)) {
                step.classList.add('active');
            }
        });
    }
    
    getStatusText(status) {
        const statusMessages = {
            'uploaded': 'File uploaded successfully',
            'processing': 'Preparing audio file...',
            'audio_prepared': 'Audio ready for processing',
            'transcription_completed': 'Transcription completed',
            'diarization_completed': 'Speaker identification completed',
            'summarization_completed': 'Generating final summary...',
            'completed': 'Processing completed!',
            'failed': 'Processing failed'
        };
        
        return statusMessages[status] || 'Processing...';
    }
    
    showResults(result) {
        this.hideProcessingSection();
        this.showResultsSection();
        
        // Populate summary
        const summaryText = document.getElementById('summaryText');
        if (summaryText) {
            summaryText.textContent = result.summary.main_summary || 'No summary available';
        }
        
        // Populate key points
        const keyPointsList = document.getElementById('keyPointsList');
        if (keyPointsList) {
            keyPointsList.innerHTML = '';
            const keyPoints = result.summary.key_points || [];
            if (keyPoints.length > 0) {
                keyPoints.forEach(point => {
                    const li = document.createElement('li');
                    li.textContent = point;
                    keyPointsList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No key points identified';
                li.style.color = 'var(--text-muted)';
                keyPointsList.appendChild(li);
            }
        }
        
        // Populate action items
        const actionItemsList = document.getElementById('actionItemsList');
        if (actionItemsList) {
            actionItemsList.innerHTML = '';
            const actionItems = result.summary.action_items || [];
            if (actionItems.length > 0) {
                actionItems.forEach(item => {
                    const li = document.createElement('li');
                    if (typeof item === 'object') {
                        li.innerHTML = `
                            <strong>${item.task}</strong>
                            ${item.assignee !== 'Unassigned' ? `<br><small>Assigned to: ${item.assignee}</small>` : ''}
                            ${item.deadline ? `<br><small>Deadline: ${item.deadline}</small>` : ''}
                        `;
                    } else {
                        li.textContent = item;
                    }
                    actionItemsList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No action items identified';
                li.style.color = 'var(--text-muted)';
                actionItemsList.appendChild(li);
            }
        }
        
        // Populate speakers info
        const speakersInfo = document.getElementById('speakersInfo');
        if (speakersInfo) {
            const speakers = result.speakers.speaker_list || [];
            const stats = result.speakers.statistics || {};
            
            if (speakers.length > 0) {
                let html = `<div class="speakers-summary"><p><strong>${speakers.length} speakers identified</strong></p></div>`;
                
                if (stats.speaker_stats) {
                    html += '<div class="speaker-stats">';
                    Object.entries(stats.speaker_stats).forEach(([speaker, stat]) => {
                        const percentage = stat.percentage || 0;
                        html += `
                            <div class="speaker-stat">
                                <div class="speaker-info">
                                    <span class="speaker-name">${speaker}</span>
                                    <span class="speaker-time">${stat.total_time}s (${percentage}%)</span>
                                </div>
                                <div class="speaker-bar">
                                    <div class="speaker-bar-fill" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        `;
                    });
                    html += '</div>';
                }
                
                speakersInfo.innerHTML = html;
            } else {
                speakersInfo.innerHTML = '<p style="color: var(--text-muted)">No speakers identified</p>';
            }
        }
        
        // Populate transcript
        this.displayTranscript(result.transcript.segments || []);
        
        this.showToast('Success', 'Meeting analysis completed successfully!', 'success');
    }
    
    displayTranscript(segments) {
        const transcriptContent = document.getElementById('transcriptContent');
        if (!transcriptContent) return;
        
        if (segments.length === 0) {
            transcriptContent.innerHTML = '<div class="loading">No transcript available</div>';
            return;
        }
        
        let html = '';
        segments.forEach((segment, index) => {
            const speakerClass = this.getSpeakerClass(segment.speaker);
            html += `
                <div class="transcript-segment" data-index="${index}">
                    <div class="segment-header">
                        <span class="speaker-label ${speakerClass}">${segment.speaker}</span>
                        <span class="timestamp">${segment.timestamp}</span>
                    </div>
                    <div class="segment-text">${segment.text}</div>
                </div>
            `;
        });
        
        transcriptContent.innerHTML = html;
    }
    
    getSpeakerClass(speaker) {
        const speakerNumber = speaker.match(/\d+/);
        if (speakerNumber) {
            const num = parseInt(speakerNumber[0]);
            return `speaker-${((num - 1) % 4) + 1}`;
        }
        return 'speaker-1';
    }
    
    cancelUpload() {
        this.selectedFile = null;
        this.resetUploadArea();
        this.hideUploadOptions();
    }
    
    cancelProcessing() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        
        this.currentJobId = null;
        this.showUploadSection();
        this.hideProcessingSection();
        this.showToast('Info', 'Processing cancelled', 'warning');
    }
    
    startNewAnalysis() {
        this.currentJobId = null;
        this.selectedFile = null;
        this.resetUploadArea();
        this.hideResultsSection();
        this.hideProcessingSection();
        this.showUploadSection();
    }
    
    resetUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <h3>Drop your meeting file here</h3>
                <p>Supports audio and video files (MP3, WAV, MP4, MOV, etc.)</p>
                <p class="file-limits">Maximum file size: 2GB</p>
                
                <button class="btn btn-primary" id="selectFileBtn">
                    <i class="fas fa-folder-open"></i>
                    Select File
                </button>
            `;
            
            // Re-attach event listener
            const selectFileBtn = uploadArea.querySelector('#selectFileBtn');
            selectFileBtn?.addEventListener('click', () => {
                document.getElementById('fileInput')?.click();
            });
        }
    }
    
    showUploadSection() {
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) uploadSection.style.display = 'block';
    }
    
    hideUploadSection() {
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) uploadSection.style.display = 'none';
    }
    
    showProcessingSection() {
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.style.display = 'block';
            processingSection.classList.add('fade-in');
        }
    }
    
    hideProcessingSection() {
        const processingSection = document.getElementById('processingSection');
        if (processingSection) processingSection.style.display = 'none';
    }
    
    showResultsSection() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.classList.add('fade-in');
        }
    }
    
    hideResultsSection() {
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) resultsSection.style.display = 'none';
    }
    
    updateProcessingStatus(status, progress) {
        const processingStatus = document.getElementById('processingStatus');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (processingStatus) processingStatus.textContent = status;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;
    }
    
    async downloadResults(format) {
        if (!this.currentJobId) {
            this.showToast('Error', 'No results to download', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.baseURL}/download/${this.currentJobId}/${format}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `meeting_results.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showToast('Success', `${format.toUpperCase()} file downloaded successfully!`, 'success');
            } else {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('Download error:', error);
            this.showToast('Error', error.message, 'error');
        }
    }
    
    async copyToClipboard(type) {
        let textToCopy = '';
        
        switch (type) {
            case 'summary':
                textToCopy = document.getElementById('summaryText')?.textContent || '';
                break;
            case 'keyPoints':
                const keyPoints = Array.from(document.querySelectorAll('#keyPointsList li'))
                    .map(li => li.textContent.trim())
                    .filter(text => text && !text.includes('No key points'));
                textToCopy = keyPoints.join('\n');
                break;
            case 'actionItems':
                const actionItems = Array.from(document.querySelectorAll('#actionItemsList li'))
                    .map(li => li.textContent.trim())
                    .filter(text => text && !text.includes('No action items'));
                textToCopy = actionItems.join('\n');
                break;
            case 'transcript':
                const segments = Array.from(document.querySelectorAll('.transcript-segment'))
                    .map(segment => {
                        const speaker = segment.querySelector('.speaker-label')?.textContent || '';
                        const timestamp = segment.querySelector('.timestamp')?.textContent || '';
                        const text = segment.querySelector('.segment-text')?.textContent || '';
                        return `[${timestamp}] ${speaker}: ${text}`;
                    });
                textToCopy = segments.join('\n\n');
                break;
        }
        
        if (!textToCopy) {
            this.showToast('Warning', 'No content to copy', 'warning');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.showToast('Success', 'Copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy error:', error);
            this.showToast('Error', 'Failed to copy to clipboard', 'error');
        }
    }
    
    toggleSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            const isVisible = searchContainer.style.display !== 'none';
            searchContainer.style.display = isVisible ? 'none' : 'flex';
            
            if (!isVisible) {
                const searchInput = document.getElementById('searchInput');
                searchInput?.focus();
            }
        }
    }
    
    closeSearch() {
        const searchContainer = document.getElementById('searchContainer');
        if (searchContainer) {
            searchContainer.style.display = 'none';
        }
        
        // Clear highlights
        this.clearSearchHighlights();
    }
    
    searchTranscript() {
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput?.value.trim().toLowerCase();
        
        if (!searchTerm) {
            this.showToast('Warning', 'Please enter a search term', 'warning');
            return;
        }
        
        this.clearSearchHighlights();
        
        const transcriptSegments = document.querySelectorAll('.transcript-segment .segment-text');
        let matchCount = 0;
        
        transcriptSegments.forEach(segment => {
            const text = segment.textContent;
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes(searchTerm)) {
                matchCount++;
                
                // Highlight matches
                const regex = new RegExp(`(${this.escapeRegExp(searchTerm)})`, 'gi');
                const highlightedText = text.replace(regex, '<mark class="search-highlight">$1</mark>');
                segment.innerHTML = highlightedText;
                
                // Scroll to first match
                if (matchCount === 1) {
                    segment.closest('.transcript-segment')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            }
        });
        
        if (matchCount > 0) {
            this.showToast('Success', `Found ${matchCount} matches`, 'success');
        } else {
            this.showToast('Info', 'No matches found', 'warning');
        }
    }
    
    clearSearchHighlights() {
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }
    
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    showToast(title, message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${title}</span>
                <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.style.transform = 'translateX(400px)';
                setTimeout(() => toastElement.remove(), 300);
            }
        }, 5000);
    }
}

// Add search highlight styles dynamically
const style = document.createElement('style');
style.textContent = `
    .search-highlight {
        background-color: rgba(255, 235, 59, 0.3);
        border-radius: 2px;
        padding: 2px 4px;
        font-weight: bold;
    }
    
    .speaker-stats {
        margin-top: 12px;
    }
    
    .speaker-stat {
        margin-bottom: 8px;
    }
    
    .speaker-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        font-size: 0.875rem;
    }
    
    .speaker-name {
        font-weight: 500;
    }
    
    .speaker-time {
        color: var(--text-muted);
        font-size: 0.75rem;
    }
    
    .speaker-bar {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .speaker-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
        border-radius: 2px;
        transition: width 0.3s ease;
    }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new MeetingAI();
});

// Add smooth scrolling for anchor links
document.addEventListener('click', (e) => {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});

// Add loading animation to buttons
document.addEventListener('click', (e) => {
    if (e.target.matches('.btn') || e.target.closest('.btn')) {
        const btn = e.target.matches('.btn') ? e.target : e.target.closest('.btn');
        
        // Don't modify if it's a cancel or secondary action
        if (btn.classList.contains('btn-secondary') || btn.id === 'cancelUpload' || btn.id === 'cancelProcessing') {
            return;
        }
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.style.opacity = '0.7';
        
        setTimeout(() => {
            if (btn.disabled) {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.style.opacity = '';
            }
        }, 1000);
    }
});