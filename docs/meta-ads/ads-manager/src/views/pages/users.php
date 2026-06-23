<?php
$pageTitle = 'User Management';
$pageDescription = 'Manage users and their ad account access';
$showCreateButton = true;
$createButtonText = 'Add User';
$createButtonAction = 'showCreateUserModal()';
?>

<!-- Users Overview Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-users fa-2x text-primary mb-2"></i>
                <h5 class="card-title">Total Users</h5>
                <h3 class="text-primary"><?php echo count($users ?? []); ?></h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-user-shield fa-2x text-danger mb-2"></i>
                <h5 class="card-title">Administrators</h5>
                <h3 class="text-danger">
                    <?php 
                    $admins = array_filter($users ?? [], function($u) { return $u['role'] === 'admin'; });
                    echo count($admins);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-user-tie fa-2x text-success mb-2"></i>
                <h5 class="card-title">Marketing Users</h5>
                <h3 class="text-success">
                    <?php 
                    $marketing = array_filter($users ?? [], function($u) { return $u['role'] === 'advertiser'; });
                    echo count($marketing);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-check-circle fa-2x text-info mb-2"></i>
                <h5 class="card-title">Active Users</h5>
                <h3 class="text-info">
                    <?php 
                    $active = array_filter($users ?? [], function($u) { return $u['status'] === 'active'; });
                    echo count($active);
                    ?>
                </h3>
            </div>
        </div>
    </div>
</div>

<!-- Filters and Actions -->
<div class="chart-container mb-4">
    <div class="row align-items-center">
        <div class="col-md-6">
            <div class="d-flex gap-2">
                <select class="form-select" id="role-filter" style="width: auto;">
                    <option value="">All Roles</option>
                    <option value="admin">Administrator</option>
                    <option value="marketing">Marketing</option>
                </select>
                <select class="form-select" id="status-filter" style="width: auto;">
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>
        </div>
        <div class="col-md-6 text-end">
            <div class="input-group" style="width: 300px; margin-left: auto;">
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control" id="search-users" placeholder="Search users...">
            </div>
        </div>
    </div>
</div>

<!-- Users Table -->
<div class="chart-container">
    <!-- Pagination Info and Controls -->
    <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
            <span class="text-muted">Showing <strong id="showing-start">1</strong> to <strong id="showing-end">10</strong> of <strong id="total-users">0</strong> users</span>
        </div>
        <div class="d-flex gap-2 align-items-center">
            <label class="me-2">Rows per page:</label>
            <select class="form-select form-select-sm" id="rows-per-page" style="width: 80px;">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
            </select>
        </div>
    </div>
    
    <!-- Table with fixed height and scrolling -->
    <div class="table-responsive" style="max-height: calc(100vh - 480px); min-height: 400px; overflow-y: auto; position: relative;">
        <table class="table table-hover align-middle mb-0" style="position: relative;">
            <thead class="table-light" style="position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1);">
                <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Account Access</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="users-table-body">
                <?php if (empty($users)): ?>
                    <tr>
                        <td colspan="8" class="text-center py-5">
                            <i class="fas fa-users fa-3x text-muted mb-3 d-block"></i>
                            <p class="text-muted mb-0">No users found</p>
                        </td>
                    </tr>
                <?php else: ?>
                    <?php foreach ($users as $user): ?>
                        <?php
                        $userId = $user['id'];
                        $username = $user['username'];
                        $email = $user['email'];
                        $fullName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
                        $role = $user['role'];
                        $status = $user['status'];
                        $accountCount = $user['account_count'] ?? 0;
                        $accessibleAccounts = $user['accessible_accounts'] ?? '';
                        $lastLogin = $user['last_login_at'] ?? null;
                        $createdAt = $user['created_at'] ?? '';
                        
                        $roleClass = match($role) {
                            'admin' => 'danger',
                            'advertiser' => 'success',
                            default => 'secondary'
                        };
                        
                        $roleLabel = match($role) {
                            'admin' => 'Administrator',
                            'advertiser' => 'Marketing',
                            default => ucfirst($role)
                        };
                        
                        $statusClass = match($status) {
                            'active' => 'success',
                            'inactive' => 'warning',
                            'suspended' => 'danger',
                            default => 'secondary'
                        };
                        ?>
                        <tr data-user-id="<?php echo $userId; ?>" data-role="<?php echo $role; ?>" data-status="<?php echo $status; ?>">
                            <td>
                                <div>
                                    <strong><?php echo $this->e($username); ?></strong>
                                    <?php if ($fullName): ?>
                                        <br><small class="text-muted"><?php echo $this->e($fullName); ?></small>
                                    <?php endif; ?>
                                </div>
                            </td>
                            <td><?php echo $this->e($email); ?></td>
                            <td>
                                <span class="badge bg-<?php echo $roleClass; ?>">
                                    <i class="fas fa-<?php echo $role === 'admin' ? 'user-shield' : 'user-tie'; ?> me-1"></i>
                                    <?php echo $roleLabel; ?>
                                </span>
                            </td>
                            <td>
                                <span class="badge bg-<?php echo $statusClass; ?>">
                                    <?php echo ucfirst($status); ?>
                                </span>
                            </td>
                            <td>
                                <?php if ($role === 'admin'): ?>
                                    <span class="badge bg-primary-subtle text-primary">
                                        <i class="fas fa-infinity me-1"></i>All Accounts
                                    </span>
                                <?php else: ?>
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="manageUserAccess(<?php echo $userId; ?>, '<?php echo $this->e($username); ?>')">
                                        <i class="fas fa-key me-1"></i>
                                        <?php echo $accountCount; ?> Account<?php echo $accountCount != 1 ? 's' : ''; ?>
                                    </button>
                                    <?php if ($accessibleAccounts): ?>
                                        <br><small class="text-muted"><?php echo $this->e($accessibleAccounts); ?></small>
                                    <?php endif; ?>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php 
                                if ($lastLogin) {
                                    echo '<small>' . date('M d, Y H:i', strtotime($lastLogin)) . '</small>';
                                } else {
                                    echo '<small class="text-muted">Never</small>';
                                }
                                ?>
                            </td>
                            <td>
                                <small><?php echo date('M d, Y', strtotime($createdAt)); ?></small>
                            </td>
                            <td>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="editUser(<?php echo $userId; ?>)">
                                                <i class="fas fa-edit me-2"></i>Edit User
                                            </a>
                                        </li>
                                        <?php if ($role === 'advertiser'): ?>
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="manageUserAccess(<?php echo $userId; ?>, '<?php echo $this->e($username); ?>')">
                                                <i class="fas fa-key me-2"></i>Manage Access
                                            </a>
                                        </li>
                                        <?php endif; ?>
                                        <li>
                                            <a class="dropdown-item" href="#" onclick="resetPassword(<?php echo $userId; ?>)">
                                                <i class="fas fa-lock me-2"></i>Reset Password
                                            </a>
                                        </li>
                                        <li><hr class="dropdown-divider"></li>
                                        <?php if ($status === 'active'): ?>
                                        <li>
                                            <a class="dropdown-item text-warning" href="#" onclick="toggleUserStatus(<?php echo $userId; ?>, 'inactive')">
                                                <i class="fas fa-pause me-2"></i>Deactivate
                                            </a>
                                        </li>
                                        <?php else: ?>
                                        <li>
                                            <a class="dropdown-item text-success" href="#" onclick="toggleUserStatus(<?php echo $userId; ?>, 'active')">
                                                <i class="fas fa-check me-2"></i>Activate
                                            </a>
                                        </li>
                                        <?php endif; ?>
                                        <li>
                                            <a class="dropdown-item text-danger" href="#" onclick="deleteUser(<?php echo $userId; ?>)">
                                                <i class="fas fa-trash me-2"></i>Delete
                                            </a>
                                        </li>
                                    </ul>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    
    <!-- Pagination -->
    <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
        <div>
            <span class="text-muted">Page <strong id="current-page">1</strong> of <strong id="total-pages">1</strong></span>
        </div>
        <nav>
            <ul class="pagination pagination-sm mb-0" id="pagination-controls">
                <!-- Pagination buttons will be generated by JavaScript -->
            </ul>
        </nav>
    </div>
</div>

<!-- Create User Modal -->
<div class="modal fade" id="createUserModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add New User</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="createUserForm">
                    <div class="mb-3">
                        <label class="form-label">Username *</label>
                        <input type="text" class="form-control" name="username" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" name="email" required>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Password *</label>
                        <input type="password" class="form-control" name="password" required minlength="8">
                        <small class="text-muted">Minimum 8 characters</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Role *</label>
                        <select class="form-select" name="role" required>
                            <option value="advertiser">Marketing</option>
                            <option value="admin">Administrator</option>
                        </select>
                        <small class="text-muted">
                            <strong>Marketing:</strong> Limited access to assigned accounts<br>
                            <strong>Administrator:</strong> Full access to all accounts
                        </small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" onclick="submitCreateUser()">
                    <i class="fas fa-plus me-1"></i> Create User
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Edit User Modal -->
<div class="modal fade" id="editUserModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Edit User - <span id="edit-username"></span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="editUserForm">
                    <input type="hidden" id="edit-user-id" name="user_id">
                    <div class="mb-3">
                        <label class="form-label">Username *</label>
                        <input type="text" class="form-control" id="edit-user-username" name="username" required readonly>
                        <small class="text-muted">Username cannot be changed</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" id="edit-user-email" name="email" required>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" id="edit-user-firstname" name="first_name">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" id="edit-user-lastname" name="last_name">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Role *</label>
                        <select class="form-select" id="edit-user-role" name="role" required>
                            <option value="advertiser">Marketing</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Status *</label>
                        <select class="form-select" id="edit-user-status" name="status" required>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-control" name="new_password" minlength="8">
                        <small class="text-muted">Leave empty to keep current password. Minimum 8 characters if changing.</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="submitEditUser()">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Manage Account Access Modal -->
<div class="modal fade" id="manageAccessModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Manage Account Access - <span id="access-username"></span></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="access-user-id">
                
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Account Access Management</strong><br>
                    Select which ad accounts this user can access. Admin users automatically have access to all accounts.
                </div>
                
                <div id="current-access-info" class="mb-3" style="display: none;">
                    <h6>Current Access:</h6>
                    <div id="current-accounts" class="small text-muted"></div>
                </div>
                
                <h6>Available Ad Accounts:</h6>
                <div class="list-group" id="accounts-list">
                    <?php if (!empty($allAccounts)): ?>
                        <?php foreach ($allAccounts as $account): ?>
                            <label class="list-group-item d-flex align-items-center">
                                <input class="form-check-input me-3" type="checkbox" 
                                       value="<?php echo $account['id']; ?>" 
                                       data-account-id="<?php echo $this->e($account['account_id']); ?>">
                                <div class="flex-grow-1">
                                    <strong><?php echo $this->e($account['name']); ?></strong><br>
                                    <small class="text-muted">ID: <?php echo $this->e($account['account_id']); ?></small>
                                </div>
                                <select class="form-select form-select-sm" style="width: 150px;" disabled>
                                    <option value="full">Full Access</option>
                                    <option value="limited">Limited</option>
                                    <option value="view_only" selected>View Only</option>
                                </select>
                            </label>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No ad accounts available. Please sync accounts from Facebook first.
                        </div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="modal-footer">
                <div class="me-auto">
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="selectAllAccounts()">
                        <i class="fas fa-check-square me-1"></i> Select All
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm" onclick="deselectAllAccounts()">
                        <i class="fas fa-square me-1"></i> Deselect All
                    </button>
                </div>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="saveAccountAccess()">
                    <i class="fas fa-save me-1"></i> Save Access
                </button>
            </div>
        </div>
    </div>
</div>

<script>
function showCreateUserModal() {
    const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
    document.getElementById('createUserForm').reset();
    modal.show();
}

function submitCreateUser() {
    const form = document.getElementById('createUserForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    showLoading();
    
    fetch('src/api/users.php?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            alert('User created successfully!');
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to create user'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function editUser(userId) {
    showLoading();
    
    fetch(`src/api/users.php?action=get_user&user_id=${userId}`)
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            const user = result.user;
            
            // Populate form fields
            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-user-username').value = user.username;
            document.getElementById('edit-user-email').value = user.email;
            document.getElementById('edit-user-firstname').value = user.first_name || '';
            document.getElementById('edit-user-lastname').value = user.last_name || '';
            document.getElementById('edit-user-role').value = user.role;
            document.getElementById('edit-user-status').value = user.status;
            
            // Update modal title
            document.getElementById('edit-username').textContent = user.username;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        } else {
            alert('Error loading user: ' + (result.message || 'Unknown error'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function submitEditUser() {
    const form = document.getElementById('editUserForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Remove empty password
    if (!data.new_password) {
        delete data.new_password;
    }
    
    showLoading();
    
    fetch('src/api/users.php?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            alert('User updated successfully!');
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to update user'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function manageUserAccess(userId, username) {
    document.getElementById('access-user-id').value = userId;
    document.getElementById('access-username').textContent = username;
    
    // Load current user access with details
    showLoading();
    fetch(`src/api/users.php?action=get_access_details&user_id=${userId}`)
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            // Show current access info
            const currentAccessDiv = document.getElementById('current-access-info');
            const currentAccountsDiv = document.getElementById('current-accounts');
            
            if (result.current_accounts && result.current_accounts.length > 0) {
                currentAccessDiv.style.display = 'block';
                currentAccountsDiv.innerHTML = result.current_accounts.map(acc => 
                    `<span class="badge bg-primary me-1">${acc.name} (${acc.account_id})</span>`
                ).join('');
            } else {
                currentAccessDiv.style.display = 'block';
                currentAccountsDiv.innerHTML = '<span class="text-muted">No accounts assigned</span>';
            }
            
            // Uncheck all first
            document.querySelectorAll('#accounts-list input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                const listItem = cb.closest('.list-group-item');
                const select = listItem ? listItem.querySelector('select') : null;
                if (select) {
                    select.disabled = true;
                    select.value = 'view_only'; // Reset to default
                }
            });
            
            // Check user's accounts and set access levels
            result.account_ids.forEach(accountId => {
                const checkbox = document.querySelector(`#accounts-list input[value="${accountId}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    const listItem = checkbox.closest('.list-group-item');
                    const select = listItem ? listItem.querySelector('select') : null;
                    if (select) {
                        select.disabled = false;
                        // Set the access level from the result
                        if (result.access_levels && result.access_levels[accountId]) {
                            select.value = result.access_levels[accountId];
                        }
                    }
                }
            });
            
            // Setup listeners for the loaded checkboxes
            setupAccountCheckboxListeners();
            
            const modal = new bootstrap.Modal(document.getElementById('manageAccessModal'));
            modal.show();
        } else {
            alert('Error loading access: ' + (result.message || 'Unknown error'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

// Enable/disable access level select when checkbox changes
function setupAccountCheckboxListeners() {
    document.querySelectorAll('#accounts-list input[type="checkbox"]').forEach(checkbox => {
        // Remove existing listeners first
        checkbox.removeEventListener('change', handleCheckboxChange);
        // Add new listener
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

function handleCheckboxChange() {
    const checkbox = this;
    const listItem = checkbox.closest('.list-group-item');
    const select = listItem ? listItem.querySelector('select') : null;
    
    if (select) {
        select.disabled = !checkbox.checked;
        // Set default value when enabling
        if (checkbox.checked && !select.value) {
            select.value = 'view_only';
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', setupAccountCheckboxListeners);

function saveAccountAccess() {
    const userId = document.getElementById('access-user-id').value;
    const selectedAccounts = [];
    
    document.querySelectorAll('#accounts-list input[type="checkbox"]:checked').forEach(checkbox => {
        const listItem = checkbox.closest('.list-group-item');
        const select = listItem ? listItem.querySelector('select') : null;
        selectedAccounts.push({
            ad_account_id: checkbox.value,
            access_level: select ? select.value : 'view'
        });
    });
    
    showLoading();
    
    fetch('src/api/users.php?action=save_access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            accounts: selectedAccounts
        })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            alert('Account access updated successfully!');
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to update access'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function resetPassword(userId) {
    if (!confirm('Send password reset email to this user?')) {
        return;
    }
    
    showLoading();
    
    fetch('src/api/users.php?action=reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            alert('Password reset email sent!');
        } else {
            alert('Error: ' + (result.message || 'Failed to reset password'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function toggleUserStatus(userId, newStatus) {
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }
    
    showLoading();
    
    fetch('src/api/users.php?action=update_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            status: newStatus
        })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to update status'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function selectAllAccounts() {
    document.querySelectorAll('#accounts-list input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        cb.nextElementSibling.nextElementSibling.nextElementSibling.disabled = false;
    });
}

function deselectAllAccounts() {
    document.querySelectorAll('#accounts-list input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.nextElementSibling.nextElementSibling.nextElementSibling.disabled = true;
    });
}

function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    showLoading();
    
    fetch('src/api/users.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to delete user'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

// Pagination functionality
let usersPaginationCurrentPage = 1;
let usersPaginationRowsPerPage = 10;
let usersPaginationAllRows = [];
let usersPaginationFilteredRows = [];

function initializePagination() {
    // Get all table rows
    const tbody = document.getElementById('users-table-body');
    usersPaginationAllRows = Array.from(tbody.querySelectorAll('tr[data-user-id]'));
    usersPaginationFilteredRows = [...usersPaginationAllRows];
    
    // Setup rows per page selector
    document.getElementById('rows-per-page').addEventListener('change', function() {
        usersPaginationRowsPerPage = parseInt(this.value);
        usersPaginationCurrentPage = 1;
        renderPagination();
    });
    
    // Initial render
    renderPagination();
}

function renderPagination() {
    const totalRows = usersPaginationFilteredRows.length;
    const totalPages = Math.ceil(totalRows / usersPaginationRowsPerPage);
    
    if (usersPaginationCurrentPage > totalPages && totalPages > 0) {
        usersPaginationCurrentPage = totalPages;
    }
    if (usersPaginationCurrentPage < 1) {
        usersPaginationCurrentPage = 1;
    }
    
    const startIndex = (usersPaginationCurrentPage - 1) * usersPaginationRowsPerPage;
    const endIndex = Math.min(startIndex + usersPaginationRowsPerPage, totalRows);
    
    // Hide all rows first
    usersPaginationAllRows.forEach(row => row.style.display = 'none');
    
    // Show only current page rows
    for (let i = startIndex; i < endIndex; i++) {
        if (usersPaginationFilteredRows[i]) {
            usersPaginationFilteredRows[i].style.display = '';
        }
    }
    
    // Update pagination info
    document.getElementById('showing-start').textContent = totalRows > 0 ? startIndex + 1 : 0;
    document.getElementById('showing-end').textContent = endIndex;
    document.getElementById('total-users').textContent = totalRows;
    document.getElementById('current-page').textContent = totalRows > 0 ? usersPaginationCurrentPage : 0;
    document.getElementById('total-pages').textContent = totalPages;
    
    // Render pagination controls
    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const paginationControls = document.getElementById('pagination-controls');
    paginationControls.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${usersPaginationCurrentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${usersPaginationCurrentPage - 1}); return false;">
        <i class="fas fa-chevron-left"></i>
    </a>`;
    paginationControls.appendChild(prevLi);
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, usersPaginationCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page
    if (startPage > 1) {
        const firstLi = document.createElement('li');
        firstLi.className = 'page-item';
        firstLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(1); return false;">1</a>`;
        paginationControls.appendChild(firstLi);
        
        if (startPage > 2) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'page-item disabled';
            dotsLi.innerHTML = '<span class="page-link">...</span>';
            paginationControls.appendChild(dotsLi);
        }
    }
    
    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === usersPaginationCurrentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>`;
        paginationControls.appendChild(li);
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dotsLi = document.createElement('li');
            dotsLi.className = 'page-item disabled';
            dotsLi.innerHTML = '<span class="page-link">...</span>';
            paginationControls.appendChild(dotsLi);
        }
        
        const lastLi = document.createElement('li');
        lastLi.className = 'page-item';
        lastLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${totalPages}); return false;">${totalPages}</a>`;
        paginationControls.appendChild(lastLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${usersPaginationCurrentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${usersPaginationCurrentPage + 1}); return false;">
        <i class="fas fa-chevron-right"></i>
    </a>`;
    paginationControls.appendChild(nextLi);
}

function changePage(page) {
    usersPaginationCurrentPage = page;
    renderPagination();
    // Scroll to top of table
    document.querySelector('.table-responsive').scrollTop = 0;
}

// Update filter functions to work with pagination
document.addEventListener('DOMContentLoaded', function() {
    initializePagination();
    
    // Role filter
    document.getElementById('role-filter').addEventListener('change', function() {
        filterUsers();
    });
    
    // Status filter
    document.getElementById('status-filter').addEventListener('change', function() {
        filterUsers();
    });
    
    // Search
    document.getElementById('search-users').addEventListener('input', function() {
        filterUsers();
    });
});

function filterUsers() {
    const roleFilter = document.getElementById('role-filter').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value.toLowerCase();
    const searchText = document.getElementById('search-users').value.toLowerCase();
    
    usersPaginationFilteredRows = usersPaginationAllRows.filter(row => {
        const role = row.dataset.role || '';
        const status = row.dataset.status || '';
        const text = row.textContent.toLowerCase();
        
        const matchRole = !roleFilter || role === roleFilter;
        const matchStatus = !statusFilter || status === statusFilter;
        const matchSearch = !searchText || text.includes(searchText);
        
        return matchRole && matchStatus && matchSearch;
    });
    
    usersPaginationCurrentPage = 1;
    renderPagination();
}
</script>
