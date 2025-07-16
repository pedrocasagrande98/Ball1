document.addEventListener('DOMContentLoaded', () => {
    const { jsPDF } = window.jspdf;

    // --- SELEÇÃO DE ELEMENTOS GLOBAIS ---
    let currentImageUrl = 'imagem.png';
    const setupScreen = document.getElementById('setup-screen');
    const useDefaultBtn = document.getElementById('use-default-btn');
    const uploadTriggerBtn = document.getElementById('upload-trigger-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const mainAppWrapper = document.getElementById('main-app-wrapper');
    const leftInput = document.getElementById('left-input');
    const rightInput = document.getElementById('right-input');
    const leftImagesContainer = document.getElementById('left-images');
    const rightImagesContainer = document.getElementById('right-images');
    const captureArea = document.getElementById('capture-area');
    const inputContainers = document.querySelectorAll('.input-container');
    const exportWithNumbersBtn = document.getElementById('export-with-numbers-btn');
    const exportWithoutNumbersBtn = document.getElementById('export-without-numbers-btn');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const pagesToGenerateInput = document.getElementById('pages-to-generate');
    const progressIndicator = document.getElementById('progress-indicator');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const batchResultsArea = document.getElementById('batch-results-area');
    const batchResultsList = document.getElementById('batch-results-list');
    
    // --- LÓGICA DE CONFIGURAÇÃO INICIAL (CORRIGIDO) ---
    function startApp() {
        setupScreen.style.display = 'none';
        mainAppWrapper.style.display = 'block';
        updateDisplay();
    }
    
    useDefaultBtn.addEventListener('click', startApp);
    uploadTriggerBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type === "image/png") {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageUrl = e.target.result;
                startApp();
            };
            reader.readAsDataURL(file);
        } else {
            alert("Por favor, selecione um arquivo no formato .png");
        }
    });

    // --- FUNÇÃO AUXILIAR PARA EMBARALHAR (CORRIGIDO) ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- LÓGICA PRINCIPAL DE PLOTAGEM ---
    function plotImages(count, container) {
        container.innerHTML = '';
        if (count <= 0 || isNaN(count)) return;

        const selectedMode = document.querySelector('input[name="layout-mode"]:checked').value;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        let cols, rows, imageSize;

        let density = count;
        if (selectedMode === 'chaos') {
            density = Math.max(15, count);
        }
        cols = Math.ceil(Math.sqrt(density * (containerWidth / containerHeight)));
        rows = Math.ceil(density / cols);
        while (cols * rows < count && selectedMode !== 'chaos') {
             cols++; rows = Math.ceil(count / cols);
        }
        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;
        imageSize = Math.min(cellWidth, cellHeight) - 10;
        
        if (selectedMode === 'chaos') {
            let possiblePositions = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    possiblePositions.push({ 
                        top: r * cellHeight + (cellHeight - imageSize) / 2, 
                        left: c * cellWidth + (cellWidth - imageSize) / 2 
                    });
                }
            }
            shuffleArray(possiblePositions);
            const finalPositions = possiblePositions.slice(0, count);
            finalPositions.forEach(pos => {
                const img = document.createElement('img');
                img.src = currentImageUrl;
                img.style.width = `${imageSize}px`;
                img.style.height = `${imageSize}px`;
                img.style.left = `${pos.left}px`;
                img.style.top = `${pos.top}px`;
                img.style.transform = `rotate(${Math.random() * 30 - 15}deg)`;
                container.appendChild(img);
            });
        } else {
            for (let i = 0; i < count; i++) {
                const img = document.createElement('img');
                img.src = currentImageUrl;
                img.style.width = `${imageSize}px`;
                img.style.height = `${imageSize}px`;
                const gridRow = Math.floor(i / cols);
                const gridCol = i % cols;
                const baseLeft = gridCol * cellWidth;
                const baseTop = gridRow * cellHeight;
                let finalLeft, finalTop;
                if (selectedMode === 'random') {
                    finalLeft = baseLeft + (Math.random() * (cellWidth - imageSize));
                    finalTop = baseTop + (Math.random() * (cellHeight - imageSize));
                } else {
                    finalLeft = baseLeft + (cellWidth - imageSize) / 2;
                    finalTop = baseTop + (cellHeight - imageSize) / 2;
                }
                finalLeft = Math.max(0, Math.min(finalLeft, containerWidth - imageSize));
                finalTop = Math.max(0, Math.min(finalTop, containerHeight - imageSize));
                img.style.left = `${finalLeft}px`;
                img.style.top = `${finalTop}px`;
                container.appendChild(img);
            }
        }
    }

    function updateDisplay() {
        plotImages(parseInt(leftInput.value, 10), leftImagesContainer);
        plotImages(parseInt(rightInput.value, 10), rightImagesContainer);
    }
    
    leftInput.addEventListener('input', updateDisplay);
    rightInput.addEventListener('input', updateDisplay);
    window.addEventListener('resize', updateDisplay);
    document.querySelectorAll('input[name="layout-mode"]').forEach(radio => {
        radio.addEventListener('change', updateDisplay);
    });

    // --- LÓGICA DE EXPORTAÇÃO E GERAÇÃO EM LOTE (CORRIGIDO) ---
    function triggerDownload(canvas, filename) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        link.click();
    }
    
    exportWithNumbersBtn.addEventListener('click', () => {
        html2canvas(captureArea).then(canvas => triggerDownload(canvas, 'layout_com_numeros.png'));
    });
    
    exportWithoutNumbersBtn.addEventListener('click', () => {
        inputContainers.forEach(c => c.style.visibility = 'hidden');
        html2canvas(captureArea).then(canvas => {
            inputContainers.forEach(c => c.style.visibility = 'visible');
            triggerDownload(canvas, 'layout_so_imagens.png');
        });
    });
    
    generatePdfBtn.addEventListener('click', async function() {
        const totalPages = parseInt(pagesToGenerateInput.value, 10);
        if (isNaN(totalPages) || totalPages <= 0) {
            alert("Por favor, insira um número válido de páginas.");
            return;
        }
        generatePdfBtn.disabled = true;
        generatePdfBtn.textContent = 'Gerando...';
        progressIndicator.style.display = 'block';
        progressBar.style.width = '0%';
        batchResultsArea.style.display = 'none';
        batchResultsList.innerHTML = '';
        let pdf = null;
        const CHUNK_SIZE = 10;
        for (let i = 0; i < totalPages; i++) {
            if (i % CHUNK_SIZE === 0) {
                pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            }
            const pageNumberInChunk = i % CHUNK_SIZE;
            const leftCount = i * 2 + 1;
            const rightCount = i * 2 + 2;
            progressText.textContent = `Gerando página ${i + 1} de ${totalPages}...`;
            progressBar.style.width = `${((i + 1) / totalPages) * 100}%`;
            leftInput.value = leftCount;
            rightInput.value = rightCount;
            updateDisplay();
            await new Promise(resolve => setTimeout(resolve, 100));
            inputContainers.forEach(c => c.style.visibility = 'hidden');
            const canvas = await html2canvas(captureArea);
            inputContainers.forEach(c => c.style.visibility = 'visible');
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            if (pageNumberInChunk > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            if ((i + 1) % CHUNK_SIZE === 0 || (i + 1) === totalPages) {
                const startPage = i - pageNumberInChunk + 1;
                const endPage = i + 1;
                const pdfBlob = pdf.output('blob');
                const blobUrl = URL.createObjectURL(pdfBlob);
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.href = blobUrl;
                link.textContent = `Baixar PDF (Páginas ${startPage}-${endPage})`;
                link.download = `lote_paginas_${startPage}-${endPage}.pdf`;
                listItem.appendChild(link);
                batchResultsList.appendChild(listItem);
            }
        }
        progressText.textContent = 'Geração concluída!';
        batchResultsArea.style.display = 'block';
        generatePdfBtn.disabled = false;
        generatePdfBtn.textContent = 'Gerar Arquivos em Lote';
    });
});
