document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const usernameSpan = document.getElementById('username');
    const loginError = document.getElementById('login-error');

    const createNovelForm = document.getElementById('create-novel-form');
    const novelMessage = document.getElementById('novel-message');
    const createChapterForm = document.getElementById('create-chapter-form');
    const chapterNovelSelect = document.getElementById('chapter-novel-select'); // Dropdown for create chapter
    const chapterMessage = document.getElementById('chapter-message');
    const chapterContentForm = document.getElementById('chapter-content-form');
    const contentNovelSelect = document.getElementById('content-novel-select'); // Dropdown for update content
    const contentMessage = document.getElementById('content-message');
    const contentError = document.getElementById('content-error');

    // Management Section Elements
    const manageLoading = document.getElementById('manage-loading');
    const manageError = document.getElementById('manage-error');
    const novelListContainer = document.getElementById('novel-list-container');


    const API_BASE_URL = 'http://192.168.254.116:3001/api'; // Use specific IP for LAN access
    let authToken = localStorage.getItem('adminAuthToken');
    let adminUsername = localStorage.getItem('adminUsername');

    // --- UI Update Functions ---
    function showAdminContent() {
        loginSection.style.display = 'none';
        adminContent.style.display = 'block';
        usernameSpan.textContent = adminUsername || 'Admin';
        populateNovelDropdown(); // Populate dropdown when showing admin content
        loadManagementData(); // Load management data as well
    }

    // --- Function to populate the novel dropdown ---
    async function populateNovelDropdown() {
        console.log("Populating book dropdowns..."); // Changed log message
        try {
            const response = await fetchAdminAPI('/admin/novels/list'); // API path remains unchanged
            if (!response.ok) {
                throw new Error('Failed to fetch book list'); // Changed error message
            }
            const novels = await response.json(); // Variable name remains unchanged internally
            // Reset both dropdowns
            contentNovelSelect.innerHTML = '<option value="" disabled selected>Select a Book</option>'; // Changed text
            chapterNovelSelect.innerHTML = '<option value="" disabled selected>Select a Book</option>'; // Changed text

            if (novels && novels.length > 0) {
                novels.forEach(novel => { // Variable name remains unchanged internally
                    const option = document.createElement('option');
                    option.value = novel.id;
                    option.textContent = `${novel.title} (ID: ${novel.id})`;
                    // Clone the option for the second dropdown
                    const optionClone = option.cloneNode(true);
                    contentNovelSelect.appendChild(option);
                    chapterNovelSelect.appendChild(optionClone);
                });
                console.log(`Populated dropdowns with ${novels.length} books.`); // Changed log message
            } else {
                 contentNovelSelect.innerHTML = '<option value="" disabled selected>No books found</option>'; // Changed text
                 chapterNovelSelect.innerHTML = '<option value="" disabled selected>No books found</option>'; // Changed text
                 console.log("No books found to populate dropdowns."); // Changed log message
            }
        } catch (error) {
            console.error('Error populating book dropdowns:', error); // Changed log message
            contentNovelSelect.innerHTML = '<option value="" disabled selected>Error loading books</option>'; // Changed text
            chapterNovelSelect.innerHTML = '<option value="" disabled selected>Error loading books</option>'; // Changed text
            // Removed erroneous lines that were outside the loop
            // Optionally display error elsewhere too
            // Use manageError for dropdown loading errors as well? Or add a specific element?
            manageError.textContent = `Error loading books for dropdown: ${error.message}`; // Changed text
        }
    }

    // --- Functions for Management Section ---
    async function loadManagementData() {
        manageLoading.style.display = 'block';
        manageError.textContent = '';
        novelListContainer.innerHTML = ''; // Clear previous list

        try {
            const response = await fetchAdminAPI('/admin/novels/manage');
            if (!response.ok) {
                const data = await response.json().catch(() => ({})); // Try to get error message
                throw new Error(data.message || 'Failed to fetch management data');
            }
            const novels = await response.json(); // Variable name remains unchanged internally
            displayManagementData(novels);
        } catch (error) {
            console.error('Error loading management data:', error);
            manageError.textContent = `Error: ${error.message}`; // Keep generic error message
        } finally {
            manageLoading.style.display = 'none';
        }
    }

    function displayManagementData(novels) { // Parameter name remains unchanged internally
        novelListContainer.innerHTML = ''; // Clear again just in case
        if (!novels || novels.length === 0) {
            novelListContainer.innerHTML = '<p>No books found.</p>'; // Changed text
            return;
        }

        novels.forEach(novel => { // Variable name remains unchanged internally
            const novelDiv = document.createElement('div');
            novelDiv.classList.add('manage-novel-item'); // Class name remains unchanged internally
            // Add cover image input and button
            novelDiv.innerHTML = `
                <h3>
                    ${novel.title} (ID: ${novel.id})
                    <button class="delete-novel-btn" data-novel-id="${novel.id}" data-novel-title="${novel.title}">Delete Book</button>
                </h3>
                <div class="cover-update-section">
                     <label for="cover-file-${novel.id}">New Cover Image:</label>
                     <input type="file" id="cover-file-${novel.id}" class="cover-file-input" accept="image/*"> <!-- Changed to file input -->
                     <button class="update-cover-btn" data-novel-id="${novel.id}">Upload & Update Cover</button> <!-- Changed button text -->
                     ${novel.coverImageUrl ? `<p>Current: <a href="/public${novel.coverImageUrl}" target="_blank">${novel.coverImageUrl}</a></p>` : '<p>Current: No cover set</p>'} <!-- Show current cover path -->
                </div>
            `;

            const chapterList = document.createElement('ul');
            chapterList.classList.add('manage-chapter-list'); // Add class for styling
            if (novel.chapters && novel.chapters.length > 0) {
                novel.chapters.forEach(chapter => {
                    const chapterLi = document.createElement('li');
                    // Display Chapter Number correctly, keep ID for button data
                    // Use chapter.title || '[No Title]' in case title is null/empty
                    chapterLi.innerHTML = `
                        Chapter ${chapter.chapterNumber}: ${chapter.title || '[No Title]'} (DB ID: ${chapter.id})
                        <button class="delete-chapter-btn" data-chapter-id="${chapter.id}" data-chapter-title="${chapter.title || ''}" data-chapter-number="${chapter.chapterNumber}">Delete Chapter</button>
                    `;
                    chapterList.appendChild(chapterLi);
                });
            } else {
                chapterList.innerHTML = '<li>No chapters found for this book.</li>'; // Changed text
            }
            novelDiv.appendChild(chapterList);
            novelListContainer.appendChild(novelDiv);
            novelListContainer.appendChild(document.createElement('hr')); // Separator
        });
    }

    // --- Event Delegation for Delete Buttons ---
    novelListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-novel-btn')) {
            const novelId = e.target.dataset.novelId;
            const novelTitle = e.target.dataset.novelTitle;
            handleDeleteNovel(novelId, novelTitle);
        } else if (e.target.classList.contains('delete-chapter-btn')) {
            const chapterId = e.target.dataset.chapterId;
            const chapterTitle = e.target.dataset.chapterTitle;
            const chapterNumber = e.target.dataset.chapterNumber;
            handleDeleteChapter(chapterId, chapterTitle, chapterNumber);
        } else if (e.target.classList.contains('update-cover-btn')) { // Handle update cover clicks
            const novelId = e.target.dataset.novelId;
            handleUpdateCover(novelId);
        }
    });

    async function handleUpdateCover(novelId) {
        const inputElement = document.getElementById(`cover-file-${novelId}`); // Get file input
        const file = inputElement.files[0]; // Get the selected file
        manageError.textContent = ''; // Clear previous errors

        if (!file) {
            manageError.textContent = `Please select an image file for Book ID ${novelId}.`;
            alert(`Please select an image file for Book ID ${novelId}.`);
            return;
        }

        // Optional: Add client-side size check (matching backend limit)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
             manageError.textContent = `File is too large (Max 2MB) for Book ID ${novelId}.`;
             alert(`File is too large (Max 2MB) for Book ID ${novelId}.`);
             return;
        }

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('coverImage', file); // 'coverImage' must match the name in uploadCover.single()

        console.log(`Uploading cover for book ${novelId}...`);
        try {
            // Need to use fetch directly or modify fetchAdminAPI to handle FormData
            // For simplicity, using fetch directly here, manually adding Auth header
            const token = localStorage.getItem('adminAuthToken');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            // DO NOT set Content-Type header, browser sets it correctly for FormData

            const response = await fetch(`${API_BASE_URL}/admin/books/${novelId}/cover`, {
                method: 'PUT',
                headers: headers, // Only include Auth header if needed
                body: formData,
            });

            // Check for auth errors specifically if using direct fetch
             if (response.status === 401 || response.status === 403) {
                console.error('Auth Error:', response.status);
                showLogin(); // Force login
                loginError.textContent = 'Session expired or invalid permissions. Please login again.';
                throw new Error('Authentication failed');
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to upload cover image.');
            }
            alert(data.message || `Cover image updated successfully for book ${novelId}.`);
            // Optionally update the input field value if backend modifies the URL (unlikely here)
            // inputElement.value = data.book?.coverImageUrl || coverImageUrl;
            manageError.textContent = `Cover updated for Book ID ${novelId}.`; // Show success briefly
            setTimeout(() => { manageError.textContent = ''; }, 3000); // Clear message after 3s
        } catch (error) {
            console.error(`Error updating cover for book ${novelId}:`, error);
            manageError.textContent = `Error updating cover: ${error.message}`;
            alert(`Error updating cover: ${error.message}`);
        }
    }

    async function handleDeleteNovel(novelId, novelTitle) { // Parameter names remain unchanged internally
        if (!confirm(`Are you sure you want to delete the book "${novelTitle}" (ID: ${novelId}) and ALL its chapters and content? This cannot be undone.`)) { // Changed confirmation text
            return;
        }
        manageError.textContent = ''; // Clear previous errors
        try {
            const response = await fetchAdminAPI(`/admin/novels/${novelId}`, { method: 'DELETE' }); // API path remains unchanged
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete book.'); // Changed error message
            }
            alert(data.message || `Book ${novelId} deleted successfully.`); // Changed success message
            loadManagementData(); // Refresh the list
            populateNovelDropdown(); // Refresh dropdown as well
        } catch (error) {
            console.error(`Error deleting book ${novelId}:`, error); // Changed log message
            manageError.textContent = `Error deleting book: ${error.message}`; // Changed error message
            alert(`Error deleting book: ${error.message}`); // Also show alert
        }
    }

     async function handleDeleteChapter(chapterId, chapterTitle, chapterNumber) {
        if (!confirm(`Are you sure you want to delete Chapter ${chapterNumber}: "${chapterTitle}" (ID: ${chapterId}) and ALL its content? This cannot be undone.`)) {
            return;
        }
         manageError.textContent = ''; // Clear previous errors
        try {
            const response = await fetchAdminAPI(`/admin/chapters/${chapterId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete chapter.');
            }
            alert(data.message || `Chapter ${chapterId} deleted successfully.`);
            loadManagementData(); // Refresh the list
        } catch (error) {
            console.error(`Error deleting chapter ${chapterId}:`, error);
            manageError.textContent = `Error deleting chapter: ${error.message}`;
            alert(`Error deleting chapter: ${error.message}`); // Also show alert
        }
    }


    function showLogin() {
        loginSection.style.display = 'block';
        adminContent.style.display = 'none';
        authToken = null;
        adminUsername = null;
        localStorage.removeItem('adminAuthToken');
        localStorage.removeItem('adminUsername');
    }

    // --- API Call Helper ---
    async function fetchAdminAPI(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
            });

            if (response.status === 401 || response.status === 403) {
                // Unauthorized or Forbidden, likely bad/expired token or not admin
                console.error('Auth Error:', response.status);
                showLogin(); // Force login
                loginError.textContent = 'Session expired or invalid permissions. Please login again.';
                throw new Error('Authentication failed');
            }
            return response;
        } catch (error) {
            console.error('API Fetch Error:', error);
            throw error; // Re-throw for specific handlers
        }
    }

    // --- Event Listeners ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // IMPORTANT: Check if the user has the 'admin' role
            if (data.user?.role !== 'admin') {
                 throw new Error('Login successful, but you do not have admin privileges.');
            }

            authToken = data.token;
            adminUsername = data.user.username;
            localStorage.setItem('adminAuthToken', authToken);
            localStorage.setItem('adminUsername', adminUsername);
            console.log('Login successful, showing admin content.');
            showAdminContent();

        } catch (error) {
            console.error('Login failed:', error); // Log the full error object
            // Ensure a message is always displayed
            const errorMessage = error.message || 'An unknown error occurred during login.';
            loginError.textContent = errorMessage;
            console.log(`Displaying login error message: ${errorMessage}`);
            showLogin(); // Ensure user is logged out if login fails or not admin
        }
    });

    logoutButton.addEventListener('click', () => {
        showLogin();
    });

    createNovelForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        novelMessage.textContent = '';
        const title = document.getElementById('novel-title').value;
        const authorName = document.getElementById('novel-author').value;
        const description = document.getElementById('novel-desc').value;

        try {
            const response = await fetchAdminAPI('/admin/novels', {
                method: 'POST',
                body: JSON.stringify({ title, authorName, description }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to create book.'); // Changed error message
            }
            novelMessage.textContent = `Book "${data.title}" (ID: ${data.id}) created successfully!`; // Changed success message
            createNovelForm.reset();
            loadManagementData(); // Refresh management list
            populateNovelDropdown(); // Refresh dropdown
        } catch (error) {
            novelMessage.textContent = `Error: ${error.message}`;
            novelMessage.classList.add('error');
            novelMessage.classList.remove('message');
        }
    });

    createChapterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        chapterMessage.textContent = '';
        const novelId = chapterNovelSelect.value; // Use the dropdown value
        const title = document.getElementById('chapter-title').value;
        const chapterNumber = document.getElementById('chapter-number').value;

        if (!novelId) {
            chapterMessage.textContent = 'Please select a book.'; // Changed message
            chapterMessage.classList.add('error');
            chapterMessage.classList.remove('message');
            return;
        }

         try {
            const response = await fetchAdminAPI(`/admin/novels/${novelId}/chapters`, {
                method: 'POST',
                body: JSON.stringify({ title, chapterNumber: parseInt(chapterNumber) }),
            });
            const data = await response.json();
             if (!response.ok) {
                throw new Error(data.message || 'Failed to create chapter.');
            }
            chapterMessage.textContent = `Chapter "${data.title || ''}" (ID: ${data.id}) created successfully for Book ID ${novelId}!`; // Changed message
            createChapterForm.reset();
            loadManagementData(); // Refresh management list
        } catch (error) {
            chapterMessage.textContent = `Error: ${error.message}`;
            chapterMessage.classList.add('error');
            chapterMessage.classList.remove('message');
        }
    });

    chapterContentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        contentMessage.textContent = '';
        contentError.textContent = '';
        const novelId = contentNovelSelect.value; // Get selected novel ID
        const chapterNumber = document.getElementById('content-chapter-number').value; // Get chapter number
        const rawContent = document.getElementById('raw-content').value;
        let segments;

        if (!novelId) {
            contentError.textContent = 'Please select a book.'; // Changed message
            return;
        }

        try {
            segments = parseRawContent(rawContent);
            if (!segments || segments.length === 0) {
                throw new Error("No content segments found or parsing failed. Ensure content is wrapped in [ ].");
            }
        } catch (parseError) {
             contentError.textContent = `Parsing Error: ${parseError.message}`;
             return; // Stop submission if parsing fails
        }


        try {
            // Use the new API endpoint structure
            const response = await fetchAdminAPI(`/admin/novels/${novelId}/chapters/${chapterNumber}/content`, {
                method: 'POST',
                body: JSON.stringify({ segments: segments }), // Send parsed segments
            });
            const data = await response.json();
             if (!response.ok) {
                 // Handle 501 Not Implemented specifically
                 if (response.status === 501) {
                     contentError.textContent = `Backend Error: ${data.message || 'Content parsing not implemented yet.'}`;
                 } else {
                    throw new Error(data.message || 'Failed to update chapter content.');
                 }
            } else {
                contentMessage.textContent = data.message || `Content for Book ${novelId}, Chapter ${chapterNumber} updated successfully!`; // Changed message
                // Optionally clear the textarea: document.getElementById('raw-content').value = '';
            }
        } catch (error) {
            contentError.textContent = `Error: ${error.message}`;
        }
    });

    // --- Initial Check ---
    if (authToken) {
        // Optional: Could add a quick check here to verify token is still valid
        // e.g., fetchAdminAPI('/auth/profile').then(...).catch(() => showLogin());
        showAdminContent();
    } else {
        showLogin();
    }
});

// --- Parser Function ---
function parseRawContent(rawText) {
    if (!rawText) return [];

    const segments = [];
    // Regex to find text between [ and ], capturing the content
    // 'g' for global search, 's' to allow '.' to match newline characters
    const regex = /\[(.*?)\]/gs;
    let match;
    let index = 0;

    while ((match = regex.exec(rawText)) !== null) {
        // match[1] contains the text captured between the brackets
        const textContent = match[1].trim(); // Trim whitespace from start/end
        if (textContent) { // Only add if there's actual content
            segments.push({
                segmentIndex: index++,
                segmentType: 'text', // Using 'text' as the type for now
                textContent: textContent // Preserve internal newlines
            });
        }
    }

    if (segments.length === 0 && rawText.trim().length > 0) {
        // Throw error if there's text but no valid segments found
        throw new Error("Input text exists, but no valid segments found. Ensure content is wrapped in [ ].");
    }

    return segments;
}
// ---------------------
