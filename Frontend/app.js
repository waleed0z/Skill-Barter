// Frontend application for Skill Barter platform
class SkillBarterApp {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // Auth forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        document.getElementById('forgotPasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleForgotPassword();
        });

        // Skill management forms
        document.getElementById('addTeachSkillForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSkill('TEACH');
        });

        document.getElementById('addLearnSkillForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSkill('LEARN');
        });

        // Search functionality
        document.getElementById('searchSkillsInput').addEventListener('input', (e) => {
            if (e.target.value.length > 2) {
                this.searchSkills(e.target.value);
            }
        });

        // Availability form
        document.getElementById('availabilityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.setAvailability();
        });

        // Rating form
        document.getElementById('ratingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRating();
        });
    }

    async apiCall(endpoint, options = {}) {
        const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://skill-barter-19m0.onrender.com';
        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            alert(error.message);
            throw error;
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const data = await this.apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.currentUser));

            this.updateUI();
            showSection('dashboard');
            this.loadDashboardData();
        } catch (error) {
            console.error('Login error:', error);
        }
    }

    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const data = await this.apiCall('/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ name, email, password, confirmPassword })
            });

            this.token = data.token;
            this.currentUser = data.user;
            
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.currentUser));

            this.updateUI();
            showSection('dashboard');
            this.loadDashboardData();
        } catch (error) {
            console.error('Signup error:', error);
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('forgotEmail').value;

        try {
            await this.apiCall('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });

            alert('Password reset instructions sent to your email');
            showSection('login');
        } catch (error) {
            console.error('Forgot password error:', error);
        }
    }

    async loadDashboardData() {
        if (!this.token) return;

        try {
            // Load user profile
            const profile = await this.apiCall('/auth/profile');
            document.getElementById('dashboardUserName').textContent = profile.name;
            document.getElementById('userName').textContent = profile.name;

            // Load credit balance
            const balanceData = await this.apiCall('/credits/balance');
            document.getElementById('creditBalance').textContent = balanceData.balance;

            // Load user skills
            await this.loadUserSkills();

            // Load credit history
            await this.loadCreditHistory();

            // Load availability
            await this.loadUserAvailability();

            // Load average rating
            await this.loadAverageRating();

            // Load user ratings
            await this.loadUserRatings();

            // Load sessions
            await this.loadUserSessions();

            // Populate session dropdown for ratings
            await this.populateSessionDropdown();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadUserSkills() {
        try {
            const skills = await this.apiCall('/skills/user');
            
            // Display teach skills
            const teachSkillsContainer = document.getElementById('teachSkillsList');
            teachSkillsContainer.innerHTML = '';
            
            if (skills.teach && skills.teach.length > 0) {
                skills.teach.forEach(skill => {
                    const skillElement = document.createElement('div');
                    skillElement.className = 'alert alert-info d-flex justify-content-between align-items-center';
                    skillElement.innerHTML = `
                        <span>${skill}</span>
                        <button class="btn btn-sm btn-danger" onclick="app.removeSkill('${skill}', 'TEACH')">Remove</button>
                    `;
                    teachSkillsContainer.appendChild(skillElement);
                });
            } else {
                teachSkillsContainer.innerHTML = '<p class="text-muted">No skills added yet</p>';
            }

            // Display learn skills
            const learnSkillsContainer = document.getElementById('learnSkillsList');
            learnSkillsContainer.innerHTML = '';
            
            if (skills.learn && skills.learn.length > 0) {
                skills.learn.forEach(skill => {
                    const skillElement = document.createElement('div');
                    skillElement.className = 'alert alert-warning d-flex justify-content-between align-items-center';
                    skillElement.innerHTML = `
                        <span>${skill}</span>
                        <button class="btn btn-sm btn-danger" onclick="app.removeSkill('${skill}', 'LEARN')">Remove</button>
                    `;
                    learnSkillsContainer.appendChild(skillElement);
                });
            } else {
                learnSkillsContainer.innerHTML = '<p class="text-muted">No skills added yet</p>';
            }
        } catch (error) {
            console.error('Error loading user skills:', error);
        }
    }

    async loadCreditHistory() {
        try {
            const history = await this.apiCall('/credits/history');
            const historyContainer = document.getElementById('creditHistoryList');

            if (history && history.length > 0) {
                historyContainer.innerHTML = '';
                history.forEach(transaction => {
                    const transactionElement = document.createElement('div');
                    transactionElement.className = 'alert alert-light';
                    transactionElement.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${transaction.type}</strong> ${transaction.amount} credits
                            </div>
                            <div>
                                With: ${transaction.otherParty} | ${new Date(transaction.date).toLocaleDateString()}
                            </div>
                        </div>
                    `;
                    historyContainer.appendChild(transactionElement);
                });
            } else {
                historyContainer.innerHTML = '<p class="text-muted">No transaction history</p>';
            }
        } catch (error) {
            console.error('Error loading credit history:', error);
        }
    }

    async addSkill(type) {
        let skillInput;
        if (type === 'TEACH') {
            skillInput = document.getElementById('teachSkillInput');
        } else {
            skillInput = document.getElementById('learnSkillInput');
        }

        const skillName = skillInput.value.trim();
        if (!skillName) return;

        try {
            await this.apiCall('/skills', {
                method: 'POST',
                body: JSON.stringify({ name: skillName, type })
            });

            skillInput.value = '';
            await this.loadUserSkills(); // Refresh the skills list
        } catch (error) {
            console.error('Error adding skill:', error);
        }
    }

    // Availability methods
    async loadUserAvailability() {
        try {
            const availability = await this.apiCall('/availability');
            const container = document.getElementById('availabilityList');

            if (availability && availability.length > 0) {
                container.innerHTML = '';
                availability.forEach(slot => {
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const slotElement = document.createElement('div');
                    slotElement.className = 'alert alert-info d-flex justify-content-between align-items-center';
                    slotElement.innerHTML = `
                        <div>
                            <strong>${dayNames[slot.day_of_week]}</strong>: ${slot.start_time} - ${slot.end_time}
                            <span class="badge ${slot.is_available ? 'bg-success' : 'bg-danger'} ms-2">
                                ${slot.is_available ? 'Available' : 'Unavailable'}
                            </span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-warning me-2" onclick="app.toggleAvailability(${slot.id}, ${!slot.is_available})">
                                ${slot.is_available ? 'Mark Unavailable' : 'Make Available'}
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.removeAvailability(${slot.id})">Remove</button>
                        </div>
                    `;
                    container.appendChild(slotElement);
                });
            } else {
                container.innerHTML = '<p class="text-muted">No availability set</p>';
            }
        } catch (error) {
            console.error('Error loading availability:', error);
        }
    }

    async setAvailability() {
        const dayOfWeek = document.getElementById('dayOfWeek').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;

        if (!dayOfWeek || !startTime || !endTime) {
            alert('Please fill in all fields');
            return;
        }

        try {
            await this.apiCall('/availability', {
                method: 'POST',
                body: JSON.stringify({ dayOfWeek: parseInt(dayOfWeek), startTime, endTime })
            });

            document.getElementById('dayOfWeek').value = '';
            document.getElementById('startTime').value = '';
            document.getElementById('endTime').value = '';

            await this.loadUserAvailability(); // Refresh the availability list
        } catch (error) {
            console.error('Error setting availability:', error);
        }
    }

    async toggleAvailability(id, makeAvailable) {
        try {
            await this.apiCall(`/availability/${id}/unavailable`, {
                method: 'PUT',
                body: JSON.stringify({ is_available: makeAvailable })
            });

            await this.loadUserAvailability(); // Refresh the availability list
        } catch (error) {
            console.error('Error toggling availability:', error);
        }
    }

    async removeAvailability(id) {
        try {
            await this.apiCall(`/availability/${id}`, {
                method: 'DELETE'
            });

            await this.loadUserAvailability(); // Refresh the availability list
        } catch (error) {
            console.error('Error removing availability:', error);
        }
    }

    // Sessions methods
    async loadUserSessions() {
        try {
            const sessions = await this.apiCall('/sessions');
            const container = document.getElementById('sessionsList');

            if (sessions && sessions.length > 0) {
                container.innerHTML = '';
                sessions.forEach(session => {
                    const sessionElement = document.createElement('div');
                    sessionElement.className = 'alert alert-light';
                    const role = session.student_id === this.currentUser.id ? 'Student' : 'Teacher';
                    const participant = session.student_id === this.currentUser.id ? session.teacher_name : session.student_name;

                    sessionElement.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6>${session.skill_name} Session</h6>
                                <p>
                                    With: ${participant}<br>
                                    Role: ${role}<br>
                                    Scheduled: ${new Date(session.scheduled_time).toLocaleString()}<br>
                                    Status: <span class="badge bg-${this.getStatusBadgeClass(session.status)}">${session.status}</span>
                                </p>
                            </div>
                            <div>
                                ${this.getSessionActionButtons(session)}
                            </div>
                        </div>
                    `;
                    container.appendChild(sessionElement);
                });
            } else {
                container.innerHTML = '<p class="text-muted">No sessions scheduled</p>';
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
        }
    }

    getStatusBadgeClass(status) {
        switch(status) {
            case 'scheduled': return 'primary';
            case 'completed': return 'success';
            case 'cancelled': return 'danger';
            case 'missed': return 'warning';
            default: return 'secondary';
        }
    }

    getSessionActionButtons(session) {
        if (session.status !== 'scheduled') {
            return ''; // No actions for non-scheduled sessions
        }

        return `
            <button class="btn btn-sm btn-success me-1" onclick="app.joinSession('${session.id}')">Join Call</button>
            <button class="btn btn-sm btn-success me-1" onclick="app.updateSessionStatus('${session.id}', 'completed')">Complete</button>
            <button class="btn btn-sm btn-danger" onclick="app.updateSessionStatus('${session.id}', 'cancelled')">Cancel</button>
        `;
    }

    async joinSession(sessionId) {
        try {
            const response = await this.apiCall(`/sessions/${sessionId}/join`);

            // Open Jitsi Meet in a new window/tab
            const jitsiUrl = `https://meet.jit.si/${response.jitsiRoom}`;
            window.open(jitsiUrl, '_blank');
        } catch (error) {
            console.error('Error joining session:', error);
        }
    }

    async updateSessionStatus(sessionId, status) {
        try {
            await this.apiCall(`/sessions/${sessionId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });

            await this.loadUserSessions(); // Refresh the sessions list
        } catch (error) {
            console.error('Error updating session status:', error);
        }
    }

    // Ratings methods
    async loadAverageRating() {
        try {
            const ratingData = await this.apiCall('/ratings/average');
            const container = document.getElementById('averageRating');

            container.innerHTML = `
                <div class="text-center">
                    <h3>${ratingData.averageRating}</h3>
                    <p>based on ${ratingData.totalRatings} reviews</p>
                    ${this.renderStarRating(parseFloat(ratingData.averageRating))}
                </div>
            `;
        } catch (error) {
            console.error('Error loading average rating:', error);
        }
    }

    renderStarRating(rating) {
        let stars = '';
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        for (let i = 0; i < fullStars; i++) {
            stars += '★';
        }

        if (hasHalfStar) {
            stars += '☆'; // Half star represented as empty star
        }

        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            stars += '☆';
        }

        return `<div class="text-warning">${stars}</div>`;
    }

    async loadUserRatings() {
        try {
            const ratings = await this.apiCall('/ratings');
            const container = document.getElementById('ratingsList');

            if (ratings && ratings.length > 0) {
                container.innerHTML = '';
                ratings.forEach(rating => {
                    const ratingElement = document.createElement('div');
                    ratingElement.className = 'alert alert-light';
                    ratingElement.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6>${rating.skill_name} - ${rating.ratee_name}</h6>
                                <div class="text-warning">${this.renderStarRating(rating.rating)}</div>
                                <p>${rating.review || 'No review provided'}</p>
                                <small class="text-muted">Rated on ${new Date(rating.created_at).toLocaleDateString()}</small>
                            </div>
                        </div>
                    `;
                    container.appendChild(ratingElement);
                });
            } else {
                container.innerHTML = '<p class="text-muted">No ratings yet</p>';
            }
        } catch (error) {
            console.error('Error loading ratings:', error);
        }
    }

    async submitRating() {
        const sessionId = document.getElementById('sessionToRate').value;
        const ratingValue = document.getElementById('ratingValue').value;
        const review = document.getElementById('ratingReview').value;

        if (!sessionId || !ratingValue) {
            alert('Please select a session and rating');
            return;
        }

        try {
            // Get session details to determine the ratee and skill
            const sessions = await this.apiCall('/sessions');
            const session = sessions.find(s => s.id === sessionId);

            if (!session) {
                alert('Session not found');
                return;
            }

            // Determine who is being rated based on the current user's role in the session
            const rateeId = session.student_id === this.currentUser.id ? session.teacher_id : session.student_id;
            const skillId = session.skill_id; // This would need to be retrieved from the session data

            await this.apiCall('/ratings', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId,
                    rateeId,
                    skillId: 1, // Would be determined from session data
                    rating: parseInt(ratingValue),
                    review
                })
            });

            document.getElementById('sessionToRate').value = '';
            document.getElementById('ratingValue').value = '';
            document.getElementById('ratingReview').value = '';

            await this.loadUserRatings(); // Refresh the ratings list
            await this.loadAverageRating(); // Refresh the average rating
        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    }

    // Method to populate the session dropdown with completed sessions
    async populateSessionDropdown() {
        try {
            const sessions = await this.apiCall('/sessions');
            const sessionDropdown = document.getElementById('sessionToRate');

            // Clear existing options except the first one
            sessionDropdown.innerHTML = '<option value="">Select a completed session</option>';

            // Filter for completed sessions and add to dropdown
            sessions.filter(session => session.status === 'completed').forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                const participant = session.student_id === this.currentUser.id ? session.teacher_name : session.student_name;
                option.textContent = `${session.skill_name} with ${participant} on ${new Date(session.scheduled_time).toLocaleDateString()}`;
                sessionDropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating session dropdown:', error);
        }
    }

    // Matching methods
    async findMatches() {
        const skillName = document.getElementById('matchSkillInput').value;
        if (!skillName) {
            alert('Please enter a skill to search for matches');
            return;
        }

        try {
            const matches = await this.apiCall(`/matching/find?skillName=${encodeURIComponent(skillName)}`);
            const container = document.getElementById('matchesList');

            if (matches && matches.length > 0) {
                container.innerHTML = '<h6>Matches Found:</h6>';
                matches.forEach(match => {
                    const matchElement = document.createElement('div');
                    matchElement.className = 'alert alert-info';
                    matchElement.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6>${match.name}</h6>
                                <p>Email: ${match.email}<br>
                                   Skill: ${match.skill_name}<br>
                                   Rating: ${match.avg_rating ? parseFloat(match.avg_rating).toFixed(2) : 'N/A'} (${match.total_ratings || 0} reviews)
                                </p>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-primary" onclick="app.showInviteModal('${match.id}', '${match.skill_id}', '${match.skill_name}')">Contact</button>
                            </div>
                        </div>
                    `;
                    container.appendChild(matchElement);
                });
            } else {
                container.innerHTML = '<p class="text-muted">No matches found for this skill</p>';
            }
        } catch (error) {
            console.error('Error finding matches:', error);
        }
    }

    // Show invite modal
    showInviteModal(receiverId, skillId, skillName) {
        // Create a simple modal using Bootstrap
        const modalHtml = `
            <div class="modal fade" id="inviteModal" tabindex="-1" aria-labelledby="inviteModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="inviteModalLabel">Send Invitation</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>Send an invitation to <strong>${this.escapeHtml(document.getElementById('userName').textContent)}</strong> to teach <strong>${this.escapeHtml(skillName)}</strong>.</p>
                            <div class="mb-3">
                                <label for="inviteMessage" class="form-label">Message (optional)</label>
                                <textarea class="form-control" id="inviteMessage" rows="3" placeholder="Hi, I'd love to learn this skill from you..."></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.sendInvitation('${receiverId}', '${skillId}')">Send Invitation</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to the page if it doesn't exist
        if (!document.getElementById('inviteModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('inviteModal'));
        modal.show();
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Send invitation
    async sendInvitation(receiverId, skillId) {
        const message = document.getElementById('inviteMessage').value;

        try {
            await this.apiCall('/invitations', {
                method: 'POST',
                body: JSON.stringify({ receiverId, skillId, message })
            });

            // Close the modal
            const modalEl = document.getElementById('inviteModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) {
                    modal.hide();
                }
                // Remove the modal element to prevent duplication
                modalEl.remove();
            }

            alert('Invitation sent successfully!');
        } catch (error) {
            console.error('Error sending invitation:', error);
            alert('Error sending invitation: ' + error.message);
        }
    }

    // Load sent invitations
    async loadSentInvitations() {
        try {
            const invitations = await this.apiCall('/invitations?type=sent');
            this.displayInvitations(invitations, 'Sent');
        } catch (error) {
            console.error('Error loading sent invitations:', error);
        }
    }

    // Load received invitations
    async loadReceivedInvitations() {
        try {
            const invitations = await this.apiCall('/invitations?type=received');
            this.displayInvitations(invitations, 'Received');
        } catch (error) {
            console.error('Error loading received invitations:', error);
        }
    }

    // Display invitations
    displayInvitations(invitations, type) {
        const container = document.getElementById('invitationsList');

        if (invitations && invitations.length > 0) {
            container.innerHTML = `<h6>${type} Invitations:</h6>`;
            invitations.forEach(invite => {
                const inviteElement = document.createElement('div');
                inviteElement.className = `alert ${type === 'Received' ? 'alert-warning' : 'alert-info'}`;
                const statusBadge = `<span class="badge bg-${this.getInvitationStatusClass(invite.status)}">${invite.status}</span>`;

                let actionButton = '';
                if (type === 'Received' && invite.status === 'pending') {
                    actionButton = `
                        <div class="mt-2">
                            <button class="btn btn-sm btn-success me-2" onclick="app.respondToInvitation('${invite.id}', 'accepted')">Accept</button>
                            <button class="btn btn-sm btn-danger" onclick="app.respondToInvitation('${invite.id}', 'declined')">Decline</button>
                        </div>
                    `;
                }

                inviteElement.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <div>
                            <h6>${type === 'Received' ? invite.sender_name : invite.receiver_name}</h6>
                            <p>
                                Skill: ${invite.skill_name}<br>
                                Message: ${invite.message || 'No message'}<br>
                                Sent: ${new Date(invite.created_at).toLocaleString()}<br>
                                Status: ${statusBadge}
                            </p>
                        </div>
                    </div>
                    ${actionButton}
                `;
                container.appendChild(inviteElement);
            });
        } else {
            container.innerHTML = `<p class="text-muted">No ${type.toLowerCase()} invitations</p>`;
        }
    }

    getInvitationStatusClass(status) {
        switch(status) {
            case 'accepted': return 'success';
            case 'declined': return 'danger';
            case 'pending': return 'warning';
            case 'expired': return 'secondary';
            default: return 'secondary';
        }
    }

    // Respond to an invitation
    async respondToInvitation(invitationId, status) {
        try {
            await this.apiCall(`/invitations/${invitationId}/respond`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });

            // Reload the invitations list
            if (status === 'accepted') {
                await this.loadReceivedInvitations(); // Reload received invitations
                await this.loadUserSessions(); // Also reload sessions since a new one might have been created
            } else {
                await this.loadReceivedInvitations(); // Just reload received invitations
            }

            alert(`Invitation ${status} successfully!`);
        } catch (error) {
            console.error('Error responding to invitation:', error);
            alert('Error responding to invitation: ' + error.message);
        }
    }

    async findMutualExchanges() {
        try {
            const matches = await this.apiCall('/matching/mutual');
            const container = document.getElementById('mutualExchangesList');

            if (matches && matches.length > 0) {
                container.innerHTML = '<h6>Potential Mutual Exchanges:</h6>';
                matches.forEach(match => {
                    const matchElement = document.createElement('div');
                    matchElement.className = 'alert alert-success';
                    matchElement.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <div>
                                <h6>${match.name}</h6>
                                <p>They can teach: ${match.teaches}<br>
                                   They want to learn: ${match.wants_to_learn}<br>
                                   Rating: ${match.avg_rating ? parseFloat(match.avg_rating).toFixed(2) : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-primary">Propose Exchange</button>
                            </div>
                        </div>
                    `;
                    container.appendChild(matchElement);
                });
            } else {
                container.innerHTML = '<p class="text-muted">No mutual exchange opportunities found</p>';
            }
        } catch (error) {
            console.error('Error finding mutual exchanges:', error);
        }
    }

    async removeSkill(skillName, type) {
        try {
            await this.apiCall(`/skills/${encodeURIComponent(skillName)}?type=${type}`, {
                method: 'DELETE'
            });

            await this.loadUserSkills(); // Refresh the skills list
        } catch (error) {
            console.error('Error removing skill:', error);
        }
    }

    async searchSkills(query) {
        if (!query) {
            document.getElementById('searchResults').innerHTML = '';
            return;
        }

        try {
            const results = await this.apiCall(`/skills/search?q=${encodeURIComponent(query)}`);
            const resultsContainer = document.getElementById('searchResults');
            
            if (results && results.length > 0) {
                resultsContainer.innerHTML = '<h5>Search Results:</h5>';
                results.forEach(skill => {
                    const skillElement = document.createElement('div');
                    skillElement.className = 'alert alert-secondary';
                    skillElement.textContent = skill;
                    resultsContainer.appendChild(skillElement);
                });
            } else {
                resultsContainer.innerHTML = '<p class="text-muted">No skills found</p>';
            }
        } catch (error) {
            console.error('Error searching skills:', error);
        }
    }

    updateUI() {
        if (this.token && this.currentUser) {
            // Show user nav, hide auth nav
            document.getElementById('authNav').classList.add('d-none');
            document.getElementById('userNav').classList.remove('d-none');
            document.getElementById('userName').textContent = this.currentUser.name;
        } else {
            // Show auth nav, hide user nav
            document.getElementById('authNav').classList.remove('d-none');
            document.getElementById('userNav').classList.add('d-none');
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        this.updateUI();
        showSection('login');
    }
}

// Global functions for HTML onclick handlers
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.auth-section, section:not(.auth-section)').forEach(el => {
        el.classList.add('d-none');
    });

    // Show requested section
    const section = document.getElementById(`${sectionId}Section`);
    if (section) {
        section.classList.remove('d-none');
    }

    // Special handling for dashboard tabs
    if (sectionId === 'dashboard') {
        document.getElementById('skillsTab').classList.remove('d-none');
        document.querySelectorAll('#dashboardSection .list-group-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector('#dashboardSection .list-group-item:first-child').classList.add('active');
    }
}

function showDashboardTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('#dashboardSection .tab-content').forEach(el => {
        el.classList.add('d-none');
    });

    // Show requested tab
    const tab = document.getElementById(`${tabId}Tab`);
    if (tab) {
        tab.classList.remove('d-none');
    }

    // Update active state in sidebar
    document.querySelectorAll('#dashboardSection .list-group-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SkillBarterApp();
    
    // If user is already logged in, go to dashboard
    if (app.token && app.currentUser) {
        showSection('dashboard');
        app.loadDashboardData();
    }
});