document.addEventListener('DOMContentLoaded', () => {
    // Importa o construtor do jsPDF a partir do objeto window
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
    const exportWithNumbersBtn = document.getElementById('export-with-numbers-btn');
    const exportWithoutNumbersBtn = document.getElementById('export-without-numbers-btn');
    const inputContainers = document.querySelectorAll('.input-container');
    const generatePdfBtn = document.getElementById('generate-pdf-btn');
    const pagesToGenerateInput = document.getElementById('pages-to-generate');
    const progressIndicator = document.getElementById('progress-indicator');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const randomLayoutToggle = document.getElementById('random-layout-toggle');

    // --- LÓGICA DA TELA DE CONFIGURAÇÃO ---
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

    // --- LÓGICA DA APLICAÇÃO PRINCIPAL ---
    
    /**
     * Função de plotagem de imagens reescrita para suportar
     * tanto o layout em grade quanto o layout aleatório (sem sobreposição).
     */
    function plotImages(count, container) {
        container.innerHTML = '';
        if (count <= 0 || isNaN(count)) return;

        const isRandom = randomLayoutToggle.checked;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const ratio = containerWidth / containerHeight;
        
        let cols = Math.ceil(Math.sqrt(count * ratio));
        let rows = Math.ceil(count / cols);
        while (cols * rows < count) {
            cols++;
            rows = Math.ceil(count / cols);
        }

        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;
        const imageSize = Math.min(cellWidth, cellHeight) - 10;

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

            if (isRandom) {
                const maxOffsetX = cellWidth - imageSize;
                const maxOffsetY = cellHeight - imageSize;
                const randomOffsetX = Math.random() * maxOffsetX;
                const randomOffsetY = Math.random() * maxOffsetY;
                finalLeft = baseLeft + randomOffsetX;
                finalTop = baseTop + randomOffsetY;
            } else {
                const offsetX = (cellWidth - imageSize) / 2;
                const offsetY = (cellHeight - imageSize) / 2;
                finalLeft = baseLeft + offsetX;
                finalTop = baseTop + offsetY;
            }
            
            img.style.left = `${finalLeft}px`;
            img.style.top = `${finalTop}px`;

            container.appendChild(img);
        }
    }

    function updateDisplay() {
        plotImages(parseInt(leftInput.value, 10), leftImagesContainer);
        plotImages(parseInt(rightInput.value, 10), rightImagesContainer);
    }

    leftInput.addEventListener('input', updateDisplay);
    rightInput.addEventListener('input', updateDisplay);
    window.addEventListener('resize', updateDisplay);
    randomLayoutToggle.addEventListener('change', updateDisplay);

    // --- LÓGICA DE EXPORTAÇÃO E GERAÇÃO EM LOTE ---

    function triggerDownload(canvas, filename) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename;
        link.click();
    }

    exportWithNumbersBtn.addEventListener('click', () => {
        html2canvas(captureArea).then(canvas => {
            triggerDownload(canvas, 'com_numeros.png');
        });
    });

    exportWithoutNumbersBtn.addEventListener('click', () => {
        inputContainers.forEach(container => container.style.visibility = 'hidden');
        html2canvas(captureArea).then(canvas => {
            inputContainers.forEach(container => container.style.visibility = 'visible');
            triggerDownload(canvas, 'so_imagens.png');
        });
    });

    generatePdfBtn.addEventListener('click', async () => {
        const totalPages = parseInt(pagesToGenerateInput.value, 10);
        if (isNaN(totalPages) || totalPages <= 0) {
            alert("Por favor, insira um número válido de páginas.");
            return;
        }
        generatePdfBtn.disabled = true;
        generatePdfBtn.textContent = 'Gerando...';
        progressIndicator.style.display = 'block';
        progressBar.style.width = '0%';
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        for (let i = 0; i < totalPages; i++) {
            const leftCount = i * 2 + 1;
            const rightCount = i * 2 + 2;
            progressText.textContent = `Gerando página ${i + 1} de ${totalPages} (E:${leftCount}, D:${rightCount})...`;
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
            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
        pdf.save(`lote_${totalPages}_paginas.pdf`);
        generatePdfBtn.disabled = false;
        generatePdfBtn.textContent = 'Gerar PDF em Lote';
        progressIndicator.style.display = 'none';
    });
});