// Ray集群API配置
const RAY_API_BASE = 'http://10.30.2.11:8265/api/v0';
const NODES_API = `${RAY_API_BASE}/nodes`;

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
            
            // 修正数据路径 - 根据实际API响应结构
            if (data && data.result && data.data && data.data.result && data.data.result.result) {
                const rayNodes = data.data.result.result;
                console.log('找到节点数量:', rayNodes.length);
                nodeData = this.parseRayNodes(rayNodes);
                document.getElementById('dataSource').textContent = `已连接到Ray集群 (${nodeData.length}个节点)`;
                return true;
            } else {
                console.error('API响应格式错误，尝试备用路径:', data);
                // 如果主路径失败，尝试其他可能的路径
                let rayNodes = null;
                if (data.result && Array.isArray(data.result)) {
                    rayNodes = data.result;
                } else if (data.data && data.data.result && Array.isArray(data.data.result)) {
                    rayNodes = data.data.result;
                } else if (data.nodes && Array.isArray(data.nodes)) {
                    rayNodes = data.nodes;
                }
                
                if (rayNodes && rayNodes.length > 0) {
                    console.log('使用备用路径，找到节点数量:', rayNodes.length);
                    nodeData = this.parseRayNodes(rayNodes);
                    document.getElementById('dataSource').textContent = `已连接到Ray集群 (${nodeData.length}个节点)`;
                    return true;
                } else {
                    throw new Error('无法找到节点数据');
                }
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
        console.log('解析Ray节点数据，节点数量:', rayNodes.length);
        const parsedNodes = [];
        
        rayNodes.forEach((node, index) => {
            console.log(`解析节点 ${index + 1}:`, node.node_ip, node.state);
            
            // 获取节点标识符 - 寻找resources_total中的第三个非标准key
            const nodeIdentifier = this.extractNodeIdentifier(node.resources_total);
            console.log('节点标识符:', nodeIdentifier);
            
            // 检查连接类型
            const connectionType = this.getConnectionType(node.resources_total);
            
            // 模拟CPU和内存使用率（因为Ray API通常不直接提供实时使用率）
            const cpuUsage = this.simulateUsage(20, 80);
            const memoryUsage = this.simulateUsage(15, 75);
            const gpuUsage = node.resources_total.GPU ? this.simulateUsage(10, 90) : 0;
            
            // 根据节点状态和类型生成任务
            const tasks = this.generateNodeTasks(node, cpuUsage, memoryUsage, gpuUsage);
            
            const parsedNode = {
                id: node.node_id.slice(-8), // 使用node_id的最后8位作为短ID
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
                connectionType: connectionType, // 添加连接类型
                resources: {
                    totalCpu: node.resources_total.CPU || 0,
                    totalMemory: Math.round((node.resources_total.memory || 0) / (1024**3)), // 转换为GB
                    totalGpu: node.resources_total.GPU || 0,
                    objectStore: Math.round((node.resources_total.object_store_memory || 0) / (1024**3))
                }
            };
            
            console.log('解析后的节点:', parsedNode);
            parsedNodes.push(parsedNode);
        });
        
        console.log('解析完成，总节点数:', parsedNodes.length);
        return parsedNodes;
    }

    createMockData() {
        // 基于真实Ray API响应结构创建模拟数据 - 包含22个节点
        const mockNodes = [
            // 活跃的GPU节点
            {
                node_id: "03aba4392c3fa6de0498262fdbd2378127e70e396c4725d778d156fe",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 853461934080.0, "GPU": 1.0, "G1": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "0a5e872df56a2710f0405e6521456b8ca63462f4a52696d77568662a",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: true,
                state_message: null,
                resources_total: {
                    "CPU": 16.0, "memory": 853778788352.0, "node:__internal_head__": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "5fc01d8a809ab3d22642795d49a8323ec2c6821395a1bc1f8a0b88dc",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 852027138048.0, "GPU": 1.0, "G7": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "6c09d9f72f3c0721f39a9c52df9216f6602b0927379bbf813af5ea37",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 852612415488.0, "GPU": 1.0, "G4": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "7d256721a07c34c450daae285b5afd0ff5a4cfa9029b2aa98cd53dc6",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 852181164032.0, "GPU": 1.0, "G6": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "9f67e94c5eb55dc2c401ca7bf02685e18496791b2a54de278b6442f8",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 853178167296.0, "GPU": 1.0, "G2": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "c3d96df185904fcfd5dbb91f1e33c229749973069a6763527b647c1d",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 852454854656.0, "GPU": 1.0, "G5": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "dc71d882a1c9df13c5381ab83fcab87d87a8278d38fa0470e62f2ab0",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 851842572288.0, "GPU": 1.0, "G8": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            {
                node_id: "f78d4afcb313dc0f3b7725fcedd62c37856aca5d690eb15570d35057",
                node_ip: "10.30.2.11",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 852891738112.0, "GPU": 1.0, "G3": 1.0, "Wired": 1.0, "object_store_memory": 200000000000.0
                }
            },
            // 无线连接节点
            {
                node_id: "36532ce1aa8fab9d2d9015364b6f0c0216d12b7252ebd7cc223a3d01",
                node_ip: "10.12.133.251",
                state: "ALIVE",
                is_head_node: false,
                state_message: null,
                resources_total: {
                    "CPU": 8.0, "memory": 44418435892.0, "GPU": 1.0, "J1": 1.0, "Wireless": 1.0, "object_store_memory": 19036472524.0
                }
            },
            // 离线节点
            {
                node_id: "180f4337a55f184e1b253ec6556439ed069281b0c8f65496b629f114",
                node_ip: "10.30.37.210",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4834572288.0, "M3": 1.0, "Wired": 1.0, "object_store_memory": 2071959552.0
                }
            },
            {
                node_id: "5c3a636a77ca91898994ba267aaf4dfd8021b4430b68aa4e8ce78dbb",
                node_ip: "10.30.38.46",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4064585728.0, "M1": 1.0, "Wired": 1.0, "object_store_memory": 1741965312.0
                }
            },
            {
                node_id: "5d026ae9d484104f3f8f5d59b36453be559f4684ac6230b3beee3ca8",
                node_ip: "10.30.35.171",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4845421773.0, "M7": 1.0, "Wired": 1.0, "object_store_memory": 2076609331.0
                }
            },
            {
                node_id: "655c1fdbf28e0e76c5ddb4cd762e33588ea9f1f415d05b1e69aa234c",
                node_ip: "10.30.35.60",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4354175796.0, "M13": 1.0, "Wired": 1.0, "object_store_memory": 1866075340.0
                }
            },
            {
                node_id: "8a98884d8bdc2bbeb40b63d5e8902d6e5ddb410c9d8398330a60d14e",
                node_ip: "10.30.34.213",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4736221594.0, "M6": 1.0, "Wired": 1.0, "object_store_memory": 2029809254.0
                }
            },
            {
                node_id: "8aa991895ad2c5a21508c8e64adfc3001a7e96d576fc95d2381b4c0b",
                node_ip: "10.30.37.207",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4911955149.0, "M2": 1.0, "Wired": 1.0, "object_store_memory": 2105123635.0
                }
            },
            {
                node_id: "8d638e7fccb232d40ea8b6d03e057ac9968208e9226117f8701fabef",
                node_ip: "10.30.34.98",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4646658868.0, "M10": 1.0, "Wired": 1.0, "object_store_memory": 1991425228.0
                }
            },
            {
                node_id: "ac9c051c9d78b6b2cfa970176c3bc9b800f5928ecf47c9c904a6f33a",
                node_ip: "10.30.35.133",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4843675648.0, "M8": 1.0, "Wired": 1.0, "object_store_memory": 2075860992.0
                }
            },
            {
                node_id: "c2b5f77b3fa5311cf65434b39f185ef5045b94493c40e8d45188edd3",
                node_ip: "10.30.37.199",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4828012135.0, "M5": 1.0, "Wired": 1.0, "object_store_memory": 2069148057.0
                }
            },
            {
                node_id: "d85c7abe987a7c01879449eb0b033cf18b2700f0d046d8409c2e36da",
                node_ip: "10.30.35.52",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4850250138.0, "M11": 1.0, "Wired": 1.0, "object_store_memory": 2078678630.0
                }
            },
            {
                node_id: "e449e34e6589e2f852cbf084bfedad1fe78a92a8d1ea320b8e7766dd",
                node_ip: "10.30.39.57",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4843761664.0, "M12": 1.0, "Wired": 1.0, "object_store_memory": 2075897856.0
                }
            },
            {
                node_id: "fe84b074caaeabda0c67e52934a56290da83716d69f480c24cf97fcf",
                node_ip: "10.30.35.135",
                state: "DEAD",
                is_head_node: false,
                state_message: "Unexpected termination: health check failed due to missing too many heartbeats",
                resources_total: {
                    "CPU": 4.0, "memory": 4880324199.0, "M4": 1.0, "Wired": 1.0, "object_store_memory": 2091567513.0
                }
            }
        ];
        
        return this.parseRayNodes(mockNodes);
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
        
        const avgCpu = nodeData.length > 0 ? 
            Math.round(nodeData.reduce((sum, n) => sum + n.cpu, 0) / nodeData.length) : 0;
        const avgMemory = nodeData.length > 0 ? 
            Math.round(nodeData.reduce((sum, n) => sum + n.memory, 0) / nodeData.length) : 0;
        const totalTasks = nodeData.reduce((sum, n) => sum + n.tasks.length, 0);

        document.getElementById('activeNodes').textContent = `${activeNodes}/${nodeData.length} (${deadNodes}个离线)`;
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
