// Get elements from HTML
const tickersInput = document.getElementById('tickers');
const analyzeBtn = document.getElementById('analyzeBtn');
const csvFileInput = document.getElementById('csvFile');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const resultsSection = document.getElementById('results');
const analysisOutput = document.getElementById('analysisOutput');

let sectorChart = null;
let peChart = null;

// When button is clicked, analyze the portfolio
analyzeBtn.addEventListener('click', async function() {
    // Get tickers either from text input or CSV file
    let tickers = tickersInput.value.trim();
    
    // If CSV file is selected, read it
    if (csvFileInput.files.length > 0) {
        const file = csvFileInput.files[0];
        tickers = await readCSVFile(file);
    }
    
    if (!tickers) {
        alert('Please enter tickers or upload a CSV file!');
        return;
    }
    
    // Show loading message
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    
    try {
        // Send tickers to Python backend
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tickers: tickers })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show the analysis results
            analysisOutput.textContent = data.analysis;
            resultsSection.style.display = 'block';
            
            // Draw charts (only if we have stock data)
            if (data.stocks_data) {
                drawCharts(data.stocks_data);
            }
            
            // Scroll to results
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error connecting to backend: ' + error.message);
    } finally {
        // Reset button
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Portfolio';
    }
});

// Download results as PDF
downloadPdfBtn.addEventListener('click', function() {
    const element = document.getElementById('results');
    const opt = {
        margin: 10,
        filename: 'portfolio-analysis.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    html2pdf().set(opt).from(element).save();
});

async function readCSVFile(file) {
    return new Promise((resolve, reject) => {
        const fileName = file.name.toLowerCase();
        
        // Handle Excel files (.xlsx, .xls)
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // For Excel, we'll use a simple approach: just extract text
                // In production, you'd use a library like xlsx.js
                alert('Excel support coming soon! Please convert to CSV.');
                reject('Excel not yet supported');
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Handle CSV and TXT files
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                // Parse: split by newlines and commas, remove empty lines
                const tickers = text
                    .split(/[\n,;]/)
                    .map(t => t.trim().toUpperCase())
                    .filter(t => t.length > 0 && t.match(/^[A-Z]+$/))
                    .join(',');
                resolve(tickers);
            };
            reader.onerror = () => reject('Error reading file');
            reader.readAsText(file);
        }
    });
}

function drawCharts(stocksData) {
    // Filter valid stocks
    const validStocks = stocksData.filter(s => !s.error);
    
    if (validStocks.length === 0) return;
    
    // Draw charts
    drawSectorChart(validStocks);
    drawPEChart(validStocks);
    
    // Display summary stats
    displaySummaryStats(validStocks);
    
    // Display individual stocks as cards
    displayStocksGrid(validStocks);
    
    // Display analysis summary + table
    displayAnalysisTable(validStocks);
}

function displaySummaryStats(stocks) {
    const summaryBox = document.getElementById('summaryStats');
    
    // Calculate stats
    const peRatios = stocks.map(s => s.pe_ratio).filter(pe => typeof pe === 'number');
    const avgPE = peRatios.length > 0 ? (peRatios.reduce((a, b) => a + b) / peRatios.length).toFixed(2) : 'N/A';
    
    const dividends = stocks.map(s => s.dividend_yield).filter(d => typeof d === 'number' && d > 0);
    const avgDividend = dividends.length > 0 ? ((dividends.reduce((a, b) => a + b) / dividends.length) * 100).toFixed(2) : '0.00';
    
    const sectors = {};
    stocks.forEach(s => {
        const sec = s.sector || 'Unknown';
        sectors[sec] = (sectors[sec] || 0) + 1;
    });
    
    let sectorCount = Object.keys(sectors).length;
    
    summaryBox.innerHTML = `
        <div class="summary-stat">
            <span class="summary-stat-label">Total Holdings:</span>
            <span class="summary-stat-value">${stocks.length}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Sectors:</span>
            <span class="summary-stat-value">${sectorCount}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Avg P/E:</span>
            <span class="summary-stat-value">${avgPE}</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Avg Dividend:</span>
            <span class="summary-stat-value">${avgDividend}%</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Div Payers:</span>
            <span class="summary-stat-value">${dividends.length}/${stocks.length}</span>
        </div>
    `;
}

function displayAnalysisTable(stocks) {
    const analysisSummaryDiv = document.getElementById('analysisSummary');
    const tableBody = document.getElementById('stocksTableBody');
    
    // Build summary text
    const sectors = {};
    stocks.forEach(s => {
        const sec = s.sector || 'Unknown';
        sectors[sec] = (sectors[sec] || 0) + 1;
    });
    
    const peRatios = stocks.map(s => s.pe_ratio).filter(pe => typeof pe === 'number');
    const avgPE = peRatios.length > 0 ? (peRatios.reduce((a, b) => a + b) / peRatios.length).toFixed(2) : 'N/A';
    
    const dividends = stocks.map(s => s.dividend_yield).filter(d => typeof d === 'number' && d > 0);
    const avgDividend = dividends.length > 0 ? ((dividends.reduce((a, b) => a + b) / dividends.length) * 100).toFixed(2) : '0.00';
    
    let sectorBreakdown = '';
    for (const [sector, count] of Object.entries(sectors)) {
        sectorBreakdown += `  - ${sector}: ${count} holding(s)\n`;
    }
    
    const summaryText = `PORTFOLIO OVERVIEW
Total Holdings: ${stocks.length} stocks
Sectors: ${Object.keys(sectors).length}

Sector Breakdown:
${sectorBreakdown}

RISK ASSESSMENT
Average P/E Ratio: ${avgPE}
${avgPE < 15 ? '✓ Portfolio appears UNDERVALUED (lower P/E ratios)' : avgPE < 25 ? '○ Portfolio appears FAIRLY VALUED' : '⚠ Portfolio appears EXPENSIVE (higher P/E ratios)'}

INCOME ANALYSIS
Dividend-Paying Stocks: ${dividends.length}/${stocks.length}
Average Dividend Yield: ${avgDividend}%`;
    
    analysisSummaryDiv.textContent = summaryText;
    
    // Populate table
    tableBody.innerHTML = '';
    stocks.forEach(stock => {
        const pe = typeof stock.pe_ratio === 'number' ? stock.pe_ratio.toFixed(2) : 'N/A';
        const div = typeof stock.dividend_yield === 'number' ? (stock.dividend_yield * 100).toFixed(2) : '0.00';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stock.ticker}</strong></td>
            <td>$${stock.price}</td>
            <td>${pe}</td>
            <td>${div}%</td>
            <td>${stock.sector || 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
}

function displayStocksGrid(stocks) {
    const stocksGrid = document.getElementById('stocksGrid');
    stocksGrid.innerHTML = '';
    
    stocks.forEach(stock => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        
        const pe = typeof stock.pe_ratio === 'number' ? stock.pe_ratio.toFixed(2) : 'N/A';
        const div = typeof stock.dividend_yield === 'number' ? (stock.dividend_yield * 100).toFixed(2) : '0.00';
        
        card.innerHTML = `
            <h4>${stock.ticker}</h4>
            <p><strong>Price:</strong> $${stock.price}</p>
            <p><strong>P/E:</strong> ${pe}</p>
            <p><strong>Div Yield:</strong> ${div}%</p>
            <p><strong>Sector:</strong> ${stock.sector || 'N/A'}</p>
        `;
        
        stocksGrid.appendChild(card);
    });
}

function drawSectorChart(stocks) {
    // Count stocks by sector
    const sectors = {};
    stocks.forEach(stock => {
        const sector = stock.sector || 'Unknown';
        sectors[sector] = (sectors[sector] || 0) + 1;
    });
    
    const ctx = document.getElementById('sectorChart').getContext('2d');
    
    // Destroy old chart if it exists
    if (sectorChart) sectorChart.destroy();
    
    // Create new chart
    sectorChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(sectors),
            datasets: [{
                data: Object.values(sectors),
                backgroundColor: [
    '#8b9d6f',
    '#a4b896',
    '#c4d4a8',
    '#7a8f5e',
    '#9dac7f',
    '#b5c4a0',
    '#6b8050',
    '#a39f7a'
],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: 'Sector Breakdown',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });
}

function drawPEChart(stocks) {
    // Get P/E ratios
    const peData = stocks.map(s => ({
        ticker: s.ticker,
        pe: s.pe_ratio
    })).filter(s => typeof s.pe === 'number');
    
    if (peData.length === 0) return;
    
    const ctx = document.getElementById('peChart').getContext('2d');
    
    // Destroy old chart if it exists
    if (peChart) peChart.destroy();
    
    // Create new chart
    peChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: peData.map(d => d.ticker),
            datasets: [{
                label: 'P/E Ratio',
                data: peData.map(d => d.pe),
                backgroundColor: peData.map(d => {
    if (d.pe < 15) return '#7a8f5e';      // Light green (undervalued)
    if (d.pe < 25) return '#a4b896';      // Medium green (fair)
    return '#6b8050';                      // Dark green (expensive)
}),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'P/E Ratio Analysis',
                    font: { size: 16, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}