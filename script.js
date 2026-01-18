/**
 * Band Stage Plot Tool Logic (Zoomable Template Edition)
 */

const canvas = document.getElementById('canvas');
const zoomContainer = document.getElementById('zoom-container');
const propertiesPanel = document.getElementById('properties');
const rotateSlider = document.getElementById('rotate-slider');
const fontSizeInput = document.getElementById('font-size-input');
const contentInput = document.getElementById('content-input');
const deleteBtn = document.getElementById('delete-btn');
const viewport = document.getElementById('viewport');

let selectedElement = null;
let isDragging = false;
let isResizing = false;
let isPanning = false;
let resizeDir = '';
let currentScale = 1.0;

// Mouse tracking with scale correction
let startX, startY, startWidth, startHeight, startLeft, startTop;
let panStartX, panStartY, scrollLeftStart, scrollTopStart;

// --- Icon Factories ---

function createPersonIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.innerHTML = `
        <circle cx="50" cy="50" r="30" fill="none" stroke="black" stroke-width="4"/>
    `;
    return svg;
}

function createMicIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.innerHTML = `
        <circle cx="50" cy="50" r="25" fill="none" stroke="black" stroke-width="4"/>
        <path d="M50 100 L50 0 M42 12 L50 0 L58 12" fill="none" stroke="black" stroke-width="4" stroke-linecap="round"/>
    `;
    return svg;
}

function createSquareIcon(text = "") {
    const div = document.createElement('div');
    div.className = 'square-element';
    div.style.border = '2px solid black';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.fontWeight = 'bold';
    div.style.fontSize = '14px';
    div.style.textAlign = 'center';
    div.textContent = text;
    return div;
}

function createTextElement(text = "TEXT") {
    const div = document.createElement('div');
    div.className = 'text-element';
    div.style.fontSize = '15px';
    div.style.fontWeight = 'bold';
    div.textContent = text;
    return div;
}

// --- Core Helper Logic ---

function addElement(type) {
    const el = document.createElement('div');
    el.className = 'canvas-element';
    el.style.position = 'absolute';

    // Calculate center of viewport relative to canvas
    const vRect = viewport.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();

    const centerX = (vRect.left + vRect.width / 2 - cRect.left) / currentScale;
    const centerY = (vRect.top + vRect.height / 2 - cRect.top) / currentScale;

    el.style.left = `${centerX - 40}px`;
    el.style.top = `${centerY - 40}px`;

    el.dataset.rotation = "0";
    el.dataset.type = type;

    let content;
    switch (type) {
        case 'person':
            el.style.width = '60px';
            el.style.height = '60px';
            content = createPersonIcon();
            break;
        case 'mic':
            el.style.width = '60px';
            el.style.height = '60px';
            content = createMicIcon();
            break;
        case 'square':
            el.style.width = '90px';
            el.style.height = '75px';
            content = createSquareIcon("");
            break;
        case 'text':
            content = createTextElement();
            break;
    }

    el.appendChild(content);
    canvas.appendChild(el);

    addResizeHandles(el, type);

    el.addEventListener('mousedown', (e) => {
        if (isResizing) return;
        isDragging = true;
        selectElement(el);

        // Account for scale
        const mouseX = (e.clientX - canvas.getBoundingClientRect().left) / currentScale;
        const mouseY = (e.clientY - canvas.getBoundingClientRect().top) / currentScale;

        startX = mouseX - el.offsetLeft;
        startY = mouseY - el.offsetTop;
        e.stopPropagation();
    });

    selectElement(el);
}

function addResizeHandles(el, type) {
    const dirs = type === 'square' || type === 'text' ? ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] : ['se'];

    dirs.forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${dir}`;
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeDir = dir;

            startX = e.clientX;
            startY = e.clientY;

            startWidth = el.offsetWidth;
            startHeight = el.offsetHeight;
            startLeft = el.offsetLeft;
            startTop = el.offsetTop;

            selectElement(el);
            e.stopPropagation();
            e.preventDefault();
        });
        el.appendChild(handle);
    });
}

function selectElement(el) {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
    }
    selectedElement = el;
    if (el) {
        selectedElement.classList.add('selected');
        propertiesPanel.classList.remove('hidden');
        rotateSlider.value = el.dataset.rotation || 0;

        const type = el.dataset.type;
        const isTextual = type === 'text' || type === 'square';
        document.getElementById('font-size-group').classList.toggle('hidden', !isTextual);
        document.getElementById('content-group').classList.toggle('hidden', !isTextual);

        if (isTextual) {
            const inner = el.querySelector('.text-element, .square-element');
            fontSizeInput.value = parseInt(inner.style.fontSize) || (type === 'square' ? 14 : 15);
            contentInput.value = inner.textContent;
        }
    } else {
        propertiesPanel.classList.add('hidden');
    }
}

// Global Interaction Logic
window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        viewport.scrollLeft = scrollLeftStart - dx;
        viewport.scrollTop = scrollTopStart - dy;
        return;
    }

    if (!selectedElement) return;

    if (isDragging) {
        const mouseX = (e.clientX - canvas.getBoundingClientRect().left) / currentScale;
        const mouseY = (e.clientY - canvas.getBoundingClientRect().top) / currentScale;

        const x = mouseX - startX;
        const y = mouseY - startY;
        selectedElement.style.left = `${x}px`;
        selectedElement.style.top = `${y}px`;
    } else if (isResizing) {
        const dx = (e.clientX - startX) / currentScale;
        const dy = (e.clientY - startY) / currentScale;

        const type = selectedElement.dataset.type;
        const isProportional = type === 'person' || type === 'mic';

        if (isProportional) {
            const scaleFactor = 1 + dx / startWidth;
            const size = Math.max(20, startWidth * scaleFactor);
            selectedElement.style.width = `${size}px`;
            selectedElement.style.height = `${size}px`;
        } else {
            if (resizeDir.includes('e')) selectedElement.style.width = `${Math.max(20, startWidth + dx)}px`;
            if (resizeDir.includes('s')) selectedElement.style.height = `${Math.max(20, startHeight + dy)}px`;

            if (resizeDir.includes('w')) {
                const newWidth = Math.max(20, startWidth - dx);
                if (newWidth > 20) {
                    selectedElement.style.width = `${newWidth}px`;
                    selectedElement.style.left = `${startLeft + dx}px`;
                }
            }
            if (resizeDir.includes('n')) {
                const newHeight = Math.max(20, startHeight - dy);
                if (newHeight > 20) {
                    selectedElement.style.height = `${newHeight}px`;
                    selectedElement.style.top = `${startTop + dy}px`;
                }
            }
        }
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    isPanning = false;
    viewport.classList.remove('dragging');
});

// Panning Support
viewport.addEventListener('mousedown', (e) => {
    if (e.target === viewport || e.target === canvas) {
        if (e.target === canvas) {
            const isElementClick = [...canvas.children].some(child =>
                child.contains(e.target) && child !== canvas
            );
            // This check is slightly redundant due to stopPropagation in elements, 
            // but helpful if clicking exact background of canvas
        }

        isPanning = true;
        viewport.classList.add('dragging');
        panStartX = e.clientX;
        panStartY = e.clientY;
        scrollLeftStart = viewport.scrollLeft;
        scrollTopStart = viewport.scrollTop;

        if (e.target === canvas || e.target === viewport) {
            selectElement(null);
        }
    }
});

// Keyboard Delete Support
window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        deleteSelected();
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.target === canvas) {
        selectElement(null);
    }
});

// --- Property Controls ---

rotateSlider.addEventListener('input', (e) => {
    if (selectedElement) {
        const value = e.target.value;
        selectedElement.dataset.rotation = value;
        selectedElement.style.transform = `rotate(${value}deg)`;
    }
});

fontSizeInput.addEventListener('input', (e) => {
    if (selectedElement) {
        const inner = selectedElement.querySelector('.text-element, .square-element');
        if (inner) inner.style.fontSize = `${e.target.value}px`;
    }
});

contentInput.addEventListener('input', (e) => {
    if (selectedElement) {
        const inner = selectedElement.querySelector('.text-element, .square-element');
        if (inner) inner.textContent = e.target.value;
    }
});

function deleteSelected() {
    if (selectedElement) {
        selectedElement.remove();
        selectElement(null);
    }
}

deleteBtn.addEventListener('click', deleteSelected);

// --- Zoom Logic ---

function setZoom(scale) {
    currentScale = Math.max(0.2, Math.min(5, scale));
    zoomContainer.style.transform = `scale(${currentScale})`;
}

document.getElementById('zoom-in').addEventListener('click', () => setZoom(currentScale + 0.05));
document.getElementById('zoom-out').addEventListener('click', () => setZoom(currentScale - 0.05));
document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1.0));

// Pinch/Scroll Zoom
window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.01; // Increased sensitivity
        setZoom(currentScale + delta);
    }
}, { passive: false });

// --- Toolbar Listeners ---
document.getElementById('add-person').addEventListener('click', () => addElement('person'));
document.getElementById('add-mic').addEventListener('click', () => addElement('mic'));
document.getElementById('add-square').addEventListener('click', () => addElement('square'));
document.getElementById('add-text').addEventListener('click', () => addElement('text'));

// Initial centering
window.addEventListener('load', () => {
    viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
});
