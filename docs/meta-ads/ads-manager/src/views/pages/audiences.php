<?php
$pageTitle = 'Audiences';
$pageDescription = 'Manage custom audiences and lookalike audiences';
$showCreateButton = true;
$createButtonText = 'Create Audience';
$createButtonAction = 'showCreateAudienceModal()';
?>

<!-- Audiences Overview Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-users fa-2x text-primary mb-2"></i>
                <h5 class="card-title">Total Audiences</h5>
                <h3 class="text-primary"><?php echo count($audiences ?? []); ?></h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-user-friends fa-2x text-success mb-2"></i>
                <h5 class="card-title">Custom Audiences</h5>
                <h3 class="text-success">
                    <?php 
                    $custom = array_filter($audiences ?? [], function($a) { 
                        return ($a['subtype'] ?? '') === 'CUSTOM' || empty($a['subtype']); 
                    });
                    echo count($custom);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-clone fa-2x text-info mb-2"></i>
                <h5 class="card-title">Lookalike Audiences</h5>
                <h3 class="text-info">
                    <?php 
                    $lookalike = array_filter($audiences ?? [], function($a) { 
                        return ($a['subtype'] ?? '') === 'LOOKALIKE'; 
                    });
                    echo count($lookalike);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-chart-line fa-2x text-warning mb-2"></i>
                <h5 class="card-title">Total Reach</h5>
                <h3 class="text-warning">
                    <?php 
                    $totalSize = array_sum(array_column($audiences ?? [], 'approximate_count'));
                    echo number_format($totalSize);
                    ?>
                </h3>
            </div>
        </div>
    </div>
</div>

<?php if (empty($selectedAccount)): ?>
    <!-- No Account Selected -->
    <div class="text-center py-5">
        <i class="fas fa-users fa-3x text-muted mb-3"></i>
        <h4 class="text-muted">Select an Ad Account</h4>
        <p class="text-muted">Choose an ad account to manage your audiences</p>
    </div>
<?php else: ?>
    <!-- Filters and Actions -->
    <div class="chart-container mb-4">
        <div class="row align-items-center">
            <div class="col-md-6">
                <div class="d-flex gap-2">
                    <select class="form-select" id="type-filter" style="width: auto;">
                        <option value="">All Types</option>
                        <option value="CUSTOM">Custom Audience</option>
                        <option value="LOOKALIKE">Lookalike Audience</option>
                    </select>
                    <select class="form-select" id="status-filter" style="width: auto;">
                        <option value="">All Status</option>
                        <option value="READY">Ready</option>
                        <option value="TOO_SMALL">Too Small</option>
                        <option value="POPULATING">Populating</option>
                    </select>
                </div>
            </div>
            <div class="col-md-6 text-end">
                <div class="input-group" style="width: 300px; margin-left: auto;">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                    <input type="text" class="form-control" id="search-audiences" placeholder="Search audiences...">
                </div>
            </div>
        </div>
    </div>

    <!-- Audiences Table -->
    <div class="chart-container">
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>
                            <input type="checkbox" id="select-all-audiences">
                        </th>
                        <th>Audience Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Size</th>
                        <th>Source</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="audiences-table-body">
                    <?php if (empty($audiences)): ?>
                        <tr>
                            <td colspan="8" class="text-center py-5">
                                <i class="fas fa-users fa-3x text-muted mb-3 d-block"></i>
                                <p class="text-muted mb-0">No audiences found</p>
                                <small class="text-muted">Create your first audience or sync from Facebook</small>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($audiences as $audience): ?>
                            <?php
                            $audienceId = $audience['audience_id'] ?? $audience['id'];
                            $name = $audience['name'] ?? 'Unnamed Audience';
                            $subtype = $audience['subtype'] ?? 'CUSTOM';
                            $status = $audience['delivery_status'] ?? 'UNKNOWN';
                            $size = $audience['approximate_count'] ?? 0;
                            $description = $audience['description'] ?? '';
                            $updatedTime = $audience['time_updated'] ?? $audience['updated_at'] ?? '';
                            
                            // Determine audience type display
                            $typeDisplay = match($subtype) {
                                'CUSTOM' => 'Custom',
                                'LOOKALIKE' => 'Lookalike',
                                'WEBSITE' => 'Website',
                                'APP' => 'App Activity',
                                'ENGAGEMENT' => 'Engagement',
                                'VIDEO' => 'Video',
                                'CUSTOMER_LIST' => 'Customer List',
                                default => $subtype
                            };
                            
                            $statusClass = match($status) {
                                'READY' => 'success',
                                'TOO_SMALL' => 'warning',
                                'POPULATING' => 'info',
                                'PROCESSING' => 'info',
                                default => 'secondary'
                            };
                            
                            // Format size
                            if ($size >= 1000000) {
                                $sizeDisplay = number_format($size / 1000000, 1) . 'M';
                            } elseif ($size >= 1000) {
                                $sizeDisplay = number_format($size / 1000, 1) . 'K';
                            } else {
                                $sizeDisplay = number_format($size);
                            }
                            ?>
                            <tr data-audience-id="<?php echo $this->e($audienceId); ?>">
                                <td>
                                    <input type="checkbox" class="audience-checkbox" value="<?php echo $this->e($audienceId); ?>">
                                </td>
                                <td>
                                    <div>
                                        <strong><?php echo $this->e($name); ?></strong>
                                        <?php if ($description): ?>
                                            <br><small class="text-muted"><?php echo $this->e($description); ?></small>
                                        <?php endif; ?>
                                        <br><small class="text-muted"><?php echo $this->e($audienceId); ?></small>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge bg-primary-subtle text-primary">
                                        <?php echo $this->e($typeDisplay); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-<?php echo $statusClass; ?>">
                                        <?php echo $this->e($status); ?>
                                    </span>
                                </td>
                                <td class="fw-semibold"><?php echo $sizeDisplay; ?></td>
                                <td><?php echo $this->e($audience['data_source'] ?? 'N/A'); ?></td>
                                <td>
                                    <?php 
                                    if ($updatedTime) {
                                        echo date('M d, Y', strtotime($updatedTime));
                                    } else {
                                        echo 'N/A';
                                    }
                                    ?>
                                </td>
                                <td>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
                                            <i class="fas fa-ellipsis-v"></i>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li>
                                                <a class="dropdown-item" href="#" onclick="viewAudienceDetails('<?php echo $this->e($audienceId); ?>')">
                                                    <i class="fas fa-eye me-2"></i>View Details
                                                </a>
                                            </li>
                                            <li>
                                                <a class="dropdown-item" href="#" onclick="editAudience('<?php echo $this->e($audienceId); ?>')">
                                                    <i class="fas fa-edit me-2"></i>Edit
                                                </a>
                                            </li>
                                            <?php if ($subtype === 'CUSTOM'): ?>
                                            <li>
                                                <a class="dropdown-item" href="#" onclick="createLookalike('<?php echo $this->e($audienceId); ?>')">
                                                    <i class="fas fa-clone me-2"></i>Create Lookalike
                                                </a>
                                            </li>
                                            <?php endif; ?>
                                            <li><hr class="dropdown-divider"></li>
                                            <li>
                                                <a class="dropdown-item text-danger" href="#" onclick="deleteAudience('<?php echo $this->e($audienceId); ?>')">
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
    </div>
<?php endif; ?>

<!-- Create Audience Modal -->
<div class="modal fade" id="createAudienceModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create Audience</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label">Audience Type *</label>
                    <select class="form-select" id="audience-type-select" onchange="toggleAudienceForm()">
                        <option value="">Select Type</option>
                        <option value="CUSTOM">Custom Audience</option>
                        <option value="LOOKALIKE">Lookalike Audience</option>
                    </select>
                </div>

                <!-- Custom Audience Form -->
                <div id="custom-audience-form" style="display: none;">
                    <form id="createCustomAudienceForm">
                        <div class="mb-3">
                            <label class="form-label">Audience Name *</label>
                            <input type="text" class="form-control" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" rows="2"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Source Type *</label>
                            <select class="form-select" name="subtype" required>
                                <option value="WEBSITE">Website Traffic</option>
                                <option value="CUSTOMER_LIST">Customer List</option>
                                <option value="APP">App Activity</option>
                                <option value="ENGAGEMENT">Engagement</option>
                                <option value="VIDEO">Video</option>
                            </select>
                        </div>
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Note:</strong> You'll need to configure the pixel, upload customer list, or set engagement rules after creating the audience.
                        </div>
                    </form>
                </div>

                <!-- Lookalike Audience Form -->
                <div id="lookalike-audience-form" style="display: none;">
                    <form id="createLookalikeAudienceForm">
                        <div class="mb-3">
                            <label class="form-label">Audience Name *</label>
                            <input type="text" class="form-control" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Source Audience *</label>
                            <select class="form-select" name="source_audience_id" required>
                                <option value="">Select Source Audience</option>
                                <?php if (!empty($audiences)): ?>
                                    <?php foreach ($audiences as $aud): ?>
                                        <?php if (($aud['subtype'] ?? '') !== 'LOOKALIKE'): ?>
                                            <option value="<?php echo $this->e($aud['audience_id'] ?? $aud['id']); ?>">
                                                <?php echo $this->e($aud['name']); ?> (<?php echo number_format($aud['approximate_count'] ?? 0); ?>)
                                            </option>
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Location Country *</label>
                            <select class="form-select" name="country" required>
                                <option value="US">United States</option>
                                <option value="GB">United Kingdom</option>
                                <option value="CA">Canada</option>
                                <option value="AU">Australia</option>
                                <option value="VN">Vietnam</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Audience Size *</label>
                            <select class="form-select" name="ratio" required>
                                <option value="0.01">1% - Most Similar (Smaller, Higher Quality)</option>
                                <option value="0.02">2%</option>
                                <option value="0.03">3%</option>
                                <option value="0.05">5%</option>
                                <option value="0.10">10% - Broader Reach (Larger, Lower Similarity)</option>
                            </select>
                        </div>
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>Tip:</strong> Start with 1% for best match to your source audience. Expand to larger percentages for more reach.
                        </div>
                    </form>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" onclick="submitCreateAudience()">
                    <i class="fas fa-plus me-1"></i> Create Audience
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Select all checkbox
document.getElementById('select-all-audiences')?.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.audience-checkbox');
    checkboxes.forEach(cb => cb.checked = this.checked);
});

// Search functionality
document.getElementById('search-audiences')?.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('#audiences-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Filter functionality
['type-filter', 'status-filter'].forEach(filterId => {
    document.getElementById(filterId)?.addEventListener('change', applyFilters);
});

function applyFilters() {
    const typeFilter = document.getElementById('type-filter')?.value || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    
    const rows = document.querySelectorAll('#audiences-table-body tr');
    
    rows.forEach(row => {
        const typeBadge = row.querySelector('td:nth-child(3) .badge')?.textContent.trim().toUpperCase() || '';
        const statusBadge = row.querySelector('td:nth-child(4) .badge')?.textContent.trim() || '';
        
        const matchType = !typeFilter || typeBadge.includes(typeFilter);
        const matchStatus = !statusFilter || statusBadge === statusFilter;
        
        row.style.display = (matchType && matchStatus) ? '' : 'none';
    });
}

function toggleAudienceForm() {
    const type = document.getElementById('audience-type-select').value;
    const customForm = document.getElementById('custom-audience-form');
    const lookalikeForm = document.getElementById('lookalike-audience-form');
    
    customForm.style.display = type === 'CUSTOM' ? 'block' : 'none';
    lookalikeForm.style.display = type === 'LOOKALIKE' ? 'block' : 'none';
}

function showCreateAudienceModal() {
    const modal = new bootstrap.Modal(document.getElementById('createAudienceModal'));
    modal.show();
}

function submitCreateAudience() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    const type = document.getElementById('audience-type-select').value;
    if (!type) {
        alert('Please select an audience type');
        return;
    }
    
    const form = type === 'CUSTOM' ? 
        document.getElementById('createCustomAudienceForm') : 
        document.getElementById('createLookalikeAudienceForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.account_id = selectedAccount;
    data.audience_type = type;
    
    showLoading();
    
    fetch('src/api/audiences.php?action=create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            alert('Audience created successfully!');
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to create audience'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function viewAudienceDetails(audienceId) {
    alert('View audience details: ' + audienceId + '\nThis feature will show audience insights and performance.');
}

function editAudience(audienceId) {
    alert('Edit audience: ' + audienceId + '\nThis feature will be implemented soon.');
}

function createLookalike(sourceAudienceId) {
    // Open create modal with lookalike selected
    document.getElementById('audience-type-select').value = 'LOOKALIKE';
    toggleAudienceForm();
    
    // Pre-select source audience
    const sourceSelect = document.querySelector('#lookalike-audience-form select[name="source_audience_id"]');
    if (sourceSelect) {
        sourceSelect.value = sourceAudienceId;
    }
    
    showCreateAudienceModal();
}

function deleteAudience(audienceId) {
    if (!confirm('Are you sure you want to delete this audience? This action cannot be undone.')) {
        return;
    }
    
    showLoading();
    
    fetch('src/api/audiences.php?action=delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            audience_id: audienceId,
            account_id: selectedAccount
        })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to delete audience'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function syncAudiences() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    if (!confirm('Sync all audiences from Facebook? This may take a few moments.')) {
        return;
    }
    
    window.location.href = 'sync.php';
}

function exportAudiences() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    window.open(`/src/api/audiences.php?action=export&account_id=${selectedAccount}&format=csv`);
}
</script>
