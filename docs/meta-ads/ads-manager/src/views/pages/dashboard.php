<?php
$pageTitle = 'Dashboard';
$pageDescription = 'Overview of your advertising performance';
?>

<!-- Metrics Cards -->
<div class="row">
    <div class="col-md-3">
        <div class="metric-card">
            <h3 id="total-spend">
                <?php echo $this->formatCurrency($metrics['total_spend'] ?? 0); ?>
            </h3>
            <p><i class="fas fa-dollar-sign me-1"></i> Total Spend (30 days)</p>
        </div>
    </div>
    <div class="col-md-3">
        <div class="metric-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <h3 id="total-impressions">
                <?php echo $this->formatNumber($metrics['total_impressions'] ?? 0); ?>
            </h3>
            <p><i class="fas fa-eye me-1"></i> Total Impressions</p>
        </div>
    </div>
    <div class="col-md-3">
        <div class="metric-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <h3 id="total-clicks">
                <?php echo $this->formatNumber($metrics['total_clicks'] ?? 0); ?>
            </h3>
            <p><i class="fas fa-mouse-pointer me-1"></i> Total Clicks</p>
        </div>
    </div>
    <div class="col-md-3">
        <div class="metric-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
            <h3 id="avg-ctr">
                <?php echo $this->formatPercent($metrics['avg_ctr'] ?? 0); ?>
            </h3>
            <p><i class="fas fa-percentage me-1"></i> Average CTR</p>
        </div>
    </div>
</div>

<!-- Additional Metrics Row -->
<div class="row mb-4">
    <div class="col-md-4">
        <div class="card-custom">
            <div class="card-body text-center">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="card-title mb-0">Average CPC</h6>
                    <i class="fas fa-coins text-primary"></i>
                </div>
                <h4 class="text-primary mb-0">
                    <?php echo $this->formatCurrency($metrics['avg_cpc'] ?? 0); ?>
                </h4>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card-custom">
            <div class="card-body text-center">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="card-title mb-0">Average CPM</h6>
                    <i class="fas fa-chart-bar text-success"></i>
                </div>
                <h4 class="text-success mb-0">
                    <?php echo $this->formatCurrency($metrics['avg_cpm'] ?? 0); ?>
                </h4>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="card-custom">
            <div class="card-body text-center">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="card-title mb-0">Active Campaigns</h6>
                    <i class="fas fa-bullhorn text-warning"></i>
                </div>
                <h4 class="text-warning mb-0">
                    <?php echo $this->formatNumber($metrics['total_campaigns'] ?? 0); ?>
                </h4>
            </div>
        </div>
    </div>
</div>

<?php if (empty($selectedAccount)): ?>
    <!-- No Account Selected -->
    <div class="text-center py-5">
        <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
        <h4 class="text-muted">Select an Ad Account</h4>
        <p class="text-muted">Choose an ad account from the dropdown above to view your dashboard data</p>
    </div>
<?php else: ?>
    <!-- Charts -->
    <div class="row">
        <div class="col-md-8">
            <div class="chart-container">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0"><i class="fas fa-chart-line me-2"></i>Performance Trends (Last 30 days)</h5>
                    <div class="btn-group" role="group">
                        <input type="radio" class="btn-check" name="trendMetric" id="trend-spend" value="spend" checked>
                        <label class="btn btn-outline-primary btn-sm" for="trend-spend">Spend</label>
                        
                        <input type="radio" class="btn-check" name="trendMetric" id="trend-clicks" value="clicks">
                        <label class="btn btn-outline-primary btn-sm" for="trend-clicks">Clicks</label>
                        
                        <input type="radio" class="btn-check" name="trendMetric" id="trend-impressions" value="impressions">
                        <label class="btn btn-outline-primary btn-sm" for="trend-impressions">Impressions</label>
                    </div>
                </div>
                <canvas id="trendsChart" height="100"></canvas>
            </div>
        </div>
        <div class="col-md-4">
            <div class="chart-container">
                <h5 class="mb-3"><i class="fas fa-pie-chart me-2"></i>Campaign Objectives</h5>
                <canvas id="objectivesChart"></canvas>
            </div>
        </div>
    </div>
    
    <!-- Top Campaigns Table -->
    <div class="table-container">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0"><i class="fas fa-trophy me-2"></i>Top Performing Campaigns</h5>
            <a href="<?php echo $this->url('?page=campaigns&account_id=' . urlencode($selectedAccount)); ?>" 
               class="btn btn-outline-primary btn-sm">
                <i class="fas fa-external-link-alt me-1"></i> View All
            </a>
        </div>
        
        <?php if (empty($campaigns)): ?>
            <div class="text-center py-4">
                <i class="fas fa-bullhorn fa-2x text-muted mb-3"></i>
                <h6 class="text-muted">No campaign data available</h6>
                <p class="text-muted small">Start by creating your first campaign or sync existing data</p>
                <button class="btn btn-facebook btn-sm" onclick="syncCampaigns()">
                    <i class="fas fa-sync me-1"></i> Sync Campaigns
                </button>
            </div>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover table-custom">
                    <thead>
                        <tr>
                            <th><i class="fas fa-tag me-1"></i> Campaign Name</th>
                            <th><i class="fas fa-toggle-on me-1"></i> Status</th>
                            <th><i class="fas fa-target me-1"></i> Objective</th>
                            <th><i class="fas fa-dollar-sign me-1"></i> Spend</th>
                            <th><i class="fas fa-eye me-1"></i> Impressions</th>
                            <th><i class="fas fa-mouse-pointer me-1"></i> Clicks</th>
                            <th><i class="fas fa-percentage me-1"></i> CTR</th>
                            <th><i class="fas fa-coins me-1"></i> CPC</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($campaigns as $campaign): ?>
                            <tr>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="campaign-icon me-2">
                                            <i class="fas fa-bullhorn text-primary"></i>
                                        </div>
                                        <div>
                                            <strong><?php echo $this->e($campaign['name']); ?></strong>
                                            <br>
                                            <small class="text-muted"><?php echo $this->e($campaign['campaign_id']); ?></small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge status-badge bg-<?php echo $this->getStatusBadge($campaign['status']); ?>">
                                        <?php echo $this->e($campaign['status']); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="badge bg-light text-dark">
                                        <?php echo $this->e($campaign['objective']); ?>
                                    </span>
                                </td>
                                <td>
                                    <strong><?php echo $this->formatCurrency($campaign['total_spend'] ?? 0); ?></strong>
                                </td>
                                <td><?php echo $this->formatNumber($campaign['total_impressions'] ?? 0); ?></td>
                                <td><?php echo $this->formatNumber($campaign['total_clicks'] ?? 0); ?></td>
                                <td>
                                    <span class="<?php echo ($campaign['avg_ctr'] ?? 0) > 2 ? 'text-success' : 'text-muted'; ?>">
                                        <?php echo $this->formatPercent($campaign['avg_ctr'] ?? 0); ?>
                                    </span>
                                </td>
                                <td><?php echo $this->formatCurrency($campaign['avg_cpc'] ?? 0); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
<?php endif; ?>

<script>
// Dashboard-specific JavaScript
function loadDashboardData() {
    if (!selectedAccount) return;
    
    showLoading();
    
    // Load metrics
    fetch(`ajax.php?action=metrics&account_id=${selectedAccount}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateMetrics(data.data);
            }
        })
        .catch(error => console.error('Error loading metrics:', error))
        .finally(() => hideLoading());
    
    // Load charts
    loadTrendsChart();
    loadObjectivesChart();
}

function updateMetrics(metrics) {
    document.getElementById('total-spend').textContent = formatCurrency(metrics.total_spend || 0);
    document.getElementById('total-impressions').textContent = formatNumber(metrics.total_impressions || 0);
    document.getElementById('total-clicks').textContent = formatNumber(metrics.total_clicks || 0);
    document.getElementById('avg-ctr').textContent = formatPercent(metrics.avg_ctr || 0);
}

function loadTrendsChart() {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;
    
    // Sample data - replace with actual API call
    const chartData = {
        labels: <?php echo json_encode(array_column($chartData['trends'] ?? [], 'date_start')); ?>,
        datasets: [{
            label: 'Spend ($)',
            data: <?php echo json_encode(array_column($chartData['trends'] ?? [], 'spend')); ?>,
            borderColor: '#1877f2',
            backgroundColor: 'rgba(24, 119, 242, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function loadObjectivesChart() {
    const ctx = document.getElementById('objectivesChart');
    if (!ctx) return;
    
    const objectives = <?php echo json_encode($chartData['objectives'] ?? []); ?>;
    
    const chartData = {
        labels: objectives.map(obj => obj.objective),
        datasets: [{
            data: objectives.map(obj => obj.count),
            backgroundColor: [
                '#1877f2',
                '#42b883', 
                '#e74c3c',
                '#f39c12',
                '#9b59b6',
                '#34495e'
            ],
            borderWidth: 0
        }]
    };
    
    new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function syncCampaigns() {
    // Redirect to sync page with auto-sync
    window.location.href = 'sync.php';
}

// Trend metric switcher
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input[name="trendMetric"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Update chart with selected metric
            console.log('Switching to metric:', this.value);
            // Implementation for switching chart data
        });
    });
});
</script>