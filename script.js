// --- START: SUPABASE SETUP ---
const SUPABASE_URL = 'https://zwuarlfxdruwwdceirjt.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dWFybGZ4ZHJ1d3dkY2Vpcmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzYwMDQsImV4cCI6MjA3MjY1MjAwNH0.OtVcgZ-mDvLpP8hSu5Go9A-ZyhOqkdoMANwvN97CpXg'; // Replace with your anon key

// Create the Supabase client connection
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// --- END: SUPABASE SETUP ---

// Global variables for the map
let map;
let marker;

// Initialize the Google Maps map
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

    // Update the hidden input fields with the initial coordinates
    document.getElementById('latitude').value = defaultLocation.lat;
    document.getElementById('longitude').value = defaultLocation.lng;

    // Listen for marker drag events to update the coordinates
    marker.addListener('dragend', () => {
        const newPosition = marker.getPosition();
        document.getElementById('latitude').value = newPosition.lat();
        document.getElementById('longitude').value = newPosition.lng();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Get all elements
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-section');
    const userLoginBtn = document.getElementById('user-login-btn');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const loginForm = document.getElementById('login-form');
    const reportForm = document.getElementById('report-form');
    const issuesListContainer = document.getElementById('issues-list');
    const dashboardIssuesListContainer = document.getElementById('dashboard-issues-list');

    let currentUserRole = null; // 'user', 'admin', or null

    // Helper function to show a specific section
    const showSection = (sectionId) => {
        sections.forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    };

    // Helper function to update navigation links based on user role
    const updateNavLinks = () => {
        // Hide all links initially
        navLinks.forEach(link => {
            link.classList.add('hidden');
        });

        // Show links based on user role
        if (currentUserRole === 'user') {
            document.getElementById('show-report').classList.remove('hidden');
            document.getElementById('show-previous').classList.remove('hidden');
            document.getElementById('show-logout').classList.remove('hidden');
        } else if (currentUserRole === 'admin') {
            document.getElementById('show-dashboard').classList.remove('hidden');
            document.getElementById('show-logout').classList.remove('hidden');
        } else {
            // Not logged in
            document.getElementById('show-login-link').classList.remove('hidden');
        }
    };

    // Helper function to fetch and render public issues
    const fetchAndRenderIssues = async () => {
        const { data: issues, error } = await supabaseClient
            .from('issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching issues:', error);
            return;
        }

        issuesListContainer.innerHTML = ''; // Clear previous content
        issues.forEach(issue => {
            const statusClass = `status-${issue.status.toLowerCase().replace(' ', '-')}`;
            const issueCardHTML = `
                <div class="issue-card">
                    <div class="issue-details">
                        <h3>${issue.problem_type} on ${issue.location}</h3>
                        <p>Reported: ${new Date(issue.created_at).toLocaleDateString()}</p>
                        <p>Description: ${issue.description}</p>
                        ${issue.photo_url ? `<img src="${issue.photo_url}" alt="Issue Photo" style="max-width:100%; margin-top:10px;">` : ''}
                    </div>
                    <div class="issue-status ${statusClass}">${issue.status}</div>
                </div>
            `;
            issuesListContainer.innerHTML += issueCardHTML;
        });
    };

    // Helper function to fetch and render admin dashboard
    const fetchAndRenderDashboard = async () => {
        const { data: issues, error } = await supabaseClient
            .from('issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching issues for dashboard:', error);
            return;
        }

        dashboardIssuesListContainer.innerHTML = ''; // Clear previous content
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
                        <button class="btn-action edit-btn" data-issue-id="${issue.id}">Edit</button>
                    </td>
                </tr>
            `;
            dashboardIssuesListContainer.innerHTML += rowHTML;
        });
    };

    // Initial setup
    showSection('login-section');
    updateNavLinks();

    // Event listeners for navigation
    document.getElementById('show-report').addEventListener('click', () => {
        showSection('report-section');
    });
    document.getElementById('show-previous').addEventListener('click', () => {
        fetchAndRenderIssues();
        showSection('previous-issues-section');
    });
    document.getElementById('show-dashboard').addEventListener('click', () => {
        fetchAndRenderDashboard();
        showSection('dashboard-section');
    });
    document.getElementById('show-login-link').addEventListener('click', () => {
        showSection('login-section');
    });
    
    // Event listeners for login toggle buttons
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
            showSection('report-section');
            fetchAndRenderIssues();
        } else if (!isUserLogin && username === 'admin' && password === 'admin123') {
            currentUserRole = 'admin';
            updateNavLinks();
            showSection('dashboard-section');
            fetchAndRenderDashboard();
        } else {
            alert('Invalid username or password.');
        }
    });

    // Report Form Submission
    reportForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const problemType = document.getElementById('problem-type').value;
        const locationDetails = document.getElementById('problem-location').value;
        const description = document.getElementById('problem-description').value;
        const latitude = document.getElementById('latitude').value;
        const longitude = document.getElementById('longitude').value;
        const mediaFile = document.getElementById('problem-photo-video').files[0];

        let mediaUrl = null;

        if (mediaFile) {
            const fileExtension = mediaFile.name.split('.').pop();
            const fileName = `media/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('photos') // We can use the same bucket, even for videos
                .upload(fileName, mediaFile);

            if (uploadError) {
                console.error('Error uploading media:', uploadError);
                alert('There was an error uploading your file. Please try again.');
                return;
            }
            
            const { data: { publicUrl } } = supabaseClient.storage.from('photos').getPublicUrl(fileName);
            mediaUrl = publicUrl;
        }

        const { error: insertError } = await supabaseClient
            .from('issues')
            .insert([
                {
                    problem_type: problemType,
                    location: locationDetails,
                    description: description,
                    latitude: latitude,
                    longitude: longitude,
                    media_url: mediaUrl,
                    status: 'Pending'
                }
            ]);

        if (insertError) {
            console.error('Error submitting report:', insertError);
            alert('There was an error submitting your report.');
        } else {
            alert('Report submitted successfully! Thank you for your help.');
            reportForm.reset();
        }
    });

    // Logout Functionality
    document.getElementById('show-logout').addEventListener('click', () => {
        currentUserRole = null;
        updateNavLinks();
        showSection('login-section');
    });

    // Add event listeners for the dynamic dashboard buttons
    dashboardIssuesListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('view-btn')) {
            const issueId = event.target.dataset.issueId;
            // Placeholder for 'View' functionality
            alert(`Viewing issue ID: ${issueId}`);
        } else if (event.target.classList.contains('edit-btn')) {
            const issueId = event.target.dataset.issueId;
            // Placeholder for 'Edit' functionality
            const newStatus = prompt('Enter new status (Pending, In Progress, Solved):');
            if (newStatus) {
                updateIssueStatus(issueId, newStatus);
            }
        }
    });

    // Function to update an issue's status in Supabase
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
            fetchAndRenderDashboard(); // Refresh the dashboard
            fetchAndRenderIssues(); // Refresh the public list
        }
    };
});