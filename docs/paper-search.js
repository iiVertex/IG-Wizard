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

    // Only add the button on the pastpapers.html page
    if (window.location.href.includes('pastpapers.html') || 
        window.location.href.includes('igcse.html') || 
        window.location.href.includes('edexcel.html') || 
        window.location.href.includes('cambridge.html')) {
        
        const container = document.querySelector('.container');
        if (container) {
            const buttonDiv = document.createElement('div');
            buttonDiv.className = 'mt-8 text-center';
            
            buttonDiv.appendChild(button);
            container.appendChild(buttonDiv);
        }
    }
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
        
        // Normalize URLs to be relative
        Object.keys(links).forEach(key => {
            if (links[key]) {
                // Step 1: Convert to absolute URL if it's relative to get a clean starting point
                let url = new URL(links[key], window.location.href).href;
                
                // Step 2: Remove the origin to make it relative to the site root
                url = url.replace(window.location.origin + '/', '');
                
                // Step 3: Remove any duplicate 'docs/' prefixes
                while (url.startsWith('docs/docs/')) {
                    url = url.replace('docs/docs/', 'docs/');
                }
                
                // Step 4: Ensure there's only one 'docs/' at the beginning if needed
                if (!url.startsWith('docs/') && !url.startsWith('http')) {
                    // Only add docs/ if this is a relative URL to our site, not an external link
                    url = 'docs/' + url;
                }
                
                // Step 5: Remove any duplicate slashes
                url = url.replace(/\/+/g, '/');
                
                // Update the URL
                links[key] = url;
            }
        });
        
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

// Create a comprehensive database of all papers across all subjects
function createComprehensivePaperDatabase() {
    console.log('Starting to build comprehensive paper database...');
    
    // Define all subject pages
    const subjectPages = [
        { page: 'phycambridge.html', examBoard: 'cambridge' },
        { page: 'biocambridge.html', examBoard: 'cambridge' },
        { page: 'chemcambridge.html', examBoard: 'cambridge' },
        { page: 'mathcambridge.html', examBoard: 'cambridge' },
        { page: 'cscambridge.html', examBoard: 'cambridge' },
        { page: 'ictcambridge.html', examBoard: 'cambridge' },
        { page: 'econcambridge.html', examBoard: 'cambridge' },
        { page: 'businesscambridge.html', examBoard: 'cambridge' },
        { page: 'arabicambridge.html', examBoard: 'cambridge' },
        { page: 'engfirstcambridge.html', examBoard: 'cambridge' },
        { page: 'evmcambridge.html', examBoard: 'cambridge' },
        { page: 'geographycambridge.html', examBoard: 'cambridge' },
        { page: 'historycambridge.html', examBoard: 'cambridge' },
        { page: 'biologyedexcel.html', examBoard: 'edexcel' },
        { page: 'chemistryedexcel.html', examBoard: 'edexcel' },
        { page: 'physicsedexcel.html', examBoard: 'edexcel' },
        { page: 'mathedexcel.html', examBoard: 'edexcel' }
    ];
    
    // Clear the existing database
    localStorage.removeItem('paperDatabase');
    
    // Initialize empty database
    let allPapers = [];
    
    // Function to clean URLs to prevent double "docs/" issues
    function cleanUrl(url) {
        if (!url) return '';
        
        // Strip the domain if it exists
        let cleanedUrl = url.replace(/^(https?:\/\/[^\/]+)/, '');
        
        // Remove leading slash
        if (cleanedUrl.startsWith('/')) {
            cleanedUrl = cleanedUrl.substring(1);
        }
        
        // Fix the double docs/ issue - this is the key part
        while (cleanedUrl.includes('docs/docs/')) {
            cleanedUrl = cleanedUrl.replace('docs/docs/', 'docs/');
        }
        
        // If URL is relative and doesn't start with docs/
        if (!cleanedUrl.startsWith('docs/') && 
            !cleanedUrl.startsWith('http') && 
            !cleanedUrl.startsWith('/')) {
            // We want all relative URLs to start with a single docs/ prefix
            cleanedUrl = 'docs/' + cleanedUrl;
        }
        
        // Remove any double slashes (except in http://)
        cleanedUrl = cleanedUrl.replace(/([^:])\/+/g, '$1/');
        
        return cleanedUrl;
    }
    
    // Function to process each page
    function processPage(pageIndex) {
        if (pageIndex >= subjectPages.length) {
            // All pages processed, save the database
            localStorage.setItem('paperDatabase', JSON.stringify(allPapers));
            localStorage.setItem('paperDbLastUpdate', new Date().toISOString());
            console.log(`Comprehensive paper database created with ${allPapers.length} papers across ${subjectPages.length} subjects.`);
            alert(`Paper database created with ${allPapers.length} papers!`);
            return;
        }
        
        const pageInfo = subjectPages[pageIndex];
        const page = pageInfo.page;
        const examBoard = pageInfo.examBoard;
        
        console.log(`Processing page ${pageIndex + 1}/${subjectPages.length}: ${page} (${examBoard})`);
        
        // Load the page content
        fetch(page)
            .then(response => response.text())
            .then(html => {
                // Create a DOM parser
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extract subject from page
                let subject = page.replace('cambridge.html', '').replace('edexcel.html', '');
                if (subject.includes('phy')) subject = 'Physics';
                else if (subject.includes('bio')) subject = 'Biology';
                else if (subject.includes('chem')) subject = 'Chemistry';
                else if (subject.includes('math')) subject = 'Mathematics';
                else if (subject.includes('cs')) subject = 'Computer Science';
                else if (subject.includes('ict')) subject = 'ICT';
                else if (subject.includes('econ')) subject = 'Economics';
                else if (subject.includes('business')) subject = 'Business';
                else if (subject.includes('arabic')) subject = 'Arabic'; // This is already correct
                else if (subject.includes('engfirst')) subject = 'English First Language';
                else if (subject.includes('evm')) subject = 'Environmental Management';
                else if (subject.includes('geography')) subject = 'Geography';
                else if (subject.includes('history')) subject = 'History';
                
                // Get all paper links from the page
                const paperLinks = doc.querySelectorAll('.paper-link');
                
                // Process each paper link
                paperLinks.forEach(link => {
                    // Get the title (Paper X Variant Y)
                    const titleElement = link.querySelector('span');
                    if (!titleElement) return;
                    
                    const title = titleElement.textContent.trim();
                    
                    // Get the session (May/June 2023, etc.)
                    const sectionElement = link.closest('div').parentElement;
                    const sessionElement = sectionElement.querySelector('.text-blue-400');
                    const session = sessionElement ? sessionElement.textContent.trim() : '';
                    
                    // Extract paper metadata
                    const paperMatch = title.match(/Paper (\d+)( Variant (\d+))?/i);
                    if (!paperMatch) return;
                    
                    const paperNumber = paperMatch[1];
                    const variant = paperMatch[3] || '1';  // Default to variant 1 if not specified
                    
                    // Extract year
                    const yearMatch = session.match(/\d{4}/);
                    const year = yearMatch ? yearMatch[0] : '';
                    
                    // Get exam session
                    let examSession = '';
                    if (session.includes('May') || session.includes('June')) examSession = 'Summer';
                    else if (session.includes('Oct') || session.includes('Nov')) examSession = 'Winter';
                    else if (session.includes('Feb') || session.includes('Mar')) examSession = 'Spring';
                    else if (session.includes('Jan')) examSession = 'Winter';
                    
                    // Collect all link elements within the paper link
                    const qpElement = link.querySelector('.text-blue-400');
                    const msElement = link.querySelector('.text-green-400');
                    const gbElement = link.querySelector('.text-yellow-400');
                    const ciElement = link.querySelector('[href*="ci_"]');
                    const sfElement = link.querySelector('[href*="sf_"]');
                    const inElement = link.querySelector('[href*="in_"]');
                    
                    // Get URLs and clean them properly
                    const links = {
                        qp: qpElement ? qpElement.getAttribute('href') || '' : '',
                        ms: msElement ? msElement.getAttribute('href') || '' : '',
                        gb: gbElement ? gbElement.getAttribute('href') || '' : '',
                        ci: ciElement ? ciElement.getAttribute('href') || '' : '',
                        sf: sfElement ? sfElement.getAttribute('href') || '' : '',
                        in: inElement ? inElement.getAttribute('href') || '' : ''
                    };

                    // Clean all URLs
                    Object.keys(links).forEach(key => {
                        if (links[key]) {
                            // Get the raw href attribute value
                            let url = links[key];
                            
                            // If it's a relative URL that doesn't start with a slash
                            if (!url.startsWith('/') && !url.startsWith('http')) {
                                // Make sure it has only one docs/ prefix 
                                if (url.startsWith('docs/')) {
                                    // URL already has docs/ prefix, make sure it's not duplicated
                                    while (url.includes('docs/docs/')) {
                                        url = url.replace('docs/docs/', 'docs/');
                                    }
                                } else {
                                    // URL doesn't have docs/ prefix, add it
                                    url = 'docs/' + url;
                                }
                            }
                            
                            // Fix any protocol-relative URLs
                            if (url.startsWith('//')) {
                                url = 'https:' + url;
                            }
                            
                            // Remove any duplicate slashes
                            url = url.replace(/([^:])\/+/g, '$1/');
                            
                            links[key] = url;
                        }
                    });
                    
                    // Debug the links
                    console.log(`Paper ${title} links:`, links);
                    
                    // Add exam board to keywords
                    const examBoardName = examBoard === 'cambridge' ? 'Cambridge' : 'Edexcel';
                    
                    // Create search keywords
                    const keywords = [
                        title.toLowerCase(),
                        session.toLowerCase(),
                        `paper ${paperNumber}`,
                        `p${paperNumber}`,
                        variant ? `variant ${variant}` : '',
                        variant ? `v${variant}` : '',
                        year,
                        examSession.toLowerCase(),
                        subject.toLowerCase(),
                        examBoard.toLowerCase(),
                        examBoardName.toLowerCase()
                    ].filter(Boolean);
                    
                    // Create paper object
                    const paper = {
                        id: `${examBoard}_${subject.toLowerCase()}_p${paperNumber}_v${variant}_${year}`,
                        title: title,
                        session: session,
                        subject: subject,
                        paperNumber: paperNumber,
                        variant: variant,
                        year: year,
                        examSession: examSession,
                        examBoard: examBoard,
                        keywords: keywords.join(' '),
                        links: links,
                        sourcePage: page
                    };
                    
                    // Add to database
                    allPapers.push(paper);
                });
                
                console.log(`Found ${paperLinks.length} papers on ${page}`);
                
                // Process next page
                processPage(pageIndex + 1);
            })
            .catch(error => {
                console.error(`Error loading ${page}:`, error);
                // Continue with next page
                processPage(pageIndex + 1);
            });
    }
    
    // Start processing pages
    processPage(0);
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

// Function to fix double docs/ in existing database
function fixDatabaseUrls() {
    console.log('Fixing database URLs...');
    
    // Get the existing database
    const papers = JSON.parse(localStorage.getItem('paperDatabase')) || [];
    if (papers.length === 0) {
        console.log('No database found to fix.');
        return;
    }
    
    let fixCount = 0;
    
    // Go through each paper and fix its links
    papers.forEach(paper => {
        if (paper.links) {
            Object.keys(paper.links).forEach(key => {
                if (paper.links[key]) {
                    const originalUrl = paper.links[key];
                    
                    // Fix the URL
                    let fixedUrl = originalUrl;
                    
                    // Remove duplicate docs/ prefixes
                    while (fixedUrl.includes('docs/docs/')) {
                        fixedUrl = fixedUrl.replace('docs/docs/', 'docs/');
                        fixCount++;
                    }
                    
                    // Fix any other path issues
                    if (fixedUrl.startsWith('//') && !fixedUrl.startsWith('http')) {
                        fixedUrl = fixedUrl.substring(1);
                        fixCount++;
                    }
                    
                    // Clean any excess slashes
                    fixedUrl = fixedUrl.replace(/([^:])\/+/g, '$1/');
                    
                    // Update the link
                    paper.links[key] = fixedUrl;
                    
                    // Log fixed URLs for debugging
                    if (originalUrl !== fixedUrl) {
                        console.log(`Fixed URL: ${originalUrl} -> ${fixedUrl}`);
                    }
                }
            });
        }
    });
    
    // Save the fixed database
    localStorage.setItem('paperDatabase', JSON.stringify(papers));
    localStorage.setItem('paperDbLastUpdate', new Date().toISOString());
    
    console.log(`Fixed ${fixCount} URLs in the database.`);
    return fixCount;
}