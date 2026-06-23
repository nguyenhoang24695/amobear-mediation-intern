<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h1 class="h3 mb-0">Insights & Reporting</h1>
        <p class="text-muted mb-0">Analyze performance metrics and track campaign results</p>
    </div>
    <div class="d-flex gap-2">
        <button class="btn btn-outline-primary" onclick="syncInsights()">
            <i class="fas fa-sync-alt me-2"></i>Sync Insights
        </button>
        <button class="btn btn-success" onclick="exportReport()">
            <i class="fas fa-download me-2"></i>Export Report
        </button>
    </div>
</div>

<!-- Filters & Date Range -->
<div class="card mb-4">
    <div class="card-body">
        <div class="row g-3">
            <div class="col-md-3">
                <label class="form-label fw-semibold">Date Range</label>
                <select class="form-select" id="date-range" onchange="updateDateRange()">
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last_7_days" selected>Last 7 Days</option>
                    <option value="last_14_days">Last 14 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="custom">Custom Range</option>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label fw-semibold">From</label>
                <input type="date" class="form-control" id="date-start" 
                       value="<?php echo htmlspecialchars($dateStart ?? date('Y-m-d', strtotime('-7 days'))); ?>"
                       onchange="filterReport()">
            </div>
            <div class="col-md-2">
                <label class="form-label fw-semibold">To</label>
                <input type="date" class="form-control" id="date-end" 
                       value="<?php echo htmlspecialchars($dateEnd ?? date('Y-m-d')); ?>"
                       onchange="filterReport()">
            </div>
            <div class="col-md-2">
                <label class="form-label fw-semibold">Entity Type</label>
                <select class="form-select" id="entity-type" onchange="filterReport()">
                    <option value="campaign" <?php echo ($entityType ?? 'campaign') === 'campaign' ? 'selected' : ''; ?>>Campaigns</option>
                    <option value="adset" <?php echo ($entityType ?? 'campaign') === 'adset' ? 'selected' : ''; ?>>Ad Sets</option>
                    <option value="ad" <?php echo ($entityType ?? 'campaign') === 'ad' ? 'selected' : ''; ?>>Ads</option>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label fw-semibold">Compare</label>
                <select class="form-select" id="compare-period">
                    <option value="">No Comparison</option>
                    <option value="previous_period">Previous Period</option>
                    <option value="previous_year">Previous Year</option>
                </select>
            </div>
        </div>
    </div>
</div>

<!-- Overview Cards -->
<div class="row g-3 mb-4">
    <?php
    $summary = $report['summary'] ?? [];
    $metrics = [
        'impressions' => ['icon' => 'eye', 'color' => 'primary', 'label' => 'Impressions'],
        'clicks' => ['icon' => 'mouse-pointer', 'color' => 'info', 'label' => 'Clicks'],
        'spend' => ['icon' => 'dollar-sign', 'color' => 'danger', 'label' => 'Amount Spent', 'format' => 'currency'],
        'conversions' => ['icon' => 'check-circle', 'color' => 'success', 'label' => 'Conversions'],
        'ctr' => ['icon' => 'percent', 'color' => 'warning', 'label' => 'CTR', 'format' => 'percent'],
        'cpc' => ['icon' => 'hand-pointer', 'color' => 'secondary', 'label' => 'CPC', 'format' => 'currency'],
        'cpm' => ['icon' => 'chart-bar', 'color' => 'info', 'label' => 'CPM', 'format' => 'currency'],
        'roas' => ['icon' => 'chart-line', 'color' => 'success', 'label' => 'ROAS', 'format' => 'number']
    ];
    
    foreach ($metrics as $key => $config):
        $value = $summary[$key] ?? 0;
        
        // Format value based on type
        if (isset($config['format'])) {
            if ($config['format'] === 'currency') {
                $displayValue = '$' . number_format($value, 2);
            } elseif ($config['format'] === 'percent') {
                $displayValue = number_format($value, 2) . '%';
            } else {
                $displayValue = number_format($value, 2);
            }
        } else {
            $displayValue = number_format($value);
        }
    ?>
    <div class="col-xl-3 col-md-6">
        <div class="card border-start border-<?php echo $config['color']; ?> border-1">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="flex-grow-1">
                        <p class="text-muted mb-1 small"><?php echo $config['label']; ?></p>
                        <h4 class="mb-0"><?php echo $displayValue; ?></h4>
                    </div>
                    <div class="ms-3">
                        <div class="bg-<?php echo $config['color']; ?> bg-opacity-10 rounded p-3">
                            <i class="fas fa-<?php echo $config['icon']; ?> fa-2x text-<?php echo $config['color']; ?>"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<!-- Performance Charts -->
<div class="row mb-4">
    <div class="col-xl-8">
        <div class="card">
            <div class="card-header bg-white">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">Performance Trends</h5>
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="chart-metric" id="chart-impressions" checked>
                        <label class="btn btn-outline-primary" for="chart-impressions" onclick="updateChart('impressions')">Impressions</label>
                        
                        <input type="radio" class="btn-check" name="chart-metric" id="chart-clicks">
                        <label class="btn btn-outline-primary" for="chart-clicks" onclick="updateChart('clicks')">Clicks</label>
                        
                        <input type="radio" class="btn-check" name="chart-metric" id="chart-spend">
                        <label class="btn btn-outline-primary" for="chart-spend" onclick="updateChart('spend')">Spend</label>
                    </div>
                </div>
            </div>
            <div class="card-body position-relative" style="height: 400px;">
                <canvas id="performanceChart"></canvas>
                <div id="chartNoDataMessage" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <p class="text-muted mb-1"><strong>No data available</strong></p>
                    <small class="text-muted">Click "Sync Insights" to load data</small>
                </div>
            </div>
        </div>
    </div>
    
    <div class="col-xl-4">
        <div class="card">
            <div class="card-header bg-white">
                <h5 class="mb-0">Budget Distribution</h5>
            </div>
            <div class="card-body d-flex justify-content-center">
                <div style="width: 360px; height: 360px;">
                    <canvas id="budgetChart"></canvas>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Detailed Insights Table -->
<div class="card">
    <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h5 class="mb-0">Detailed Insights</h5>
        <div class="d-flex gap-2">
            <input type="text" class="form-control form-control-sm" style="width: 250px;" 
                   id="insights-search" placeholder="Search..." onkeyup="filterTable()">
            <button class="btn btn-sm btn-outline-secondary" onclick="toggleColumns()">
                <i class="fas fa-columns me-1"></i>Columns
            </button>
        </div>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0" id="insights-table">
                <thead class="table-light">
                    <tr>
                        <th>
                            <input type="checkbox" id="select-all-insights">
                        </th>
                        <th onclick="sortTable('name')" style="cursor: pointer;">
                            Name <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('impressions')" style="cursor: pointer;" class="text-end">
                            Impressions <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('clicks')" style="cursor: pointer;" class="text-end">
                            Clicks <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('ctr')" style="cursor: pointer;" class="text-end">
                            CTR <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('spend')" style="cursor: pointer;" class="text-end">
                            Spend <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('cpc')" style="cursor: pointer;" class="text-end">
                            CPC <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('cpm')" style="cursor: pointer;" class="text-end">
                            CPM <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('conversions')" style="cursor: pointer;" class="text-end">
                            Conversions <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('cpa')" style="cursor: pointer;" class="text-end">
                            CPA <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th onclick="sortTable('roas')" style="cursor: pointer;" class="text-end">
                            ROAS <i class="fas fa-sort ms-1"></i>
                        </th>
                        <th class="text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($report['data'])): ?>
                    <tr>
                        <td colspan="12" class="text-center text-muted py-5">
                            <i class="fas fa-chart-line fa-3x mb-3 d-block"></i>
                            <p class="mb-0">No insights data available for the selected period.</p>
                            <small class="text-muted">Try syncing data or selecting a different date range.</small>
                        </td>
                    </tr>
                    <?php else: ?>
                        <?php foreach ($report['data'] as $item): 
                            $entityId = $item['campaign_id'] ?? $item['adset_id'] ?? $item['ad_id'] ?? '';
                            $entityName = $item['name'] ?? 'Unknown';
                            
                            // Get metrics - handle both direct and aggregated field names
                            $impressions = $item['total_impressions'] ?? $item['impressions'] ?? 0;
                            $clicks = $item['total_clicks'] ?? $item['clicks'] ?? 0;
                            $spend = $item['total_spend'] ?? $item['spend'] ?? 0;
                            $conversions = $item['conversions'] ?? 0;
                            
                            $ctr = $impressions > 0 ? ($clicks / $impressions * 100) : 0;
                            $cpc = $clicks > 0 ? ($spend / $clicks) : 0;
                            $cpm = $impressions > 0 ? ($spend / $impressions * 1000) : 0;
                            $cpa = $conversions > 0 ? ($spend / $conversions) : 0;
                            $roas = $conversions > 0 && isset($item['conversion_value']) ? ($item['conversion_value'] / $spend) : 0;
                        ?>
                    <tr data-entity-id="<?php echo htmlspecialchars($entityId); ?>">
                        <td>
                            <input type="checkbox" class="insight-checkbox" value="<?php echo htmlspecialchars($entityId); ?>">
                        </td>
                        <td>
                            <div>
                                <strong><?php echo htmlspecialchars($entityName); ?></strong>
                                <br>
                                <small class="text-muted"><?php echo htmlspecialchars($entityId); ?></small>
                            </div>
                        </td>
                        <td class="text-end"><?php echo number_format($impressions); ?></td>
                        <td class="text-end"><?php echo number_format($clicks); ?></td>
                        <td class="text-end">
                            <span class="badge <?php echo $ctr >= 2 ? 'bg-success' : ($ctr >= 1 ? 'bg-warning' : 'bg-danger'); ?>">
                                <?php echo number_format($ctr, 2); ?>%
                            </span>
                        </td>
                        <td class="text-end fw-semibold">$<?php echo number_format($spend, 2); ?></td>
                        <td class="text-end">$<?php echo number_format($cpc, 2); ?></td>
                        <td class="text-end">$<?php echo number_format($cpm, 2); ?></td>
                        <td class="text-end">
                            <span class="badge bg-success-subtle text-success">
                                <?php echo number_format($conversions); ?>
                            </span>
                        </td>
                        <td class="text-end">$<?php echo number_format($cpa, 2); ?></td>
                        <td class="text-end">
                            <span class="badge <?php echo $roas >= 3 ? 'bg-success' : ($roas >= 2 ? 'bg-warning' : 'bg-secondary'); ?>">
                                <?php echo number_format($roas, 2); ?>x
                            </span>
                        </td>
                        <td class="text-center">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-light" data-bs-toggle="dropdown">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="viewDetails('<?php echo htmlspecialchars($entityId); ?>')">
                                        <i class="fas fa-eye me-2"></i>View Details
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="exportEntity('<?php echo htmlspecialchars($entityId); ?>')">
                                        <i class="fas fa-download me-2"></i>Export
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item" href="?page=campaigns&highlight=<?php echo htmlspecialchars($entityId); ?>">
                                        <i class="fas fa-external-link-alt me-2"></i>Go to Campaign
                                    </a></li>
                                </ul>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
                <tfoot class="table-light fw-bold">
                    <tr>
                        <td colspan="2">TOTAL</td>
                        <td class="text-end"><?php echo number_format($summary['impressions'] ?? 0); ?></td>
                        <td class="text-end"><?php echo number_format($summary['clicks'] ?? 0); ?></td>
                        <td class="text-end"><?php echo number_format($summary['ctr'] ?? 0, 2); ?>%</td>
                        <td class="text-end">$<?php echo number_format($summary['spend'] ?? 0, 2); ?></td>
                        <td class="text-end">$<?php echo number_format($summary['cpc'] ?? 0, 2); ?></td>
                        <td class="text-end">$<?php echo number_format($summary['cpm'] ?? 0, 2); ?></td>
                        <td class="text-end"><?php echo number_format($summary['conversions'] ?? 0); ?></td>
                        <td class="text-end">$<?php echo number_format($summary['cpa'] ?? 0, 2); ?></td>
                        <td class="text-end"><?php echo number_format($summary['roas'] ?? 0, 2); ?>x</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</div>

<!-- Column Selector Modal -->
<div class="modal fade" id="columnsModal" tabindex="-1">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Select Columns</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-impressions" checked>
                    <label class="form-check-label" for="col-impressions">Impressions</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-clicks" checked>
                    <label class="form-check-label" for="col-clicks">Clicks</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-ctr" checked>
                    <label class="form-check-label" for="col-ctr">CTR</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-spend" checked>
                    <label class="form-check-label" for="col-spend">Spend</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-cpc" checked>
                    <label class="form-check-label" for="col-cpc">CPC</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-cpm" checked>
                    <label class="form-check-label" for="col-cpm">CPM</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-conversions" checked>
                    <label class="form-check-label" for="col-conversions">Conversions</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-cpa" checked>
                    <label class="form-check-label" for="col-cpa">CPA</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="col-roas" checked>
                    <label class="form-check-label" for="col-roas">ROAS</label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" onclick="applyColumns()">Apply</button>
            </div>
        </div>
    </div>
</div>

<script>
let performanceChart = null;
let budgetChart = null;
let currentMetric = 'impressions';
let trendsData = <?php echo json_encode($trends ?? ['labels' => [], 'impressions' => [], 'clicks' => [], 'spend' => []], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;

console.log('=== TRENDS DATA DEBUG ===');
console.log('Raw PHP data:', <?php echo json_encode($trends ?? null); ?>);
console.log('trendsData object:', trendsData);
console.log('Labels:', trendsData.labels);
console.log('Labels count:', trendsData.labels ? trendsData.labels.length : 0);
console.log('Impressions:', trendsData.impressions);
console.log('Impressions count:', trendsData.impressions ? trendsData.impressions.length : 0);
console.log('========================');

document.addEventListener('DOMContentLoaded', function() {
    initializeCharts();
    
    // Auto-detect and set date range selector
    autoDetectDateRange();
    
    // Select all checkbox
    document.getElementById('select-all-insights')?.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('.insight-checkbox');
        checkboxes.forEach(cb => cb.checked = this.checked);
    });
});

function autoDetectDateRange() {
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    
    if (!dateStart || !dateEnd) return;
    
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
    
    let detectedRange = 'custom';
    
    if (diffDays === 0) {
        detectedRange = 'today';
    } else if (diffDays === 1) {
        detectedRange = 'yesterday';
    } else if (diffDays === 7) {
        detectedRange = 'last_7_days';
    } else if (diffDays === 14) {
        detectedRange = 'last_14_days';
    } else if (diffDays === 30) {
        detectedRange = 'last_30_days';
    }
    
    const rangeSelector = document.getElementById('date-range');
    if (rangeSelector && detectedRange !== 'custom') {
        rangeSelector.value = detectedRange;
    }
}

function initializeCharts() {
    console.log('Initializing charts...');
    console.log('Trends Data:', trendsData);
    console.log('Labels count:', trendsData.labels ? trendsData.labels.length : 0);
    console.log('Impressions count:', trendsData.impressions ? trendsData.impressions.length : 0);
    
    // Check if we have data
    const hasData = trendsData.labels && trendsData.labels.length > 0 && 
                    trendsData.impressions && trendsData.impressions.length > 0;
    
    if (!hasData) {
        console.warn('⚠️ No trends data available! Showing empty chart.');
        console.log('You may need to:');
        console.log('1. Sync insights data by clicking "Sync Insights" button');
        console.log('2. Select a different date range');
        console.log('3. Check if the selected account has data');
    }
    
    // Performance Trends Chart
    const performanceCtx = document.getElementById('performanceChart');
    console.log('Performance canvas:', performanceCtx);
    
    if (performanceCtx) {
        try {
            const ctx = performanceCtx.getContext('2d');
            
            // Show/hide no data message
            const noDataMsg = document.getElementById('chartNoDataMessage');
            if (!hasData) {
                if (noDataMsg) noDataMsg.style.display = 'block';
                performanceCtx.style.opacity = '0.3';
            } else {
                if (noDataMsg) noDataMsg.style.display = 'none';
                performanceCtx.style.opacity = '1';
            }
            
            performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trendsData.labels || [],
                    datasets: [{
                        label: 'Impressions',
                        data: trendsData.impressions || [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
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
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('Performance chart created:', performanceChart);
        } catch (error) {
            console.error('Error creating performance chart:', error);
        }
    } else {
        console.error('Performance canvas not found!');
    }
    
    // Budget Distribution Chart
    const budgetCtx = document.getElementById('budgetChart');
    console.log('Budget canvas:', budgetCtx);
    
    if (budgetCtx) {
        try {
            const ctx = budgetCtx.getContext('2d');
            budgetChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Active Campaigns', 'Paused Campaigns', 'Reserved'],
                    datasets: [{
                        data: [60, 25, 15],
                        backgroundColor: [
                            'rgb(75, 192, 192)',
                            'rgb(255, 205, 86)',
                            'rgb(201, 203, 207)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 1,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            console.log('Budget chart created:', budgetChart);
        } catch (error) {
            console.error('Error creating budget chart:', error);
        }
    } else {
        console.error('Budget canvas not found!');
    }
}

function updateChart(metric) {
    if (!performanceChart) return;
    
    currentMetric = metric;
    
    const datasets = {
        impressions: { label: 'Impressions', color: 'rgb(75, 192, 192)', data: trendsData.impressions || [] },
        clicks: { label: 'Clicks', color: 'rgb(54, 162, 235)', data: trendsData.clicks || [] },
        spend: { label: 'Spend ($)', color: 'rgb(255, 99, 132)', data: trendsData.spend || [] }
    };
    
    const selected = datasets[metric];
    
    performanceChart.data.labels = trendsData.labels || [];
    performanceChart.data.datasets[0] = {
        label: selected.label,
        data: selected.data,
        borderColor: selected.color,
        backgroundColor: selected.color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.4,
        fill: true
    };
    
    performanceChart.update();
}

function updateDateRange() {
    const range = document.getElementById('date-range').value;
    let startDate, endDate;
    
    const today = new Date();
    endDate = new Date(today);
    
    switch(range) {
        case 'today':
            startDate = new Date(today);
            break;
        case 'yesterday':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 1);
            endDate = new Date(startDate);
            break;
        case 'last_7_days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'last_14_days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 14);
            break;
        case 'last_30_days':
            startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 30);
            break;
        case 'this_month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'last_month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'custom':
            return; // Let user select manually
    }
    
    if (range !== 'custom') {
        document.getElementById('date-start').value = startDate.toISOString().split('T')[0];
        document.getElementById('date-end').value = endDate.toISOString().split('T')[0];
        filterReport();
    }
}

function filterReport() {
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    const entityType = document.getElementById('entity-type').value;
    
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    const url = new URL(window.location);
    url.searchParams.set('date_start', dateStart);
    url.searchParams.set('date_end', dateEnd);
    url.searchParams.set('entity_type', entityType);
    
    // Fix double slashes in pathname
    let finalUrl = url.toString().replace(/([^:])(\/\/+)/g, '$1/');
    window.location.href = finalUrl;
}

function filterTable() {
    const searchTerm = document.getElementById('insights-search')?.value.toLowerCase();
    const rows = document.querySelectorAll('#insights-table tbody tr');
    
    rows.forEach(row => {
        const entityName = row.querySelector('strong')?.textContent.toLowerCase() || '';
        row.style.display = entityName.includes(searchTerm) ? '' : 'none';
    });
}

function sortTable(column) {
    // Table sorting implementation
    console.log('Sort by:', column);
}

function toggleColumns() {
    const modal = new bootstrap.Modal(document.getElementById('columnsModal'));
    modal.show();
}

function applyColumns() {
    // Apply column visibility
    const modal = bootstrap.Modal.getInstance(document.getElementById('columnsModal'));
    modal.hide();
}

function syncInsights() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    const entityType = document.getElementById('entity-type').value;
    
    if (confirm(`Sync ${entityType} insights from ${dateStart} to ${dateEnd}?`)) {
        showLoading();
        
        fetch('src/api/insights.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sync',
                account_id: selectedAccount,
                date_start: dateStart,
                date_end: dateEnd,
                entity_type: entityType
            })
        })
        .then(response => response.json())
        .then(data => {
            hideLoading();
            if (data.success) {
                alert(`Insights synced successfully! Synced ${data.synced || 0} items.`);
                location.reload();
            } else {
                alert('Error: ' + (data.error || data.message || 'Failed to sync insights'));
            }
        })
        .catch(error => {
            hideLoading();
            console.error('Sync error:', error);
            alert('An error occurred while syncing insights');
        });
    }
}

function exportReport() {
    if (!selectedAccount) {
        alert('Please select an ad account first');
        return;
    }
    
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    const entityType = document.getElementById('entity-type').value;
    
    const url = `src/api/insights.php?action=export&account_id=${selectedAccount}&date_start=${dateStart}&date_end=${dateEnd}&entity_type=${entityType}&format=csv`;
    window.open(url);
}

function viewDetails(entityId) {
    console.log('View details for:', entityId);
    // Implement detail view
}

function exportEntity(entityId) {
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    
    window.open(`src/api/insights.php?action=export&entity_id=${entityId}&date_start=${dateStart}&date_end=${dateEnd}&format=csv`);
}

// Override the loadInsightsData function from main layout
function loadInsightsData() {
    console.log('Insights data already loaded from server');
    hideLoading();
}
</script>
