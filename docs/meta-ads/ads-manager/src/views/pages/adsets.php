<?php
$pageTitle = 'Ad Sets';
$pageDescription = 'Manage your ad sets and targeting';
$showCreateButton = true;
$createButtonText = 'Create Ad Set';
$createButtonAction = 'showCreateAdSetModal()';
?>

<!-- Ad Sets Overview Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-layer-group fa-2x text-primary mb-2"></i>
                <h5 class="card-title">Total Ad Sets</h5>
                <h3 class="text-primary"><?php echo count($adsets ?? []); ?></h3>
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
                    $active = array_filter($adsets ?? [], function($a) { return $a['status'] === 'ACTIVE'; });
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
                    $paused = array_filter($adsets ?? [], function($a) { return $a['status'] === 'PAUSED'; });
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
                    $totalSpend = array_sum(array_column($adsets ?? [], 'total_spend'));
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
        <i class="fas fa-layer-group fa-3x text-muted mb-3"></i>
        <h4 class="text-muted">Select an Ad Account</h4>
        <p class="text-muted">Choose an ad account to manage your ad sets</p>
    </div>
<?php else: ?>
    <!-- Filters and Actions -->
    <div class="chart-container mb-4">
        <div class="row align-items-center">
            <div class="col-md-6">
                <div class="d-flex gap-2">
                    <select class="form-select" id="campaign-filter" style="width: auto;">
                        <option value="">All Campaigns</option>
                        <?php if (!empty($campaigns)): ?>
                            <?php foreach ($campaigns as $campaign): ?>
                                <option value="<?php echo $this->e($campaign['id']); ?>">
                                    <?php echo $this->e($campaign['name']); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </select>
                    <select class="form-select" id="status-filter" style="width: auto;">
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PAUSED">Paused</option>
                        <option value="DELETED">Deleted</option>
                    </select>
                    <select class="form-select" id="optimization-filter" style="width: auto;">
                        <option value="">All Goals</option>
                        <option value="LINK_CLICKS">Link Clicks</option>
                        <option value="IMPRESSIONS">Impressions</option>
                        <option value="CONVERSIONS">Conversions</option>
                        <option value="REACH">Reach</option>
                    </select>
                </div>
            </div>
            <div class="col-md-6 text-end">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary btn-sm" onclick="syncAdSets()">
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
    
    <!-- Ad Sets Table -->
    <div class="table-container">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">
                <i class="fas fa-layer-group me-2"></i>Ad Sets
                <span class="badge bg-light text-dark ms-2"><?php echo count($adsets ?? []); ?></span>
            </h5>
            <div class="d-flex gap-2">
                <input type="search" class="form-control" id="adset-search" placeholder="Search ad sets..." style="width: 250px;">
                <button class="btn btn-outline-secondary" onclick="exportAdSets()">
                    <i class="fas fa-download me-1"></i> Export
                </button>
            </div>
        </div>
        
        <?php if (empty($adsets)): ?>
            <div class="text-center py-5">
                <i class="fas fa-layer-group fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No Ad Sets Found</h5>
                <p class="text-muted">Create your first ad set or sync existing ad sets from Facebook</p>
                <div class="d-flex gap-2 justify-content-center">
                    <button class="btn btn-facebook" onclick="showCreateAdSetModal()">
                        <i class="fas fa-plus me-1"></i> Create Ad Set
                    </button>
                    <button class="btn btn-outline-primary" onclick="syncAdSets()">
                        <i class="fas fa-sync me-1"></i> Sync from Facebook
                    </button>
                </div>
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover table-custom" id="adsets-table">
                    <thead>
                        <tr>
                            <th width="30">
                                <input type="checkbox" id="select-all-adsets" class="form-check-input">
                            </th>
                            <th>Ad Set</th>
                            <th>Campaign</th>
                            <th>Status</th>
                            <th>Optimization Goal</th>
                            <th>Budget Type</th>
                            <th>Budget</th>
                            <th>Spend</th>
                            <th>Results</th>
                            <th>CPC</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($adsets as $adset): ?>
                            <tr data-adset-id="<?php echo $this->e($adset['adset_id']); ?>" 
                                data-campaign-id="<?php echo $this->e($adset['campaign_id']); ?>"
                                data-status="<?php echo $this->e($adset['status']); ?>"
                                data-optimization="<?php echo $this->e($adset['optimization_goal']); ?>">
                                <td>
                                    <input type="checkbox" class="form-check-input adset-checkbox" 
                                           value="<?php echo $this->e($adset['adset_id']); ?>">
                                </td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="campaign-icon me-3">
                                            <i class="fas fa-layer-group text-info"></i>
                                        </div>
                                        <div>
                                            <strong class="d-block"><?php echo $this->e($adset['name']); ?></strong>
                                            <small class="text-muted"><?php echo $this->e($adset['adset_id']); ?></small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <small class="text-muted">
                                        <?php 
                                        // Find campaign name
                                        $campaignName = 'Unknown';
                                        if (!empty($campaigns)) {
                                            foreach ($campaigns as $campaign) {
                                                if ($campaign['id'] == $adset['campaign_id']) {
                                                    $campaignName = $campaign['name'];
                                                    break;
                                                }
                                            }
                                        }
                                        echo $this->e($campaignName);
                                        ?>
                                    </small>
                                </td>
                                <td>
                                    <span class="badge status-badge bg-<?php echo $this->getStatusBadge($adset['status']); ?> position-relative">
                                        <?php echo $this->e($adset['status']); ?>
                                        <?php if ($adset['status'] === 'ACTIVE'): ?>
                                            <span class="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                                                <span class="visually-hidden">Active</span>
                                            </span>
                                        <?php endif; ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark">
                                        <?php echo str_replace('_', ' ', $adset['optimization_goal']); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if (!empty($adset['daily_budget'])): ?>
                                        <span class="badge bg-info">Daily</span>
                                    <?php elseif (!empty($adset['lifetime_budget'])): ?>
                                        <span class="badge bg-warning">Lifetime</span>
                                    <?php else: ?>
                                        <span class="text-muted">-</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <strong>
                                        <?php 
                                        $budget = $adset['daily_budget'] ?? $adset['lifetime_budget'] ?? 0;
                                        echo $this->formatCurrency($budget);
                                        ?>
                                    </strong>
                                </td>
                                <td>
                                    <div class="spend-info">
                                        <strong class="text-primary"><?php echo $this->formatCurrency($adset['total_spend'] ?? 0); ?></strong>
                                        <?php if ($budget > 0): ?>
                                            <div class="progress mt-1" style="height: 4px;">
                                                <div class="progress-bar" role="progressbar" 
                                                     style="width: <?php echo min(($adset['total_spend'] ?? 0) / $budget * 100, 100); ?>%">
                                                </div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td>
                                    <div class="results-info">
                                        <strong><?php echo $this->formatNumber($adset['total_clicks'] ?? 0); ?></strong>
                                        <small class="text-muted d-block">clicks</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="<?php echo ($adset['avg_cpc'] ?? 0) < 1 ? 'text-success fw-bold' : 'text-muted'; ?>">
                                        <?php echo $this->formatCurrency($adset['avg_cpc'] ?? 0); ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group" role="group">
                                        <button class="btn btn-sm btn-outline-primary" 
                                                onclick="editAdSet('<?php echo $this->e($adset['adset_id']); ?>')"
                                                title="Edit Ad Set">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-<?php echo $adset['status'] === 'ACTIVE' ? 'warning' : 'success'; ?>" 
                                                onclick="toggleAdSetStatus('<?php echo $this->e($adset['adset_id']); ?>', '<?php echo $adset['status']; ?>')"
                                                title="<?php echo $adset['status'] === 'ACTIVE' ? 'Pause' : 'Activate'; ?>">
                                            <i class="fas fa-<?php echo $adset['status'] === 'ACTIVE' ? 'pause' : 'play'; ?>"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-info" 
                                                onclick="viewAdSetDetails('<?php echo $this->e($adset['adset_id']); ?>')"
                                                title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" 
                                                onclick="deleteAdSet('<?php echo $this->e($adset['adset_id']); ?>')"
                                                title="Delete Ad Set">
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

<!-- Create Ad Set Modal -->
<div class="modal fade" id="createAdSetModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="fas fa-plus me-2"></i>Create New Ad Set
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="createAdSetForm">
                    <div class="row">
                        <div class="col-md-12">
                            <div class="mb-3">
                                <label class="form-label">Campaign *</label>
                                <select class="form-select" name="campaign_id" required>
                                    <option value="">Select Campaign</option>
                                    <?php if (!empty($campaigns)): ?>
                                        <?php foreach ($campaigns as $campaign): ?>
                                            <option value="<?php echo $this->e($campaign['campaign_id']); ?>">
                                                <?php echo $this->e($campaign['name']); ?>
                                            </option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Ad Set Name *</label>
                                <input type="text" class="form-control" name="name" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Optimization Goal *</label>
                                <select class="form-select" name="optimization_goal" required>
                                    <option value="">Select Goal</option>
                                    <option value="LINK_CLICKS">Link Clicks</option>
                                    <option value="IMPRESSIONS">Impressions</option>
                                    <option value="CONVERSIONS">Conversions</option>
                                    <option value="REACH">Reach</option>
                                    <option value="LANDING_PAGE_VIEWS">Landing Page Views</option>
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
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Note:</strong> Targeting settings can be configured after creating the ad set.
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-facebook" onclick="createAdSet()">
                    <i class="fas fa-plus me-1"></i> Create Ad Set
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Ad Sets-specific JavaScript
function showCreateAdSetModal() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    // Check if there are campaigns
    const campaignSelect = document.querySelector('[name="campaign_id"]');
    if (!campaignSelect || campaignSelect.options.length <= 1) {
        alert('Please create a campaign first before creating ad sets');
        return;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('createAdSetModal'));
    modal.show();
}

function createAdSet() {
    const form = document.getElementById('createAdSetForm');
    const formData = new FormData(form);
    
    const adsetData = {
        campaign_id: formData.get('campaign_id'),
        name: formData.get('name'),
        optimization_goal: formData.get('optimization_goal'),
        status: formData.get('status'),
        bid_strategy: formData.get('bid_strategy')
    };
    
    // Set budget based on type
    const budgetType = formData.get('budget_type');
    const budgetAmount = parseFloat(formData.get('budget_amount')) * 100; // Facebook expects cents
    
    if (budgetType === 'daily') {
        adsetData.daily_budget = budgetAmount;
    } else {
        adsetData.lifetime_budget = budgetAmount;
    }
    
    // Basic targeting (can be expanded)
    adsetData.targeting = {
        geo_locations: { countries: ['US'] },
        age_min: 18,
        age_max: 65
    };
    
    fetch('/src/api/adsets.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getAccessToken()
        },
        body: JSON.stringify(adsetData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Ad Set created successfully!');
            bootstrap.Modal.getInstance(document.getElementById('createAdSetModal')).hide();
            window.location.reload();
        } else {
            alert('Error creating ad set: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating ad set');
    });
}

function editAdSet(adsetId) {
    console.log('Edit ad set:', adsetId);
}

function toggleAdSetStatus(adsetId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'activate' : 'pause';
    
    if (!confirm(`Are you sure you want to ${action} this ad set?`)) {
        return;
    }
    
    fetch(`/src/api/adsets.php/${adsetId}`, {
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
            alert('Error updating ad set status: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error updating ad set status');
    });
}

function deleteAdSet(adsetId) {
    if (!confirm('Are you sure you want to delete this ad set? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/src/api/adsets.php/${adsetId}`, {
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
            alert('Error deleting ad set: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error deleting ad set');
    });
}

function viewAdSetDetails(adsetId) {
    console.log('View ad set details:', adsetId);
}

function syncAdSets() {
    window.location.href = 'sync.php';
}

// Initialize filters and search
document.addEventListener('DOMContentLoaded', function() {
    // Campaign filter
    document.getElementById('campaign-filter')?.addEventListener('change', function() {
        filterTable();
    });
    
    // Status filter
    document.getElementById('status-filter')?.addEventListener('change', function() {
        filterTable();
    });
    
    // Optimization filter
    document.getElementById('optimization-filter')?.addEventListener('change', function() {
        filterTable();
    });
    
    // Search
    document.getElementById('adset-search')?.addEventListener('input', function() {
        filterTable();
    });
    
    // Select all checkbox
    document.getElementById('select-all-adsets')?.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.adset-checkbox');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
});

function filterTable() {
    const campaignFilter = document.getElementById('campaign-filter')?.value;
    const statusFilter = document.getElementById('status-filter')?.value;
    const optimizationFilter = document.getElementById('optimization-filter')?.value;
    const searchTerm = document.getElementById('adset-search')?.value.toLowerCase();
    
    const rows = document.querySelectorAll('#adsets-table tbody tr');
    
    rows.forEach(row => {
        const campaignId = row.dataset.campaignId;
        const status = row.dataset.status;
        const optimization = row.dataset.optimization;
        const adsetName = row.querySelector('strong').textContent.toLowerCase();
        
        let show = true;
        
        if (campaignFilter && campaignId !== campaignFilter) show = false;
        if (statusFilter && status !== statusFilter) show = false;
        if (optimizationFilter && optimization !== optimizationFilter) show = false;
        if (searchTerm && !adsetName.includes(searchTerm)) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

function bulkAction(action) {
    const selectedAdSets = document.querySelectorAll('.adset-checkbox:checked');
    
    if (selectedAdSets.length === 0) {
        alert('Please select ad sets first');
        return;
    }
    
    const adsetIds = Array.from(selectedAdSets).map(cb => cb.value);
    const actionText = action === 'activate' ? 'activate' : 'pause';
    
    if (!confirm(`Are you sure you want to ${actionText} ${adsetIds.length} ad set(s)?`)) {
        return;
    }
    
    console.log(`Bulk ${action} for ad sets:`, adsetIds);
}

function exportAdSets() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    window.open(`/src/api/adsets.php?action=export&account_id=${selectedAccount}&format=csv`);
}

// Override the loadAdSetsData function from main layout
function loadAdSetsData() {
    console.log('Ad sets data already loaded from server');
    hideLoading();
}
</script>
