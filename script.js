// --- START: SUPABASE SETUP ---
const SUPABASE_URL = 'https://zwuarlfxdruwwdceirjt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dWFybGZ4ZHJ1d3dkY2Vpcmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzYwMDQsImV4cCI6MjA3MjY1MjAwNH0.OtVcgZ-mDvLpP8hSu5Go9A-ZyhOqkdoMANwvN97CpXg';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --- END: SUPABASE SETUP ---


// --- GLOBAL SCOPE FOR GOOGLE MAPS ---
// These variables and the initMap function must be in the global scope
// so the Google Maps script can access them.
let map;
let marker;

/**
 * Initializes the Google Maps map. This function is called by the Google Maps script
 * once it has finished loading, because of the `&callback=initMap` in the script URL.
 */
function initMap() {
    const defaultLocation = { lat: 26.8467, lng: 75.8083 }; // Center map on Jaipur, India
    map = new google.maps.Map(document.getElementById("map-canvas"), {
        center: defaultLocation,
        zoom: 12,
    });
    marker = new google.maps.Marker({
        position: defaultLocation,
        map: map,
        draggable: true,
        title: "Drag me to the problem location"
    });
    // Update hidden form inputs with the initial coordinates
    document.getElementById('latitude').value = defaultLocation.lat;
    document.getElementById('longitude').value = defaultLocation.lng;
    // Add a listener to update coordinates whenever the marker is dragged
    marker.addListener('dragend', () => {
        const newPosition = marker.getPosition();
        document.getElementById('latitude').value = newPosition.lat();
        document.getElementById('longitude').value = newPosition.lng();
    });
}


// --- RUNS AFTER THE HTML DOCUMENT IS FULLY LOADED ---
// This ensures that all HTML elements are available before we try to add event listeners to them.
document.addEventListener('DOMContentLoaded', () => {
    // Get all interactive elements from the page
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');
    const userLoginBtn = document.getElementById('user-login-btn');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const loginForm = document.getElementById('login-form');
    const reportForm = document.getElementById('report-form');
    const issuesListContainer = document.getElementById('issues-list');
    const dashboardIssuesListContainer = document.getElementById('dashboard-issues-list');

    let currentUserRole = null; // Can be 'user', 'admin', or null

    // --- HELPER FUNCTIONS ---

    // Shows a specific content section and hides the others
    const showSection = (sectionId) => {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    };

    // Updates the navigation bar links based on whether a user is logged in and their role
    const updateNavLinks = () => {
        navLinks.forEach(link => {
            link.classList.add('hidden');
        });
        if (currentUserRole === 'user') {
            document.getElementById('show-report').classList.remove('hidden');
            document.getElementById('show-previous').classList.remove('hidden');
            document.getElementById('show-logout').classList.remove('hidden');
        } else if (currentUserRole === 'admin') {
            document.getElementById('show-dashboard').classList.remove('hidden');
            document.getElementById('show-logout').classList.remove('hidden');
        } else {
            document.getElementById('show-login-link').classList.remove('hidden');
        }
    };

    // Fetches and displays all issues for the public "Previous Issues" page
    const fetchAndRenderIssues = async () => {
        issuesListContainer.innerHTML = '<h3>Loading issues...</h3>';
        const { data: issues, error } = await supabaseClient
            .from('issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching issues:', error);
            issuesListContainer.innerHTML = '<p>Sorry, could not load the issues right now.</p>';
            return;
        }
        
        if (issues.length === 0) {
            issuesListContainer.innerHTML = '<p>No issues have been reported yet. Be the first!</p>';
            return;
        }

        issuesListContainer.innerHTML = '';
        issues.forEach(issue => {
            const statusClass = `status-${issue.status.toLowerCase().replace(' ', '-')}`;
            const issueCardHTML = `
                <div class="issue-card">
                    <div class="issue-details">
                        <h3>${issue.problem_type} at ${issue.location}</h3>
                        <p>Reported: ${new Date(issue.created_at).toLocaleDateString()}</p>
                        <p>Description: ${issue.description}</p>
                        ${issue.media_url ? `<img src="${issue.media_url}" alt="Issue Media" style="max-width:100%; margin-top:10px; border-radius: 5px;">` : ''}
                    </div>
                    <div class="issue-status ${statusClass}">${issue.status}</div>
                </div>
            `;
            issuesListContainer.innerHTML += issueCardHTML;
        });
    };

    // Fetches and displays all issues in a table for the admin dashboard
    const fetchAndRenderDashboard = async () => {
        dashboardIssuesListContainer.innerHTML = '<tr><td colspan="5">Loading issues...</td></tr>';
        const { data: issues, error } = await supabaseClient
            .from('issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching issues for dashboard:', error);
            dashboardIssuesListContainer.innerHTML = '<tr><td colspan="5">Could not load issues.</td></tr>';
            return;
        }

        dashboardIssuesListContainer.innerHTML = '';
        issues.forEach(issue => {
            const statusClass = `status-${issue.status.toLowerCase().replace(' ', '-')}`;
            const rowHTML = `
                <tr>
                    <td>${issue.id}</td>
                    <td>${issue.problem_type}</td>
                    <td>${issue.location}</td>
                    <td><span class="${statusClass}">${issue.status}</span></td>
                    <td>
                        <button class="btn-action view-btn" data-issue-id="${issue.id}">View</button>
                        <button class="btn-action edit-btn" data-issue-id="${issue.id}">Edit Status</button>
                    </td>
                </tr>
            `;
            dashboardIssuesListContainer.innerHTML += rowHTML;
        });
    };
    
    // Updates an issue's status in the database
    const updateIssueStatus = async (id, newStatus) => {
        const { error } = await supabaseClient
            .from('issues')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status.');
        } else {
            alert('Status updated successfully!');
            fetchAndRenderDashboard(); // Refresh the dashboard to show the change
        }
    };
    
    // --- INITIAL PAGE SETUP ---
    showSection('login-section');
    updateNavLinks();

    // --- EVENT LISTENERS ---

    // Navigation link clicks
    document.getElementById('show-report').addEventListener('click', () => showSection('report-section'));
    document.getElementById('show-previous').addEventListener('click', () => {
        fetchAndRenderIssues();
        showSection('previous-issues-section');
    });
    document.getElementById('show-dashboard').addEventListener('click', () => {
        fetchAndRenderDashboard();
        showSection('dashboard-section');
    });
    document.getElementById('show-login-link').addEventListener('click', () => showSection('login-section'));
    document.getElementById('show-logout').addEventListener('click', () => {
        currentUserRole = null;
        updateNavLinks();
        showSection('login-section');
        loginForm.reset();
    });
    
    // Login form user/admin toggle
    userLoginBtn.addEventListener('click', () => {
        userLoginBtn.classList.add('active');
        adminLoginBtn.classList.remove('active');
        loginForm.reset();
    });

    adminLoginBtn.addEventListener('click', () => {
        adminLoginBtn.classList.add('active');
        userLoginBtn.classList.remove('active');
        loginForm.reset();
    });

    // Login Form Submission
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const isUserLogin = userLoginBtn.classList.contains('active');

        // Simple mock authentication
        if (isUserLogin && username === 'user' && password === 'user123') {
            currentUserRole = 'user';
            updateNavLinks();
            showSection('report-section'); // Go to report page after user login
        } else if (!isUserLogin && username === 'admin' && password === 'admin123') {
            currentUserRole = 'admin';
            updateNavLinks();
            fetchAndRenderDashboard(); // Fetch data and then show dashboard
            showSection('dashboard-section');
        } else {
            alert('Invalid username or password.');
        }
        loginForm.reset();
    });

    // Report Form Submission
    reportForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        const problemType = document.getElementById('problem-type').value;
        const locationDetails = document.getElementById('problem-location').value;
        const description = document.getElementById('problem-description').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const mediaFile = document.getElementById('problem-photo-video').files[0];

        let mediaUrl = null;

        // Step 1: Upload the file if it exists
        if (mediaFile) {
            const fileExtension = mediaFile.name.split('.').pop();
            const fileName = `public/${Date.now()}.${fileExtension}`;

            const { error: uploadError } = await supabaseClient
                .storage
                .from('report-images') // Make sure this is your bucket name
                .upload(fileName, mediaFile);

            if (uploadError) {
                console.error('Error uploading media:', uploadError);
                alert('There was an error uploading your file. Please try again.');
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Report';
                return;
            }
            
            // Step 2: Get the public URL of the uploaded file
            const { data } = supabaseClient.storage.from('report-images').getPublicUrl(fileName);
            mediaUrl = data.publicUrl;
        }

        // Step 3: Insert the report details into the database
        const { error: insertError } = await supabaseClient
            .from('issues')
            .insert([
                {
                    problem_type: problemType,
                    location: locationDetails,
                    description: description,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    media_url: mediaUrl,
                    status: 'Pending' // Default status
                }
            ]);

        if (insertError) {
            console.error('Error submitting report:', insertError);
            alert('There was an error submitting your report.');
        } else {
            alert('Report submitted successfully! Thank you for your help.');
            reportForm.reset();
            // Optional: After submitting, switch to the 'previous issues' view
            fetchAndRenderIssues();
            showSection('previous-issues-section');
        }
        
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Report';
    });

    // Event delegation for dynamically created buttons in the admin dashboard
    dashboardIssuesListContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('view-btn')) {
            const issueId = target.dataset.issueId;
            alert(`Viewing issue ID: ${issueId}. (This feature can be expanded to show a modal with full details).`);
        } else if (target.classList.contains('edit-btn')) {
            const issueId = target.dataset.issueId;
            const newStatus = prompt('Enter new status (Pending, In Progress, Solved):');
            // Check if the user entered a valid status
            if (newStatus && ['Pending', 'In Progress', 'Solved'].includes(newStatus)) {
                updateIssueStatus(issueId, newStatus);
            } else if (newStatus !== null) { // User entered something invalid
                alert('Invalid status. Please use Pending, In Progress, or Solved.');
            }
            // If newStatus is null, the user clicked "Cancel", so do nothing.
        }
    });
});