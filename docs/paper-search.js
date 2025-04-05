// Main search functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing paper search...');
    
    // Clear any existing database to fix subject issues
    if (window.location.href.includes('phycambridge.html')) {
        console.log('Physics page detected - clearing old database');
        localStorage.removeItem('paperDatabase');
        localStorage.removeItem('paperDbLastUpdate');
    }
    
    // Initialize search components
    initSearch();
    
    // Create or update the paper database
    updatePaperDatabase();
});

// Initialize search UI components
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    if (!searchInput || !searchResults) {
        console.log('Search elements not found on page');
        return;
    }
    
    // Add event listeners
    searchInput.addEventListener('input', debounce(function() {
        const query = searchInput.value.trim();
        
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }
        
        performSearch(query);
    }, 300)); // 300ms debounce
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
    
    // Handle Enter key for search
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            performSearch(searchInput.value.trim());
        }
    });
}

// More robust subject detection function
function detectCurrentSubject() {
    // First try to detect from URL - most reliable method
    const currentUrl = window.location.href.toLowerCase();
    
    if (currentUrl.includes('phycambridge.html') || currentUrl.includes('/physics/')) {
        console.log('Subject detected from URL: Physics');
        return 'Physics';
    } else if (currentUrl.includes('chemcambridge.html') || currentUrl.includes('/chemistry/')) {
        console.log('Subject detected from URL: Chemistry');
        return 'Chemistry';
    } else if (currentUrl.includes('biocambridge.html') || currentUrl.includes('/biology/')) {
        console.log('Subject detected from URL: Biology');
        return 'Biology';
    } else if (currentUrl.includes('mathcambridge.html') || currentUrl.includes('/mathematics/')) {
        console.log('Subject detected from URL: Mathematics');
        return 'Mathematics';
    }
    
    // Fallback to page title detection
    const pageTitle = document.title || '';
    
    if (pageTitle.includes('Phys')) {
        console.log('Subject detected from title: Physics');
        return 'Physics';
    } else if (pageTitle.includes('Chem')) {
        console.log('Subject detected from title: Chemistry');
        return 'Chemistry';
    } else if (pageTitle.includes('Bio')) {
        console.log('Subject detected from title: Biology');
        return 'Biology';
    } else if (pageTitle.includes('Math')) {
        console.log('Subject detected from title: Mathematics');
        return 'Mathematics';
    }
    
    // Try to detect from page content
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
        const text = h1.textContent.toLowerCase();
        if (text.includes('physics')) {
            console.log('Subject detected from H1: Physics');
            return 'Physics';
        } else if (text.includes('chemistry')) {
            console.log('Subject detected from H1: Chemistry');
            return 'Chemistry';
        } else if (text.includes('biology')) {
            console.log('Subject detected from H1: Biology');
            return 'Biology';
        } else if (text.includes('mathematics') || text.includes('maths')) {
            console.log('Subject detected from H1: Mathematics');
            return 'Mathematics';
        }
    }
    
    // Default fallback
    console.log('Subject detection failed, using Unknown');
    return 'Unknown';
}

// Create a database of all papers on the current page
function updatePaperDatabase() {
    // Get the current page/subject info
    const subject = detectCurrentSubject();
    console.log(`Detected subject: ${subject}`);
    
    // Get all paper links
    const paperLinks = document.querySelectorAll('.paper-link');
    const papers = [];
    
    // Process each paper
    paperLinks.forEach((link, index) => {
        // Get the title (Paper X Variant Y)
        const titleElement = link.querySelector('span');
        if (!titleElement) return;
        
        const title = titleElement.textContent.trim();
        
        // Get the session (May/June 2023, etc.)
        const sectionElement = link.closest('div').parentElement;
        const sessionElement = sectionElement.querySelector('.text-blue-400');
        const session = sessionElement ? sessionElement.textContent.trim() : '';
        
        // Extract paper metadata
        const paperMatch = title.match(/Paper (\d+) Variant (\d+)/i);
        if (!paperMatch) return;
        
        const paperNumber = paperMatch[1];
        const variant = paperMatch[2];
        
        // Extract year
        const yearMatch = session.match(/\d{4}/);
        const year = yearMatch ? yearMatch[0] : '';
        
        // Get exam session
        let examSession = '';
        if (session.includes('May') || session.includes('June')) examSession = 'Summer';
        else if (session.includes('Oct') || session.includes('Nov')) examSession = 'Winter';
        else if (session.includes('Feb') || session.includes('Mar')) examSession = 'Spring';
        
        // Get URLs for resources
        const links = {
            qp: link.querySelector('.text-blue-400')?.href || '',
            ms: link.querySelector('.text-green-400')?.href || '',
            gb: link.querySelector('.text-yellow-400')?.href || '',
            ci: link.querySelector('[href*="ci_"]')?.href || ''
        };
        
        // Create search keywords
        const keywords = [
            title.toLowerCase(),
            session.toLowerCase(),
            `paper ${paperNumber}`,
            `p${paperNumber}`,
            `variant ${variant}`,
            `v${variant}`,
            year,
            examSession.toLowerCase(),
            subject.toLowerCase()
        ].filter(Boolean);
        
        // Create paper object
        const paper = {
            id: `${subject.toLowerCase()}_p${paperNumber}_v${variant}_${year}`,
            title: title,
            session: session,
            subject: subject,
            paperNumber: paperNumber,
            variant: variant,
            year: year,
            examSession: examSession,
            keywords: keywords.join(' '),
            links: links
        };
        
        papers.push(paper);
    });
    
    console.log(`Found ${papers.length} papers on this ${subject} page`);
    
    // Get existing database from localStorage
    let allPapers = JSON.parse(localStorage.getItem('paperDatabase')) || [];
    
    // Remove papers from current subject (to avoid duplicates)
    allPapers = allPapers.filter(p => p.subject.toLowerCase() !== subject.toLowerCase());
    
    // Add new papers
    allPapers = allPapers.concat(papers);
    
    // Save updated database to localStorage
    localStorage.setItem('paperDatabase', JSON.stringify(allPapers));
    localStorage.setItem('paperDbLastUpdate', new Date().toISOString());
    
    console.log(`Paper database updated with ${papers.length} ${subject} papers`);
}

// Search the database for matching papers
function performSearch(query) {
    query = query.toLowerCase();
    const searchResults = document.getElementById('search-results');
    
    // Get database from localStorage
    const papers = JSON.parse(localStorage.getItem('paperDatabase')) || [];
    
    if (papers.length === 0) {
        searchResults.innerHTML = '<p class="p-4 text-center text-gray-400">No papers indexed yet. Please browse subject pages first.</p>';
        searchResults.classList.remove('hidden');
        return;
    }
    
    // Filter papers by query
    const matchingPapers = papers.filter(paper => {
        return paper.keywords.includes(query);
    });
    
    // Display results
    if (matchingPapers.length === 0) {
        searchResults.innerHTML = `<p class="p-4 text-center text-gray-400">No papers found matching "${query}"</p>`;
    } else {
        // Show header with count
        searchResults.innerHTML = `
            <div class="p-3 border-b border-gray-700 text-sm">
                Found ${matchingPapers.length} paper${matchingPapers.length !== 1 ? 's' : ''}
            </div>
        `;
        
        // Show up to 10 results
        matchingPapers.slice(0, 10).forEach(paper => {
            const result = document.createElement('div');
            result.className = 'flex justify-between items-center p-3 hover:bg-blue-900 hover:bg-opacity-20 border-b border-gray-800 border-opacity-50';
            
            // Paper info
            const infoDiv = document.createElement('div');
            
            const titleEl = document.createElement('div');
            titleEl.className = 'font-medium';
            titleEl.textContent = `${paper.subject} - ${paper.title}`;
            infoDiv.appendChild(titleEl);
            
            const sessionEl = document.createElement('div');
            sessionEl.className = 'text-sm text-gray-400';
            sessionEl.textContent = paper.session;
            infoDiv.appendChild(sessionEl);
            
            result.appendChild(infoDiv);
            
            // Links
            const linksDiv = document.createElement('div');
            linksDiv.className = 'space-x-2 flex';
            
            if (paper.links.qp) {
                const qpLink = document.createElement('a');
                qpLink.href = paper.links.qp;
                qpLink.className = 'text-blue-400 hover:underline';
                qpLink.textContent = 'QP';
                qpLink.target = '_blank';
                linksDiv.appendChild(qpLink);
            }
            
            if (paper.links.ms) {
                const msLink = document.createElement('a');
                msLink.href = paper.links.ms;
                msLink.className = 'text-green-400 hover:underline';
                msLink.textContent = 'MS';
                msLink.target = '_blank';
                linksDiv.appendChild(msLink);
            }
            
            if (paper.links.gb) {
                const gbLink = document.createElement('a');
                gbLink.href = paper.links.gb;
                gbLink.className = 'text-yellow-400 hover:underline';
                gbLink.textContent = 'GB';
                gbLink.target = '_blank';
                linksDiv.appendChild(gbLink);
            }
            
            if (paper.links.ci) {
                const ciLink = document.createElement('a');
                ciLink.href = paper.links.ci;
                ciLink.className = 'text-purple-400 hover:underline';
                ciLink.textContent = 'CI';
                ciLink.target = '_blank';
                linksDiv.appendChild(ciLink);
            }
            
            result.appendChild(linksDiv);
            searchResults.appendChild(result);
        });
        
        // Add a "view more" link if there are more results
        if (matchingPapers.length > 10) {
            const viewMore = document.createElement('div');
            viewMore.className = 'p-3 text-center text-blue-400 hover:underline cursor-pointer';
            viewMore.textContent = `View all ${matchingPapers.length} results`;
            viewMore.onclick = function() {
                showAllResults(matchingPapers, query);
            };
            searchResults.appendChild(viewMore);
        }
    }
    
    // Show results
    searchResults.classList.remove('hidden');
}

// Show all search results
function showAllResults(papers, query) {
    const searchResults = document.getElementById('search-results');
    
    // Clear previous results
    searchResults.innerHTML = '';
    
    // Add header with back button
    const header = document.createElement('div');
    header.className = 'sticky top-0 p-3 border-b border-gray-700 bg-black flex justify-between items-center';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = `${papers.length} results for "${query}"`;
    header.appendChild(titleSpan);
    
    const backButton = document.createElement('button');
    backButton.className = 'text-blue-400 hover:underline';
    backButton.textContent = 'Back';
    backButton.onclick = function() {
        performSearch(query); // Go back to condensed view
    };
    header.appendChild(backButton);
    
    searchResults.appendChild(header);
    
    // Group results by subject
    const subjectGroups = {};
    papers.forEach(paper => {
        if (!subjectGroups[paper.subject]) {
            subjectGroups[paper.subject] = [];
        }
        subjectGroups[paper.subject].push(paper);
    });
    
    // Display each subject group
    Object.keys(subjectGroups).sort().forEach(subject => {
        const subjectHeader = document.createElement('div');
        subjectHeader.className = 'p-2 text-lg font-medium bg-gray-900 bg-opacity-50';
        subjectHeader.textContent = subject;
        searchResults.appendChild(subjectHeader);
        
        // Display papers in this subject
        subjectGroups[subject].forEach(paper => {
            const result = document.createElement('div');
            result.className = 'flex justify-between items-center p-3 hover:bg-blue-900 hover:bg-opacity-20 border-b border-gray-800 border-opacity-50';
            
            // Paper info
            const infoDiv = document.createElement('div');
            
            const titleEl = document.createElement('div');
            titleEl.className = 'font-medium';
            titleEl.textContent = paper.title;
            infoDiv.appendChild(titleEl);
            
            const sessionEl = document.createElement('div');
            sessionEl.className = 'text-sm text-gray-400';
            sessionEl.textContent = paper.session;
            infoDiv.appendChild(sessionEl);
            
            result.appendChild(infoDiv);
            
            // Links
            const linksDiv = document.createElement('div');
            linksDiv.className = 'space-x-2 flex';
            
            if (paper.links.qp) {
                const qpLink = document.createElement('a');
                qpLink.href = paper.links.qp;
                qpLink.className = 'text-blue-400 hover:underline';
                qpLink.textContent = 'QP';
                qpLink.target = '_blank';
                linksDiv.appendChild(qpLink);
            }
            
            if (paper.links.ms) {
                const msLink = document.createElement('a');
                msLink.href = paper.links.ms;
                msLink.className = 'text-green-400 hover:underline';
                msLink.textContent = 'MS';
                msLink.target = '_blank';
                linksDiv.appendChild(msLink);
            }
            
            if (paper.links.gb) {
                const gbLink = document.createElement('a');
                gbLink.href = paper.links.gb;
                gbLink.className = 'text-yellow-400 hover:underline';
                gbLink.textContent = 'GB';
                gbLink.target = '_blank';
                linksDiv.appendChild(gbLink);
            }
            
            if (paper.links.ci) {
                const ciLink = document.createElement('a');
                ciLink.href = paper.links.ci;
                ciLink.className = 'text-purple-400 hover:underline';
                ciLink.textContent = 'CI';
                ciLink.target = '_blank';
                linksDiv.appendChild(ciLink);
            }
            
            result.appendChild(linksDiv);
            searchResults.appendChild(result);
        });
    });
}

// Utility function to prevent excessive function calls
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}