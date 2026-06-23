<?php
$pageTitle = 'Ads';
$pageDescription = 'Manage your ads and creative content';
$showCreateButton = true;
$createButtonText = 'Create Ad';
$createButtonAction = 'showCreateAdModal()';
?>

<!-- Ads Overview Cards -->
<div class="row mb-4">
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-ad fa-2x text-primary mb-2"></i>
                <h5 class="card-title">Total Ads</h5>
                <h3 class="text-primary"><?php echo count($ads ?? []); ?></h3>
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
                    $active = array_filter($ads ?? [], function($a) { return $a['status'] === 'ACTIVE'; });
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
                    $paused = array_filter($ads ?? [], function($a) { return $a['status'] === 'PAUSED'; });
                    echo count($paused);
                    ?>
                </h3>
            </div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card-custom">
            <div class="card-body text-center">
                <i class="fas fa-eye fa-2x text-info mb-2"></i>
                <h5 class="card-title">Total Impressions</h5>
                <h3 class="text-info">
                    <?php 
                    $totalImpressions = array_sum(array_column($ads ?? [], 'impressions'));
                    echo number_format($totalImpressions);
                    ?>
                </h3>
            </div>
        </div>
    </div>
</div>

<?php if (empty($selectedAccount)): ?>
    <!-- No Account Selected -->
    <div class="text-center py-5">
        <i class="fas fa-ad fa-3x text-muted mb-3"></i>
        <h4 class="text-muted">Select an Ad Account</h4>
        <p class="text-muted">Choose an ad account to manage your ads</p>
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
                    <select class="form-select" id="adset-filter" style="width: auto;">
                        <option value="">All Ad Sets</option>
                        <?php if (!empty($adsets)): ?>
                            <?php foreach ($adsets as $adset): ?>
                                <option value="<?php echo $this->e($adset['id']); ?>">
                                    <?php echo $this->e($adset['name']); ?>
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
                </div>
            </div>
            <div class="col-md-6 text-end">
                <div class="input-group" style="width: 300px; margin-left: auto;">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                    <input type="text" class="form-control" id="search-ads" placeholder="Search ads...">
                </div>
            </div>
        </div>
    </div>

    <!-- Ads Table -->
    <div class="chart-container">
        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>
                            <input type="checkbox" id="select-all-ads">
                        </th>
                        <th>Ad Name</th>
                        <th>Ad Set</th>
                        <th>Campaign</th>
                        <th>Status</th>
                        <th>Impressions</th>
                        <th>Clicks</th>
                        <th>CTR</th>
                        <th>Spend</th>
                        <th>CPC</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="ads-table-body">
                    <?php if (empty($ads)): ?>
                        <tr>
                            <td colspan="11" class="text-center py-5">
                                <i class="fas fa-ad fa-3x text-muted mb-3 d-block"></i>
                                <p class="text-muted mb-0">No ads found</p>
                                <small class="text-muted">Create your first ad or sync from Facebook</small>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($ads as $ad): ?>
                            <?php
                            $adId = $ad['ad_id'] ?? $ad['id'];
                            $adName = $ad['name'] ?? 'Unnamed Ad';
                            $adsetName = $ad['adset_name'] ?? 'N/A';
                            $campaignName = $ad['campaign_name'] ?? 'N/A';
                            $status = $ad['status'] ?? 'UNKNOWN';
                            $impressions = $ad['impressions'] ?? 0;
                            $clicks = $ad['clicks'] ?? 0;
                            $spend = $ad['spend'] ?? 0;
                            
                            $ctr = $impressions > 0 ? ($clicks / $impressions * 100) : 0;
                            $cpc = $clicks > 0 ? ($spend / $clicks) : 0;
                            
                            $statusClass = match($status) {
                                'ACTIVE' => 'success',
                                'PAUSED' => 'warning',
                                'DELETED' => 'danger',
                                default => 'secondary'
                            };
                            ?>
                            <tr data-ad-id="<?php echo $this->e($adId); ?>">
                                <td>
                                    <input type="checkbox" class="ad-checkbox" value="<?php echo $this->e($adId); ?>">
                                </td>
                                <td>
                                    <div>
                                        <strong><?php echo $this->e($adName); ?></strong><br>
                                        <small class="text-muted"><?php echo $this->e($adId); ?></small>
                                    </div>
                                </td>
                                <td><?php echo $this->e($adsetName); ?></td>
                                <td><?php echo $this->e($campaignName); ?></td>
                                <td>
                                    <span class="badge bg-<?php echo $statusClass; ?>">
                                        <?php echo $this->e($status); ?>
                                    </span>
                                </td>
                                <td><?php echo number_format($impressions); ?></td>
                                <td><?php echo number_format($clicks); ?></td>
                                <td>
                                    <span class="badge <?php echo $ctr >= 2 ? 'bg-success' : ($ctr >= 1 ? 'bg-warning' : 'bg-danger'); ?>">
                                        <?php echo number_format($ctr, 2); ?>%
                                    </span>
                                </td>
                                <td class="fw-semibold">$<?php echo number_format($spend, 2); ?></td>
                                <td>$<?php echo number_format($cpc, 2); ?></td>
                                <td>
                                    <div class="btn-group" role="group">
                                        <button type="button" class="btn btn-sm btn-outline-primary" 
                                                onclick="editAd('<?php echo $this->e($adId); ?>')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-<?php echo $status === 'ACTIVE' ? 'warning' : 'success'; ?>" 
                                                onclick="toggleAdStatus('<?php echo $this->e($adId); ?>', '<?php echo $status; ?>')">
                                            <i class="fas fa-<?php echo $status === 'ACTIVE' ? 'pause' : 'play'; ?>"></i>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-outline-danger" 
                                                onclick="deleteAd('<?php echo $this->e($adId); ?>')">
                                            <i class="fas fa-trash"></i>
                                        </button>
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

<!-- Create Ad Modal -->
<div class="modal fade" id="createAdModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Create New Ad</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="createAdForm">
                    <div class="mb-3">
                        <label class="form-label">Ad Name *</label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Campaign *</label>
                        <select class="form-select" name="campaign_id" id="modal-campaign-select" required>
                            <option value="">Select Campaign</option>
                            <?php if (!empty($campaigns)): ?>
                                <?php foreach ($campaigns as $campaign): ?>
                                    <option value="<?php echo $this->e($campaign['id']); ?>">
                                        <?php echo $this->e($campaign['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ad Set *</label>
                        <select class="form-select" name="adset_id" id="modal-adset-select" required>
                            <option value="">Select Ad Set</option>
                            <?php if (!empty($adsets)): ?>
                                <?php foreach ($adsets as $adset): ?>
                                    <option value="<?php echo $this->e($adset['id']); ?>">
                                        <?php echo $this->e($adset['name']); ?>
                                    </option>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Status *</label>
                        <select class="form-select" name="status" required>
                            <option value="ACTIVE">Active</option>
                            <option value="PAUSED" selected>Paused</option>
                        </select>
                    </div>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Note:</strong> You'll need to add creative content and targeting after creating the ad.
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" onclick="submitCreateAd()">
                    <i class="fas fa-plus me-1"></i> Create Ad
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// Select all checkbox
document.getElementById('select-all-ads')?.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.ad-checkbox');
    checkboxes.forEach(cb => cb.checked = this.checked);
});

// Search functionality
document.getElementById('search-ads')?.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('#ads-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

// Filter functionality
['campaign-filter', 'adset-filter', 'status-filter'].forEach(filterId => {
    document.getElementById(filterId)?.addEventListener('change', applyFilters);
});

function applyFilters() {
    const campaignFilter = document.getElementById('campaign-filter')?.value || '';
    const adsetFilter = document.getElementById('adset-filter')?.value || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    
    const rows = document.querySelectorAll('#ads-table-body tr');
    
    rows.forEach(row => {
        const campaign = row.querySelector('td:nth-child(4)')?.textContent || '';
        const adset = row.querySelector('td:nth-child(3)')?.textContent || '';
        const status = row.querySelector('.badge')?.textContent.trim() || '';
        
        const matchCampaign = !campaignFilter || campaign.includes(campaignFilter);
        const matchAdset = !adsetFilter || adset.includes(adsetFilter);
        const matchStatus = !statusFilter || status === statusFilter;
        
        row.style.display = (matchCampaign && matchAdset && matchStatus) ? '' : 'none';
    });
}

function showCreateAdModal() {
    const modal = new bootstrap.Modal(document.getElementById('createAdModal'));
    modal.show();
}

function submitCreateAd() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    const form = document.getElementById('createAdForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.account_id = selectedAccount;
    
    showLoading();
    
    fetch('src/api/ads.php?action=create', {
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
            alert('Ad created successfully!');
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to create ad'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function editAd(adId) {
    alert('Edit ad: ' + adId + '\nThis feature will be implemented soon.');
}

function toggleAdStatus(adId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} this ad?`)) {
        return;
    }
    
    showLoading();
    
    fetch('src/api/ads.php?action=update_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ad_id: adId,
            status: newStatus,
            account_id: selectedAccount
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

function deleteAd(adId) {
    if (!confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
        return;
    }
    
    showLoading();
    
    fetch('src/api/ads.php?action=delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ad_id: adId,
            account_id: selectedAccount
        })
    })
    .then(response => response.json())
    .then(result => {
        hideLoading();
        if (result.success) {
            location.reload();
        } else {
            alert('Error: ' + (result.message || 'Failed to delete ad'));
        }
    })
    .catch(error => {
        hideLoading();
        alert('Error: ' + error.message);
    });
}

function syncAds() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    if (!confirm('Sync all ads from Facebook? This may take a few moments.')) {
        return;
    }
    
    window.location.href = 'sync.php';
}

function exportAds() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    window.open(`/src/api/ads.php?action=export&account_id=${selectedAccount}&format=csv`);
}
</script>
