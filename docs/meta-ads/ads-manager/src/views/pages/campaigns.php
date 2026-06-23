<?php
$pageTitle = 'Campaigns';
$pageDescription = 'Manage your advertising campaigns';
$showCreateButton = true;
$createButtonText = 'Create Campaign';
$createButtonAction = 'showCreateCampaignModal()';
?>

<!-- Campaigns Overview Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-bullhorn fa-2x text-primary mb-2"></i>
                <h5 class="card-title">Total Campaigns</h5>
                <h3 class="text-primary"><?php echo count($campaigns ?? []); ?></h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-play fa-2x text-success mb-2"></i>
                <h5 class="card-title">Active</h5>
                <h3 class="text-success">
                    <?php 
                    $active = array_filter($campaigns ?? [], function($c) { return $c['status'] === 'ACTIVE'; });
                    echo count($active);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-pause fa-2x text-warning mb-2"></i>
                <h5 class="card-title">Paused</h5>
                <h3 class="text-warning">
                    <?php 
                    $paused = array_filter($campaigns ?? [], function($c) { return $c['status'] === 'PAUSED'; });
                    echo count($paused);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-dollar-sign fa-2x text-info mb-2"></i>
                <h5 class="card-title">Total Spend</h5>
                <h3 class="text-info">
                    <?php 
                    $totalSpend = array_sum(array_column($campaigns ?? [], 'total_spend'));
                    echo $this->formatCurrency($totalSpend);
                    ?>
                </h3>
            </div>
        </div>
    </div>
</div>

<?php if (empty($selectedAccount)): ?>
    <!-- No Account Selected -->
    <div class="text-center py-5">
        <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
        <h4 class="text-muted">Select an Ad Account</h4>
        <p class="text-muted">Choose an ad account to manage your campaigns</p>
    </div>
<?php else: ?>
    <!-- Filters and Actions -->
    <div class="chart-container mb-4">
        <div class="row align-items-center">
            <div class="col-md-6">
                <div class="d-flex gap-2">
                    <select class="form-select" id="status-filter" style="width: auto;">
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="DELETED">Deleted</option>
                    </select>
                    <select class="form-select" id="objective-filter" style="width: auto;">
                        <option value="">All Objectives</option>
                        <option value="OUTCOME_TRAFFIC">Traffic</option>
                        <option value="OUTCOME_CONVERSIONS">Conversions</option>
                        <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                        <option value="OUTCOME_LEADS">Leads</option>
                        <option value="OUTCOME_SALES">Sales</option>
                        <option value="OUTCOME_AWARENESS">Awareness</option>
                    </select>
                </div>
            </div>
            <div class="col-md-6 text-end">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary btn-sm" onclick="syncCampaigns()">
                        <i class="fas fa-sync me-1"></i> Sync from Facebook
                    </button>
                    <button class="btn btn-outline-success btn-sm" onclick="bulkAction('activate')">
                        <i class="fas fa-play me-1"></i> Bulk Activate
                    </button>
                    <button class="btn btn-outline-warning btn-sm" onclick="bulkAction('pause')">
                        <i class="fas fa-pause me-1"></i> Bulk Pause
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Campaigns Table -->
    <div class="table-container">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">
                <i class="fas fa-bullhorn me-2"></i>Campaigns
                <span class="badge bg-light text-dark ms-2"><?php echo count($campaigns ?? []); ?></span>
            </h5>
            <div class="d-flex gap-2">
                <input type="search" class="form-control" id="campaign-search" placeholder="Search campaigns..." style="width: 250px;">
                <button class="btn btn-outline-secondary" onclick="exportCampaigns()">
                    <i class="fas fa-download me-1"></i> Export
                </button>
            </div>
        </div>
        
        <?php if (empty($campaigns)): ?>
            <div class="text-center py-5">
                <i class="fas fa-bullhorn fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No Campaigns Found</h5>
                <p class="text-muted">Create your first campaign or sync existing campaigns from Facebook</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-facebook" onclick="showCreateCampaignModal()">
                        <i class="fas fa-plus me-1"></i> Create Campaign
                    </button>
                    <button class="btn btn-outline-primary" onclick="syncCampaigns()">
                        <i class="fas fa-sync me-1"></i> Sync from Facebook
                    </button>
                </div>
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover table-custom" id="campaigns-table">
                    <thead>
                        <tr>
                            <th width="30">
                                <input type="checkbox" id="select-all-campaigns" class="form-check-input">
                            </th>
                            <th>Campaign</th>
                            <th>Status</th>
                            <th>Objective</th>
                            <th>Budget Type</th>
                            <th>Budget</th>
                            <th>Spend</th>
                            <th>Results</th>
                            <th>CTR</th>
                            <th>CPC</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($campaigns as $campaign): ?>
                            <tr data-campaign-id="<?php echo $this->e($campaign['campaign_id']); ?>" 
                                data-status="<?php echo $this->e($campaign['status']); ?>"
                                data-objective="<?php echo $this->e($campaign['objective']); ?>">
                                <td>
                                    <input type="checkbox" class="form-check-input campaign-checkbox" 
                                           value="<?php echo $this->e($campaign['campaign_id']); ?>">
                                </td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="campaign-icon me-3">
                                            <i class="fas fa-bullhorn text-primary"></i>
                                        </div>
                                        <div>
                                            <strong class="d-block"><?php echo $this->e($campaign['name']); ?></strong>
                                            <small class="text-muted"><?php echo $this->e($campaign['campaign_id']); ?></small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge status-badge bg-<?php echo $this->getStatusBadge($campaign['status']); ?> position-relative">
                                        <?php echo $this->e($campaign['status']); ?>
                                        <?php if ($campaign['status'] === 'ACTIVE'): ?>
                                            <span class="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                                                <span class="visually-hidden">Active</span>
                                            </span>
                                        <?php endif; ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark">
                                        <?php echo str_replace('OUTCOME_', '', $campaign['objective']); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if (!empty($campaign['daily_budget'])): ?>
                                        <span class="badge bg-info">Daily</span>
                                    <?php elseif (!empty($campaign['lifetime_budget'])): ?>
                                        <span class="badge bg-warning">Lifetime</span>
                                    <?php else: ?>
                                        <span class="text-muted">-</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <strong>
                                        <?php 
                                        $budget = $campaign['daily_budget'] ?? $campaign['lifetime_budget'] ?? 0;
                                        echo $this->formatCurrency($budget);
                                        ?>
                                    </strong>
                                </td>
                                <td>
                                    <div class="spend-info">
                                        <strong class="text-primary"><?php echo $this->formatCurrency($campaign['total_spend'] ?? 0); ?></strong>
                                        <?php if ($budget > 0): ?>
                                            <div class="progress mt-1" style="height: 4px;">
                                                <div class="progress-bar" role="progressbar" 
                                                     style="width: <?php echo min(($campaign['total_spend'] ?? 0) / $budget * 100, 100); ?>%">
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td>
                                    <div class="results-info">
                                        <strong><?php echo $this->formatNumber($campaign['total_clicks'] ?? 0); ?></strong>
                                        <small class="text-muted d-block">clicks</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="<?php echo ($campaign['avg_ctr'] ?? 0) > 2 ? 'text-success fw-bold' : 'text-muted'; ?>">
                                        <?php echo $this->formatPercent($campaign['avg_ctr'] ?? 0); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="<?php echo ($campaign['avg_cpc'] ?? 0) < 1 ? 'text-success fw-bold' : 'text-muted'; ?>">
                                        <?php echo $this->formatCurrency($campaign['avg_cpc'] ?? 0); ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-sm btn-outline-primary" 
                                                onclick="editCampaign('<?php echo $this->e($campaign['campaign_id']); ?>')"
                                                title="Edit Campaign">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-<?php echo $campaign['status'] === 'ACTIVE' ? 'warning' : 'success'; ?>" 
                                                onclick="toggleCampaignStatus('<?php echo $this->e($campaign['campaign_id']); ?>', '<?php echo $campaign['status']; ?>')"
                                                title="<?php echo $campaign['status'] === 'ACTIVE' ? 'Pause' : 'Activate'; ?>">
                                            <i class="fas fa-<?php echo $campaign['status'] === 'ACTIVE' ? 'pause' : 'play'; ?>"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-info" 
                                                onclick="viewCampaignDetails('<?php echo $this->e($campaign['campaign_id']); ?>')"
                                                title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" 
                                                onclick="deleteCampaign('<?php echo $this->e($campaign['campaign_id']); ?>')"
                                                title="Delete Campaign">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<!-- Create Campaign Modal -->
<div class="modal fade" id="createCampaignModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-plus me-2"></i>Create New Campaign
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="createCampaignForm">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Campaign Name *</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Objective *</label>
                                <select class="form-select" name="objective" required>
                                    <option value="">Select Objective</option>
                                    <option value="OUTCOME_TRAFFIC">Traffic</option>
                                    <option value="OUTCOME_CONVERSIONS">Conversions</option>
                                    <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                                    <option value="OUTCOME_LEADS">Leads</option>
                                    <option value="OUTCOME_SALES">Sales</option>
                                    <option value="OUTCOME_AWARENESS">Awareness</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Budget Type *</label>
                                <select class="form-select" name="budget_type" required>
                                    <option value="daily">Daily Budget</option>
                                    <option value="lifetime">Lifetime Budget</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Budget Amount ($) *</label>
                                <input type="number" class="form-control" name="budget_amount" min="1" step="0.01" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Bid Strategy</label>
                                <select class="form-select" name="bid_strategy">
                                    <option value="LOWEST_COST">Lowest Cost</option>
                                    <option value="COST_CAP">Cost Cap</option>
                                    <option value="BID_CAP">Bid Cap</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Status</label>
                                <select class="form-select" name="status">
                                    <option value="PAUSED">Paused</option>
                                    <option value="ACTIVE">Active</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-facebook" onclick="createCampaign()">
                    <i class="fas fa-plus me-1"></i> Create Campaign
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Campaigns-specific JavaScript
function loadCampaignsData() {
    // Implementation for loading campaigns data
    hideLoading();
}

function showCreateCampaignModal() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('createCampaignModal'));
    modal.show();
}

function createCampaign() {
    const form = document.getElementById('createCampaignForm');
    const formData = new FormData(form);
    
    const campaignData = {
        account_id: selectedAccount,
        name: formData.get('name'),
        objective: formData.get('objective'),
        status: formData.get('status'),
        bid_strategy: formData.get('bid_strategy')
    };
    
    // Set budget based on type
    const budgetType = formData.get('budget_type');
    const budgetAmount = parseFloat(formData.get('budget_amount')) * 100; // Facebook expects cents
    
    if (budgetType === 'daily') {
        campaignData.daily_budget = budgetAmount;
    } else {
        campaignData.lifetime_budget = budgetAmount;
    }
    
    fetch('/src/api/campaigns.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAccessToken()
        },
        body: JSON.stringify(campaignData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Campaign created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createCampaignModal')).hide();
            window.location.reload();
        } else {
            alert('Error creating campaign: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating campaign');
    });
}

function editCampaign(campaignId) {
    // Implementation for editing campaign
    console.log('Edit campaign:', campaignId);
}

function toggleCampaignStatus(campaignId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'pause';
    
    if (!confirm(`Are you sure you want to ${action} this campaign?`)) {
        return;
    }
    
    fetch(`/src/api/campaigns.php/${campaignId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAccessToken()
        },
        body: JSON.stringify({ status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error updating campaign status: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating campaign status');
    });
}

function deleteCampaign(campaignId) {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/src/api/campaigns.php/${campaignId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + getAccessToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.reload();
        } else {
            alert('Error deleting campaign: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting campaign');
    });
}

function syncCampaigns() {
    // Redirect to sync page with auto-sync
    window.location.href = 'sync.php';
}

// Initialize filters and search
document.addEventListener('DOMContentLoaded', function() {
    // Status filter
    document.getElementById('status-filter')?.addEventListener('change', function() {
        filterTable();
    });
    
    // Objective filter
    document.getElementById('objective-filter')?.addEventListener('change', function() {
        filterTable();
    });
    
    // Search
    document.getElementById('campaign-search')?.addEventListener('input', function() {
        filterTable();
    });
    
    // Select all checkbox
    document.getElementById('select-all-campaigns')?.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.campaign-checkbox');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
});

function filterTable() {
    const statusFilter = document.getElementById('status-filter')?.value;
    const objectiveFilter = document.getElementById('objective-filter')?.value;
    const searchTerm = document.getElementById('campaign-search')?.value.toLowerCase();
    
    const rows = document.querySelectorAll('#campaigns-table tbody tr');
    
    rows.forEach(row => {
        const status = row.dataset.status;
        const objective = row.dataset.objective;
        const campaignName = row.querySelector('strong').textContent.toLowerCase();
        
        let show = true;
        
        if (statusFilter && status !== statusFilter) show = false;
        if (objectiveFilter && objective !== objectiveFilter) show = false;
        if (searchTerm && !campaignName.includes(searchTerm)) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

function bulkAction(action) {
    const selectedCampaigns = document.querySelectorAll('.campaign-checkbox:checked');
    
    if (selectedCampaigns.length === 0) {
        alert('Please select campaigns first');
        return;
    }
    
    const campaignIds = Array.from(selectedCampaigns).map(cb => cb.value);
    const actionText = action === 'activate' ? 'activate' : 'pause';
    
    if (!confirm(`Are you sure you want to ${actionText} ${campaignIds.length} campaign(s)?`)) {
        return;
    }
    
    // Implementation for bulk actions
    console.log(`Bulk ${action} for campaigns:`, campaignIds);
}

function exportCampaigns() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    window.open(`/src/api/campaigns.php?action=export&account_id=${selectedAccount}&format=csv`);
}
</script>