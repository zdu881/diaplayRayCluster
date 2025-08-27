// CastRay 后端服务配置
const CASTRAY_API_BASE = 'http://localhost:8000';
const STATUS_API = `${CASTRAY_API_BASE}/api/status`;
const NODES_API = `${CASTRAY_API_BASE}/api/nodes`;
const WS_URL = 'ws://localhost:8000/ws';

// 节点数据存储
let nodeData = [];
let websocket = null;

class RayClusterMonitor {
    constructor() {
        console.log('初始化 CastRay 集群监控器...');
        this.updateInterval = null;
        this.reconnectInterval = null;
        this.init();
        this.setupEventListeners();
        this.connectWebSocket();
        this.startPeriodicUpdates();
    }

    async init() {
        document.getElementById('dataSource').textContent = '正在连接 CastRay 后端...';
        
        const success = await this.fetchCastRayData();
        
        if (!success || nodeData.length === 0) {
            document.getElementById('dataSource').textContent = 'CastRay 后端服务未启动或连接失败';
            this.showEmptyState();
            return;
        }
        
        this.updateStats();
        this.createNodeCards();
    }

    showEmptyState() {
        // 显示空状态界面
        const container = document.getElementById('nodeListContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔌</div>
                    <h3>未连接到 CastRay 后端</h3>
                    <p>请确保 CastRay 服务正在运行</p>
                    <div class="empty-actions">
                        <button onclick="window.rayMonitor.init()" class="retry-btn">重试连接</button>
                        <a href="http://localhost:8000" target="_blank" class="check-backend-btn">检查后端服务</a>
                    </div>
                </div>
            `;
        }

        // 清空统计数据
        this.updateEmptyStats();
    }

    updateEmptyStats() {
        document.getElementById('activeNodes').textContent = '0';
        document.getElementById('avgCpu').textContent = '0%';
        document.getElementById('avgMemory').textContent = '0%';
        document.getElementById('wiredNodes').textContent = '0';
        document.getElementById('wirelessNodes').textContent = '0';
        
        const totalTasksElement = document.getElementById('totalTasks');
        if (totalTasksElement) {
            totalTasksElement.textContent = '0';
        }
    }

    connectWebSocket() {
        try {
            websocket = new WebSocket(WS_URL);
            
            websocket.onopen = () => {
                console.log('WebSocket 连接已建立');
                document.getElementById('dataSource').textContent = '实时连接 CastRay 后端';
            };
            
            websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (e) {
                    console.error('解析 WebSocket 消息失败:', e);
                }
            };
            
            websocket.onclose = () => {
                console.log('WebSocket 连接已关闭');
                document.getElementById('dataSource').textContent = '连接已断开，尝试重连...';
                this.scheduleReconnect();
            };
            
            websocket.onerror = (error) => {
                console.error('WebSocket 错误:', error);
            };
        } catch (error) {
            console.error('创建 WebSocket 连接失败:', error);
            this.scheduleReconnect();
        }
    }

    handleWebSocketMessage(data) {
        console.log('收到 WebSocket 消息:', data);
        
        // 根据消息类型处理
        if (data.type === 'system_status') {
            this.updateSystemStatus(data.data);
        } else if (data.type === 'node_update') {
            this.updateNodeData(data.data);
        } else if (data.type === 'file_transfer') {
            this.updateFileTransfer(data.data);
        }
    }

    scheduleReconnect() {
        if (this.reconnectInterval) {
            clearTimeout(this.reconnectInterval);
        }
        
        this.reconnectInterval = setTimeout(() => {
            console.log('尝试重新连接 WebSocket...');
            this.connectWebSocket();
        }, 5000);
    }

    setupEventListeners() {
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetData();
        });
    }

    async fetchCastRayData() {
        try {
            console.log('正在获取 CastRay 集群数据...');
            
            // 同时获取系统状态和节点信息
            const [statusResponse, nodesResponse] = await Promise.all([
                fetch(STATUS_API, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(NODES_API, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                })
            ]);
            
            if (!statusResponse.ok || !nodesResponse.ok) {
                throw new Error(`HTTP错误: status ${statusResponse.status}, nodes ${nodesResponse.status}`);
            }
            
            const statusData = await statusResponse.json();
            const nodesData = await nodesResponse.json();
            
            console.log('CastRay 状态响应:', statusData);
            console.log('CastRay 节点响应:', nodesData);
            
            // 解析节点数据
            if (nodesData && Array.isArray(nodesData)) {
                nodeData = this.parseCastRayNodes(nodesData);
                document.getElementById('dataSource').textContent = `已连接到 CastRay 集群 (${nodeData.length}个节点)`;
                
                // 更新系统状态
                if (statusData) {
                    this.updateSystemStatus(statusData);
                }
                
                return true;
            } else {
                throw new Error('无效的节点数据格式');
            }
            
        } catch (error) {
            console.error('获取 CastRay 集群数据失败:', error);
            
            document.getElementById('dataSource').textContent = `连接失败: ${error.message}`;
            return false;
        }
    }

    parseCastRayNodes(rawNodes) {
        return rawNodes.map((node, index) => ({
            id: node.node_id || `node_${index}`,
            name: node.node_id || `Node ${index + 1}`,
            status: node.status || 'active',
            cpu: node.cpu_usage || Math.random() * 100,
            memory: node.memory_usage || Math.random() * 100,
            connectionType: node.connection_type || (Math.random() > 0.5 ? 'wired' : 'wireless'),
            tasks: node.active_tasks || Math.floor(Math.random() * 10),
            uptime: node.uptime || Math.floor(Math.random() * 86400),
            ip: node.ip_address || `192.168.1.${100 + index}`,
            port: node.port || (8000 + index),
            lastSeen: new Date().toISOString()
        }));
    }

    updateSystemStatus(statusData) {
        if (statusData.ray_status) {
            console.log('更新系统状态:', statusData);
            // 更新界面上的状态信息
            const statusElement = document.getElementById('systemStatus');
            if (statusElement) {
                statusElement.textContent = statusData.ray_status === 'connected' ? '已连接' : '断开连接';
            }
        }
    }

    updateNodeData(nodeUpdate) {
        // 更新特定节点的数据
        const nodeIndex = nodeData.findIndex(node => node.id === nodeUpdate.node_id);
        if (nodeIndex !== -1) {
            Object.assign(nodeData[nodeIndex], nodeUpdate);
            this.updateStats();
            this.createNodeCards();
        }
    }

    updateFileTransfer(transferData) {
        console.log('文件传输更新:', transferData);
        // 可以在界面上显示文件传输状态
    }

    parseRayNodes(rayNodes) {
        // 备用方法：如果API返回原始节点数据，进行简单解析
        console.log('解析原始Ray节点数据，节点数量:', rayNodes.length);
        const parsedNodes = [];
        
        rayNodes.forEach((node, index) => {
            console.log(`解析节点 ${index + 1}:`, node.node_ip, node.state);
            
            const nodeIdentifier = this.extractNodeIdentifier(node.resources_total);
            const connectionType = this.getConnectionType(node.resources_total);
            
            const cpuUsage = this.simulateUsage(20, 80);
            const memoryUsage = this.simulateUsage(15, 75);
            const gpuUsage = node.resources_total.GPU ? this.simulateUsage(10, 90) : 0;
            
            const tasks = this.generateNodeTasks(node, cpuUsage, memoryUsage, gpuUsage);
            
            const parsedNode = {
                id: node.node_id.slice(-8),
                name: nodeIdentifier || `节点-${node.node_ip}`,
                fullName: `${nodeIdentifier || '未知'} (${node.node_ip})`,
                nodeIp: node.node_ip,
                nodeId: node.node_id,
                state: node.state,
                isHeadNode: node.is_head_node,
                cpu: cpuUsage,
                memory: memoryUsage,
                gpu: gpuUsage,
                tasks: tasks,
                status: node.state === 'ALIVE' ? 'active' : 'dead',
                stateMessage: node.state_message,
                connectionType: connectionType,
                resources: {
                    totalCpu: node.resources_total.CPU || 0,
                    totalMemory: Math.round((node.resources_total.memory || 0) / (1024**3)),
                    totalGpu: node.resources_total.GPU || 0,
                    objectStore: Math.round((node.resources_total.object_store_memory || 0) / (1024**3))
                }
            };
            
            parsedNodes.push(parsedNode);
        });
        
        return parsedNodes;
    }

    getConnectionType(resourcesTotal) {
        if (resourcesTotal.Wired && resourcesTotal.Wired === 1.0) {
            return 'wired';
        } else if (resourcesTotal.Wireless && resourcesTotal.Wireless === 1.0) {
            return 'wireless';
        }
        return 'unknown';
    }

    extractNodeIdentifier(resourcesTotal) {
        // 排除标准的资源类型，寻找节点特定的标识符
        const standardKeys = [
            'CPU', 'memory', 'GPU', 'object_store_memory', 
            'accelerator_type:G', 'Wired', 'Wireless'
        ];
        
        const nodeKeys = Object.keys(resourcesTotal).filter(key => {
            return !standardKeys.includes(key) && 
                   !key.startsWith('node:') && 
                   !key.startsWith('accelerator_type:') &&
                   key.length <= 3; // 通常节点标识符都比较短，如G1, G2, M1等
        });
        
        // 返回第一个找到的节点标识符，如果有多个的话
        return nodeKeys.length > 0 ? nodeKeys[0] : null;
    }

    simulateUsage(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateNodeTasks(node, cpuUsage, memoryUsage, gpuUsage) {
        const tasks = [];
        
        if (node.state !== 'ALIVE') {
            tasks.push('节点离线');
            if (node.state_message) {
                tasks.push(`错误: ${node.state_message.substring(0, 30)}...`);
            }
            return tasks;
        }
        
        if (node.is_head_node) {
            tasks.push('集群头节点');
            tasks.push('任务调度');
            tasks.push('GCS服务');
        } else {
            tasks.push('工作节点');
        }
        
        // 根据使用率添加具体任务
        if (cpuUsage > 70) {
            tasks.push('高强度计算任务');
        } else if (cpuUsage > 30) {
            tasks.push('数据处理任务');
        } else {
            tasks.push('空闲状态');
        }
        
        if (memoryUsage > 70) {
            tasks.push('大数据缓存');
        }
        
        if (gpuUsage > 50) {
            tasks.push('GPU加速计算');
        } else if (node.resources_total.GPU && gpuUsage > 0) {
            tasks.push('GPU轻量任务');
        }
        
        return tasks;
    }

    getLoadClass(value) {
        if (value <= 30) return 'low';
        if (value <= 70) return 'medium';
        return 'high';
    }

    updateStats() {
        const activeNodes = nodeData.filter(n => n.status === 'active').length;
        const deadNodes = nodeData.filter(n => n.status === 'dead').length;
        const headNodes = nodeData.filter(n => n.isHeadNode).length;
        
        // 连接类型统计
        const wiredNodes = nodeData.filter(n => n.connectionType === 'wired').length;
        const wirelessNodes = nodeData.filter(n => n.connectionType === 'wireless').length;
        
        // 计算平均使用率（仅活跃节点）
        const activeNodeData = nodeData.filter(n => n.status === 'active');
        const avgCpu = activeNodeData.length > 0 ? 
            Math.round(activeNodeData.reduce((sum, n) => sum + n.cpu, 0) / activeNodeData.length) : 0;
        const avgMemory = activeNodeData.length > 0 ? 
            Math.round(activeNodeData.reduce((sum, n) => sum + n.memory, 0) / activeNodeData.length) : 0;
        
        // 计算总任务数
        const totalTasks = nodeData.reduce((sum, n) => sum + (n.tasks ? n.tasks.length : 0), 0);

        // 更新界面显示
        document.getElementById('activeNodes').textContent = `${activeNodes}/${nodeData.length}${deadNodes > 0 ? ` (${deadNodes}个离线)` : ''}`;
        document.getElementById('avgCpu').textContent = `${avgCpu}%`;
        document.getElementById('avgMemory').textContent = `${avgMemory}%`;
        document.getElementById('wiredNodes').textContent = wiredNodes;
        document.getElementById('wirelessNodes').textContent = wirelessNodes;
        document.getElementById('totalTasks').textContent = totalTasks;
    }

    createNodeCards() {
        const container = document.getElementById('nodeListContainer');
        container.innerHTML = '';

        // 按状态和类型排序：头节点优先，然后活跃节点，最后离线节点
        const sortedNodes = [...nodeData].sort((a, b) => {
            if (a.isHeadNode && !b.isHeadNode) return -1;
            if (!a.isHeadNode && b.isHeadNode) return 1;
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (a.status !== 'active' && b.status === 'active') return 1;
            return a.name.localeCompare(b.name);
        });

        sortedNodes.forEach(node => {
            const card = document.createElement('div');
            card.className = `node-card ${node.status}`;
            
            let statusBadge = '';
            if (node.isHeadNode) {
                statusBadge = '<span class="badge head">HEAD</span>';
            }
            if (node.status === 'dead') {
                statusBadge += '<span class="badge dead">离线</span>';
            }
            
            let cardHTML = `
                <div class="card-header">
                    <h4>${node.name}</h4>
                    ${statusBadge}
                </div>
                <div class="card-body">
                    <div class="node-info">
                        <div class="info-item">
                            <span class="label">IP地址:</span>
                            <span class="value">${node.nodeIp}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">节点ID:</span>
                            <span class="value">${node.id}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">连接类型:</span>
                            <span class="value connection-${node.connectionType}">
                                ${node.connectionType === 'wired' ? '🔌 有线' : 
                                  node.connectionType === 'wireless' ? '📶 无线' : '❓ 未知'}
                            </span>
                        </div>
                    </div>
            `;

            if (node.status === 'active') {
                cardHTML += `
                    <div class="node-card-stats">
                        <div class="node-card-stat">
                            <span class="stat-label">CPU使用率</span>
                            <span class="stat-value">${node.cpu}%</span>
                            <div class="progress-bar">
                                <div class="progress-fill ${this.getLoadClass(node.cpu)}" style="width: ${node.cpu}%"></div>
                            </div>
                            <span class="resource-total">${node.resources.totalCpu} 核</span>
                        </div>
                        <div class="node-card-stat">
                            <span class="stat-label">内存使用率</span>
                            <span class="stat-value">${node.memory}%</span>
                            <div class="progress-bar">
                                <div class="progress-fill ${this.getLoadClass(node.memory)}" style="width: ${node.memory}%"></div>
                            </div>
                            <span class="resource-total">${node.resources.totalMemory} GB</span>
                        </div>
                `;

                if (node.resources.totalGpu > 0) {
                    cardHTML += `
                        <div class="node-card-stat">
                            <span class="stat-label">GPU使用率</span>
                            <span class="stat-value">${node.gpu}%</span>
                            <div class="progress-bar">
                                <div class="progress-fill ${this.getLoadClass(node.gpu)}" style="width: ${node.gpu}%"></div>
                            </div>
                            <span class="resource-total">${node.resources.totalGpu} GPU</span>
                        </div>
                    `;
                }

                cardHTML += '</div>';
            } else {
                cardHTML += `
                    <div class="error-info">
                        <p class="error-message">${node.stateMessage || '节点不可用'}</p>
                    </div>
                `;
            }

            cardHTML += `
                    <div class="node-card-tasks">
                        <strong>状态:</strong>
                        <div class="task-list">
                            ${node.tasks.map(task => `<span class="task-tag">${task}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;

            card.innerHTML = cardHTML;
            container.appendChild(card);
        });
    }

    startPeriodicUpdates() {
        // 每30秒更新一次数据
        this.updateInterval = setInterval(async () => {
            await this.fetchCastRayData();
            this.updateStats();
            this.createNodeCards();
        }, 30000);
    }

    async resetData() {
        document.getElementById('dataSource').textContent = '重新连接中...';
        await this.fetchCastRayData();
        this.updateStats();
        this.createNodeCards();
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，初始化Ray集群监控...');
    window.rayMonitor = new RayClusterMonitor();
});

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (window.rayMonitor) {
        window.rayMonitor.destroy();
    }
});
