// File storage array
let uploadedFiles = [];

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const filesSection = document.getElementById('filesSection');
const filesList = document.getElementById('filesList');

// Event listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);
uploadArea.addEventListener('click', () => fileInput.click());

// Drag and drop events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles({ target: { files } });
});

// Handle file selection
function handleFiles(e) {
    const files = Array.from(e.target.files);

    files.forEach(file => {
        const fileData = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
            file: file,
            url: URL.createObjectURL(file),
            uploadDate: new Date().toLocaleString()
        };

        uploadedFiles.push(fileData);
    });

    displayFiles();
    fileInput.value = ''; // Reset input
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Get file icon based on type
function getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('zip') || type.includes('rar')) return '🗜️';
    if (type.includes('text')) return '📃';
    return '📎';
}

// Display uploaded files
function displayFiles() {
    if (uploadedFiles.length === 0) {
        filesSection.classList.remove('active');
        return;
    }

    filesSection.classList.add('active');
    filesList.innerHTML = '';

    uploadedFiles.forEach(fileData => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${getFileIcon(fileData.type)}</div>
                <div class="file-details">
                    <h3>${fileData.name}</h3>
                    <p>${fileData.size} • ${fileData.uploadDate}</p>
                </div>
            </div>
            <div class="file-actions">
                <button class="action-btn download-btn" onclick="downloadFile('${fileData.id}')">Download</button>
                <button class="action-btn share-btn" onclick="shareFile('${fileData.id}')">Share</button>
                <button class="action-btn delete-btn" onclick="deleteFile('${fileData.id}')">Delete</button>
            </div>
        `;
        filesList.appendChild(fileItem);
    });
}

// Download file
function downloadFile(id) {
    const fileData = uploadedFiles.find(f => f.id == id);
    if (!fileData) return;

    const link = document.createElement('a');
    link.href = fileData.url;
    link.download = fileData.name;
    link.click();
}

// Share file
function shareFile(id) {
    const fileData = uploadedFiles.find(f => f.id == id);
    if (!fileData) return;

    // Create a shareable link (in a real app, this would be a server URL)
    const shareText = `Check out this file: ${fileData.name}`;

    if (navigator.share) {
        navigator.share({
            title: 'File Share',
            text: shareText,
            url: fileData.url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        const tempInput = document.createElement('input');
        tempInput.value = fileData.url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('Link copied to clipboard!');
    }
}

// Delete file
function deleteFile(id) {
    if (confirm('Are you sure you want to delete this file?')) {
        uploadedFiles = uploadedFiles.filter(f => f.id != id);
        displayFiles();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('File Sharing App initialized');
});
