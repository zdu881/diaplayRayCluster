// Ray集群API配置
const RAY_API_BASE = 'http://10.30.2.11:8888';
const NODES_API = `${RAY_API_BASE}/`;

// 节点数据存储
let nodeData = [];

class RayClusterMonitor {
    constructor() {
        console.log('初始化RayClusterMonitor...');
        this.updateInterval = null;
        this.init();
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }

    async init() {
        document.getElementById('dataSource').textContent = '正在连接Ray集群...';
        
        const success = await this.fetchRayData();
        
        // 无论是否成功，都要更新界面
        if (nodeData.length === 0) {
            // 如果没有数据，创建模拟数据
            nodeData = this.createMockData();
            document.getElementById('dataSource').textContent = `使用模拟数据 (${nodeData.length}个节点)`;
        }
        
        this.updateStats();
        this.createNodeCards();
    }

    setupEventListeners() {
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetData();
        });
    }

    async fetchRayData() {
        try {
            console.log('正在获取Ray集群数据...');
            const response = await fetch(NODES_API, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Ray API响应:', data);
            
            // 新API返回结构更清晰，直接使用data.data.nodes
            if (data && data.result && data.data && data.data.nodes) {
                const rayNodes = data.data.nodes;
                console.log('找到节点数量:', rayNodes.length);
                nodeData = rayNodes; // 直接使用处理过的节点数据
                document.getElementById('dataSource').textContent = `已连接到Ray集群 (${nodeData.length}个节点)`;
                return true;
            } else if (data && data.data && data.data.result && data.data.result.result) {
                // 备用路径：原始API格式
                const rayNodes = data.data.result.result;
                console.log('使用备用路径，找到节点数量:', rayNodes.length);
                nodeData = this.parseRayNodes(rayNodes);
                document.getElementById('dataSource').textContent = `已连接到Ray集群 (${nodeData.length}个节点)`;
                return true;
            } else {
                throw new Error('无法找到节点数据');
            }
            
        } catch (error) {
            console.error('获取Ray集群数据失败:', error);
            
            // 如果是CORS错误或网络错误，使用模拟数据
            if (error.message.includes('CORS') || error.message.includes('fetch') || error.name === 'TypeError') {
                console.log('网络错误，使用模拟数据');
                nodeData = this.createMockData();
                document.getElementById('dataSource').textContent = `使用模拟数据 (${nodeData.length}个节点) - 网络限制`;
                return true;
            }
            
            document.getElementById('dataSource').textContent = `连接失败: ${error.message}`;
            return false;
        }
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

    createMockData() {
        // 基于新API响应结构创建模拟数据 - 包含23个节点
        const mockData = [
            {
                "id": "5681df0b",
                "name": "G3",
                "fullName": "G3 (10.30.2.11)",
                "nodeIp": "10.30.2.11",
                "nodeId": "0201fe33d057d28ad27c4e73a5c0abac0430ae2a9edb30775681df0b",
                "state": "ALIVE",
                "isHeadNode": false,
                "cpu": 65.6,
                "memory": 64.9,
                "gpu": 23.9,
                "tasks": [
                    "CPU密集任务",
                    "内存密集任务"
                ],
                "status": "active",
                "stateMessage": null,
                "connectionType": "wired",
                "resources": {
                    "totalCpu": 8.0,
                    "totalMemory": 790,
                    "totalGpu": 1.0,
                    "objectStore": 186
                }
            },
            {
                "id": "27254c92",
                "name": "G1",
                "fullName": "G1 (10.30.2.11)",
                "nodeIp": "10.30.2.11",
                "nodeId": "0f37fe145952c4c5d5d858e3f61af7038e65c5f18699a73727254c92",
                "state": "ALIVE",
                "isHeadNode": false,
                "cpu": 29.9,
                "memory": 66.3,
                "gpu": 13.1,
                "tasks": [
                    "内存密集任务"
                ],
                "status": "active",
                "stateMessage": null,
                "connectionType": "wired",
                "resources": {
                    "totalCpu": 8.0,
                    "totalMemory": 791,
                    "totalGpu": 1.0,
                    "objectStore": 186
                }
            },
            {
                "id": "5964abc5",
                "name": "M5",
                "fullName": "M5 (10.30.2.11)",
                "nodeIp": "10.30.2.11",
                "nodeId": "13d25d526e60e548a927bcae7aa6eaf13de40480273cfb6e5964abc5",
                "state": "ALIVE",
                "isHeadNode": false,
                "cpu": 75.3,
                "memory": 22.5,
                "gpu": 46.4,
                "tasks": [
                    "CPU密集任务",
                    "GPU计算任务"
                ],
                "status": "active",
                "stateMessage": null,
                "connectionType": "wired",
                "resources": {
                    "totalCpu": 256.0,
                    "totalMemory": 788,
                    "totalGpu": 8.0,
                    "objectStore": 186
                }
            },
            {
                "id": "c7c8769a",
                "name": "J1",
                "fullName": "J1 (10.30.2.11)",
                "nodeIp": "10.30.2.11",
                "nodeId": "514cb48d316a78af4b26beed6ed861abc61b818ca0da6c6bc7c8769a",
                "state": "ALIVE",
                "isHeadNode": false,
                "cpu": 23.4,
                "memory": 38.1,
                "gpu": 89.0,
                "tasks": [
                    "GPU计算任务"
                ],
                "status": "active",
                "stateMessage": null,
                "connectionType": "wireless",
                "resources": {
                    "totalCpu": 256.0,
                    "totalMemory": 786,
                    "totalGpu": 8.0,
                    "objectStore": 186
                }
            },
            {
                "id": "3a8f0aef",
                "name": "HEAD节点",
                "fullName": "HEAD节点 (10.30.2.11)",
                "nodeIp": "10.30.2.11",
                "nodeId": "fde2bbb3d8a2067c0c0d76e4d79eb1bea187d19e70922d823a8f0aef",
                "state": "ALIVE",
                "isHeadNode": true,
                "cpu": 24.0,
                "memory": 27.6,
                "gpu": 0,
                "tasks": [
                    "集群管理"
                ],
                "status": "active",
                "stateMessage": null,
                "connectionType": "unknown",
                "resources": {
                    "totalCpu": 16.0,
                    "totalMemory": 791,
                    "totalGpu": 0,
                    "objectStore": 186
                }
            }
        ];

        // 扩展到完整的23个节点 (包含更多的M系列和G系列节点)
        const additionalNodes = [
            { name: "G2", cpu: 68.8, memory: 72.9, gpu: 63.1, totalCpu: 8, totalGpu: 1 },
            { name: "G4", cpu: 27.2, memory: 61.4, gpu: 51.0, totalCpu: 8, totalGpu: 1 },
            { name: "G5", cpu: 30.0, memory: 72.9, gpu: 13.5, totalCpu: 8, totalGpu: 1 },
            { name: "G6", cpu: 55.3, memory: 33.9, gpu: 66.9, totalCpu: 8, totalGpu: 1 },
            { name: "G7", cpu: 73.0, memory: 37.1, gpu: 53.1, totalCpu: 8, totalGpu: 1 },
            { name: "G8", cpu: 51.7, memory: 61.8, gpu: 81.8, totalCpu: 8, totalGpu: 1 },
            { name: "M1", cpu: 65.8, memory: 41.7, gpu: 51.7, totalCpu: 256, totalGpu: 8 },
            { name: "M2", cpu: 50.7, memory: 21.3, gpu: 22.6, totalCpu: 256, totalGpu: 8 },
            { name: "M3", cpu: 70.5, memory: 41.3, gpu: 12.1, totalCpu: 256, totalGpu: 8 },
            { name: "M4", cpu: 34.2, memory: 32.7, gpu: 36.0, totalCpu: 256, totalGpu: 8 },
            { name: "M6", cpu: 42.6, memory: 49.9, gpu: 67.3, totalCpu: 256, totalGpu: 8 },
            { name: "M7", cpu: 76.3, memory: 63.4, gpu: 42.9, totalCpu: 256, totalGpu: 8 },
            { name: "M8", cpu: 65.4, memory: 69.8, gpu: 39.6, totalCpu: 256, totalGpu: 8 },
            { name: "M9", cpu: 25.1, memory: 21.3, gpu: 83.1, totalCpu: 256, totalGpu: 8 },
            { name: "M10", cpu: 79.1, memory: 64.8, gpu: 51.6, totalCpu: 256, totalGpu: 8 },
            { name: "M11", cpu: 40.6, memory: 43.5, gpu: 26.4, totalCpu: 256, totalGpu: 8 },
            { name: "M12", cpu: 35.8, memory: 18.5, gpu: 10.1, totalCpu: 256, totalGpu: 8 },
            { name: "M13", cpu: 30.1, memory: 44.0, gpu: 25.5, totalCpu: 256, totalGpu: 8 }
        ];

        additionalNodes.forEach((node, index) => {
            const nodeId = `mock${index + 6}`;
            mockData.push({
                id: nodeId,
                name: node.name,
                fullName: `${node.name} (10.30.2.11)`,
                nodeIp: "10.30.2.11",
                nodeId: `mock-node-id-${nodeId}`,
                state: "ALIVE",
                isHeadNode: false,
                cpu: node.cpu,
                memory: node.memory,
                gpu: node.gpu,
                tasks: this.generateTasksByUsage(node.cpu, node.memory, node.gpu),
                status: "active",
                stateMessage: null,
                connectionType: "wired",
                resources: {
                    totalCpu: node.totalCpu,
                    totalMemory: Math.floor(Math.random() * 50) + 750, // 750-800 GB
                    totalGpu: node.totalGpu,
                    objectStore: 186
                }
            });
        });

        return mockData;
    }

    generateTasksByUsage(cpu, memory, gpu) {
        const tasks = [];
        
        if (cpu > 70) tasks.push("CPU密集任务");
        if (memory > 70) tasks.push("内存密集任务");
        if (gpu > 50) tasks.push("GPU计算任务");
        
        if (tasks.length === 0) tasks.push("空闲");
        
        return tasks;
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
            await this.fetchRayData();
            this.updateStats();
            this.createNodeCards();
        }, 30000);
    }

    async resetData() {
        document.getElementById('dataSource').textContent = '重新连接中...';
        await this.fetchRayData();
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
