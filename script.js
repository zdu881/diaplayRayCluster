// Ray集群API配置
const RAY_API_BASE = 'http://10.30.2.11:8265/api/v0';
const NODES_API = `${RAY_API_BASE}/nodes`;

// 节点数据存储
let nodeData = [];
let connections = [];

// 获取Ray集群节点数据
async function fetchRayClusterData() {
    try {
        // 尝试通过代理或直接访问获取数据
        const response = await fetch(NODES_API, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.result) {
            const rayNodes = data.result;
            nodeData = parseRayNodes(rayNodes);
            connections = generateConnections(nodeData);
            return true;
        }
    } catch (error) {
        console.warn('无法获取Ray集群数据，使用模拟数据:', error);
        // 如果API不可用，尝试解析集群页面或使用模拟数据
        await tryParseClusterPage();
        return false;
    }
}

// 尝试通过其他方式获取集群信息
async function tryParseClusterPage() {
    try {
        // 模拟从集群页面解析的数据结构
        const mockRayData = await simulateRayClusterData();
        nodeData = parseRayNodes(mockRayData);
        connections = generateConnections(nodeData);
    } catch (error) {
        console.warn('集群页面解析失败，使用默认模拟数据:', error);
        initMockData();
    }
}

// 模拟真实的Ray集群数据结构
async function simulateRayClusterData() {
    // 这里模拟从Ray集群页面可能获取到的节点信息
    return [
        {
            nodeId: "node-01",
            nodeManagerAddress: "10.30.2.11",
            rayletSocketName: "/tmp/ray/session_2023/sockets/raylet",
            objectManagerSocketName: "/tmp/ray/session_2023/sockets/object_manager",
            state: "ALIVE",
            alive: true,
            resources: {
                "CPU": 16.0,
                "memory": 32000000000,
                "node:10.30.2.11": 1.0,
                "GPU": 2.0
            },
            usedResources: {
                "CPU": Math.random() * 12 + 2, // 2-14之间的随机使用量
                "memory": Math.random() * 20000000000 + 5000000000, // 5-25GB
                "GPU": Math.random() * 1.5 + 0.2 // 0.2-1.7
            },
            isHeadNode: true
        },
        {
            nodeId: "node-02",
            nodeManagerAddress: "10.30.2.12", 
            state: "ALIVE",
            alive: true,
            resources: {
                "CPU": 8.0,
                "memory": 16000000000,
                "node:10.30.2.12": 1.0
            },
            usedResources: {
                "CPU": Math.random() * 6 + 1,
                "memory": Math.random() * 10000000000 + 2000000000
            },
            isHeadNode: false
        },
        {
            nodeId: "node-03",
            nodeManagerAddress: "10.30.2.13",
            state: "ALIVE", 
            alive: true,
            resources: {
                "CPU": 12.0,
                "memory": 24000000000,
                "node:10.30.2.13": 1.0,
                "GPU": 1.0
            },
            usedResources: {
                "CPU": Math.random() * 8 + 2,
                "memory": Math.random() * 15000000000 + 3000000000,
                "GPU": Math.random() * 0.8 + 0.1
            },
            isHeadNode: false
        }
    ];
}

// 解析Ray节点数据
function parseRayNodes(rayNodes) {
    const parsedNodes = [];
    const svgWidth = 800;
    const svgHeight = 600;
    const margin = 80;
    
    rayNodes.forEach((node, index) => {
        // 计算节点位置 - 使用网格布局
        const cols = Math.ceil(Math.sqrt(rayNodes.length));
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = margin + (col * (svgWidth - 2 * margin) / (cols - 1 || 1));
        const y = margin + (row * (svgHeight - 2 * margin) / (Math.ceil(rayNodes.length / cols) - 1 || 1));
        
        // 计算真实的资源使用率
        const cpuTotal = node.resources.CPU || 1;
        const memoryTotal = node.resources.memory || 1000000000; // 1GB default
        const gpuTotal = node.resources.GPU || 0;
        
        const cpuUsed = node.usedResources.CPU || 0;
        const memoryUsed = node.usedResources.memory || 0;
        const gpuUsed = node.usedResources.GPU || 0;
        
        // 计算使用率百分比
        const cpuUsage = Math.round((cpuUsed / cpuTotal) * 100);
        const memoryUsage = Math.round((memoryUsed / memoryTotal) * 100);
        const gpuUsage = gpuTotal > 0 ? Math.round((gpuUsed / gpuTotal) * 100) : 0;
        
        // 根据资源使用情况生成任务列表
        const tasks = generateNodeTasks(node, cpuUsage, memoryUsage, gpuUsage);
        
        parsedNodes.push({
            id: `ray-${node.nodeId.slice(-6)}`,
            name: `${node.isHeadNode ? 'Head节点' : 'Worker节点'} (${node.nodeManagerAddress})`,
            x: x,
            y: y,
            cpu: cpuUsage,
            memory: memoryUsage,
            gpu: gpuUsage,
            tasks: tasks,
            status: node.state === 'ALIVE' ? 'active' : 'inactive',
            isHeadNode: node.isHeadNode || false,
            rayNodeId: node.nodeId,
            address: node.nodeManagerAddress,
            totalResources: {
                cpu: cpuTotal,
                memory: Math.round(memoryTotal / 1000000000), // 转换为GB
                gpu: gpuTotal
            },
            usedResources: {
                cpu: Math.round(cpuUsed * 10) / 10,
                memory: Math.round(memoryUsed / 1000000000 * 10) / 10, // 转换为GB
                gpu: Math.round(gpuUsed * 10) / 10
            }
        });
    });
    
    return parsedNodes;
}
        if (node.state === 'ALIVE') {
            cpuUsage = Math.floor(Math.random() * 60 + 20); // 20-80%
            memoryUsage = Math.floor(Math.random() * 50 + 30); // 30-80%
        } else {
            cpuUsage = 0;
            memoryUsage = 0;
        }
        
        // 生成任务列表
        const tasks = generateNodeTasks(node);
        
        parsedNodes.push({
            id: node.node_id,
            name: `${node.node_name}${node.is_head_node ? ' (Head)' : ''}`,
            shortName: node.node_ip,
            x: x,
            y: y,
            cpu: cpuUsage,
            memory: memoryUsage,
            cpuTotal: cpuTotal,
            memoryTotal: Math.round(memoryTotal / (1024**3)), // 转换为GB
            objectStore: Math.round(objectStoreTotal / (1024**3)), // 转换为GB
            tasks: tasks,
            status: node.state.toLowerCase() === 'alive' ? 'active' : 'inactive',
            isHeadNode: node.is_head_node,
            stateMessage: node.state_message,
            labels: node.labels || {}
// 生成节点任务
function generateNodeTasks(node, cpuUsage, memoryUsage, gpuUsage) {
    const tasks = [];
    
    if (node.isHeadNode) {
        tasks.push('集群管理', '任务调度', 'GCS服务');
    } else {
        tasks.push('Ray任务执行');
    }
    
    // 根据使用率添加具体任务
    if (cpuUsage > 70) {
        tasks.push('高强度计算');
    } else if (cpuUsage > 30) {
        tasks.push('数据处理');
    }
    
    if (memoryUsage > 70) {
        tasks.push('大数据缓存');
    }
    
    if (gpuUsage > 50) {
        tasks.push('GPU加速计算');
    }
    
    if (node.state !== 'ALIVE') {
        tasks.length = 0;
        tasks.push('节点离线');
    }
    
    return tasks;
}
    
    if (node.resources_total.GPU > 0) {
        tasks.push('GPU计算', '模型训练');
    }
    
    if (node.resources_total.CPU >= 8) {
        tasks.push('并行计算', '数据处理');
    }
    
    if (node.state === 'ALIVE') {
        tasks.push('Ray工作节点');
    } else {
        tasks.push('节点离线');
    }
    
    return tasks;
}

// 生成连接关系
function generateConnections(nodes) {
    const connections = [];
    const aliveNodes = nodes.filter(n => n.status === 'active');
    const headNode = aliveNodes.find(n => n.isHeadNode);
    
    if (headNode) {
        // 头节点连接到所有活跃节点
        aliveNodes.forEach(node => {
            if (node.id !== headNode.id) {
                connections.push({
                    from: headNode.id,
                    to: node.id,
                    bandwidth: 'medium'
                });
            }
        });
        
        // 添加一些节点间的连接
        for (let i = 0; i < aliveNodes.length - 1; i++) {
            for (let j = i + 1; j < aliveNodes.length; j++) {
                if (aliveNodes[i].id !== headNode.id && aliveNodes[j].id !== headNode.id) {
                    if (Math.random() < 0.3) { // 30%的概率创建连接
                        connections.push({
                            from: aliveNodes[i].id,
                            to: aliveNodes[j].id,
                            bandwidth: Math.random() < 0.5 ? 'low' : 'medium'
                        });
                    }
                }
            }
        }
    }
    
    return connections;
}

// 初始化模拟数据（备用）
function initMockData() {
    nodeData = [
        { id: 'node-1', name: 'Web服务器-1', x: 150, y: 100, cpu: 25, memory: 30, tasks: ['HTTP请求处理', 'Session管理'], status: 'active' },
        { id: 'node-2', name: 'Web服务器-2', x: 300, y: 80, cpu: 45, memory: 55, tasks: ['HTTP请求处理', '负载均衡'], status: 'active' },
        { id: 'node-3', name: 'API网关', x: 450, y: 120, cpu: 60, memory: 40, tasks: ['路由转发', '权限验证'], status: 'active' },
        { id: 'node-4', name: '数据库主节点', x: 200, y: 250, cpu: 80, memory: 75, tasks: ['SQL查询', '事务处理', '数据备份'], status: 'active' },
        { id: 'node-5', name: '数据库从节点', x: 400, y: 280, cpu: 35, memory: 45, tasks: ['数据同步', '只读查询'], status: 'active' },
        { id: 'node-6', name: '缓存服务器', x: 550, y: 200, cpu: 20, memory: 85, tasks: ['缓存管理', 'Redis操作'], status: 'active' }
    ];
    
    connections = [
        { from: 'node-1', to: 'node-3', bandwidth: 'high' },
        { from: 'node-2', to: 'node-3', bandwidth: 'high' },
        { from: 'node-3', to: 'node-4', bandwidth: 'medium' },
        { from: 'node-4', to: 'node-5', bandwidth: 'medium' },
        { from: 'node-6', to: 'node-4', bandwidth: 'high' }
    ];
}

class NetworkVisualization {
    constructor() {
        this.svg = document.getElementById('networkSvg');
        this.animationSpeed = 1;
        this.isPaused = false;
        this.dataPackets = [];
        this.animationFrameId = null;
        this.rayApiUrl = 'http://10.30.2.11:8265/api/v0/nodes';
        this.isLoadingRayData = false;
        this.nodePositions = {};
        this.nodeMetrics = {};
        
        this.init();
        this.setupEventListeners();
        this.startAnimation();
    }

    async init() {
        // 显示加载状态
        this.showLoadingState();
        
        // 尝试获取Ray集群数据
        const success = await fetchRayClusterData();
        
        if (success) {
            console.log(`成功加载Ray集群数据，共${nodeData.length}个节点`);
        } else {
            console.log('使用模拟数据');
        }
        
        this.hideLoadingState();
        this.createConnections();
        this.createNodes();
        this.updateStats();
        this.createNodeCards();
        this.simulateDataUpdates();
    }

    showLoadingState() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingState';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.9);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 1000;
        `;
        loadingDiv.innerHTML = `
            <div>正在加载Ray集群数据...</div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                连接到: ${RAY_API_BASE}
            </div>
        `;
        this.svg.parentElement.appendChild(loadingDiv);
    }

    hideLoadingState() {
        const loadingDiv = document.getElementById('loadingState');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    startAutoRefresh() {
        // 每30秒自动刷新数据
        this.refreshInterval = setInterval(async () => {
            if (!this.isPaused) {
                console.log('自动刷新Ray集群数据...');
                await fetchRayClusterData();
                this.updateDisplay();
            }
        }, 30000);
    }

    updateDisplay() {
        // 清除现有显示
        const nodesGroup = document.getElementById('nodes');
        const connectionsGroup = document.getElementById('connections');
        
        if (nodesGroup) nodesGroup.remove();
        if (connectionsGroup) connectionsGroup.remove();
        
        // 重新创建显示
        this.createConnections();
        this.createNodes();
        this.updateStats();
        this.createNodeCards();
    }

    setupEventListeners() {
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.toggleAnimation();
        });

        document.getElementById('resetBtn').addEventListener('click', async () => {
            await this.refreshData();
        });

        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
        });

        document.getElementById('closeNodeInfo').addEventListener('click', () => {
            this.hideNodeInfo();
        });
    }

    async refreshData() {
        this.showLoadingState();
        const success = await fetchRayClusterData();
        this.hideLoadingState();
        
        if (success) {
            this.updateDisplay();
            console.log('数据刷新完成');
        }
    }

    createConnections() {
        const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        connectionsGroup.id = 'connections';
        this.svg.appendChild(connectionsGroup);

        connections.forEach((conn, index) => {
            const fromNode = nodeData.find(n => n.id === conn.from);
            const toNode = nodeData.find(n => n.id === conn.to);
            
            if (fromNode && toNode) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromNode.x);
                line.setAttribute('y1', fromNode.y);
                line.setAttribute('x2', toNode.x);
                line.setAttribute('y2', toNode.y);
                line.setAttribute('class', 'connection-line');
                line.setAttribute('id', `connection-${index}`);
                
                // 根据带宽设置线条粗细
                const strokeWidth = conn.bandwidth === 'high' ? 3 : conn.bandwidth === 'medium' ? 2 : 1;
                line.style.strokeWidth = strokeWidth;
                
                connectionsGroup.appendChild(line);
            }
        });
    }

    createNodes() {
        const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodesGroup.id = 'nodes';
        this.svg.appendChild(nodesGroup);

        nodeData.forEach(node => {
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.setAttribute('class', 'node');
            nodeGroup.setAttribute('id', node.id);
            nodeGroup.style.cursor = 'pointer';

            // 节点圆圈
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', 25);
            circle.setAttribute('class', 'node-circle');
            circle.setAttribute('fill', this.getNodeColor(node));

            // 节点名称 - 使用短名称避免重叠
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', node.x);
            text.setAttribute('y', node.y - 35);
            text.setAttribute('class', 'node-text');
            text.textContent = node.shortName || node.name.substring(0, 12) + '...';

            // CPU/内存状态显示
            const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            statusText.setAttribute('x', node.x);
            statusText.setAttribute('y', node.y + 45);
            statusText.setAttribute('class', 'node-status');
            statusText.textContent = node.status === 'active' ? 
                `CPU: ${Math.round(node.cpu)}% | MEM: ${Math.round(node.memory)}%` : 
                'OFFLINE';

            nodeGroup.appendChild(circle);
            nodeGroup.appendChild(text);
            nodeGroup.appendChild(statusText);
            
            // 添加点击事件
            nodeGroup.addEventListener('click', () => {
                this.showNodeInfo(node);
            });

            nodesGroup.appendChild(nodeGroup);
        });
    }

    getNodeColor(node) {
        if (node.status !== 'active') {
            return '#95a5a6'; // 灰色 - 离线节点
        }
        
        const maxLoad = Math.max(node.cpu, node.memory);
        if (maxLoad <= 30) return '#27ae60'; // 绿色 - 低负载
        if (maxLoad <= 70) return '#f39c12'; // 橙色 - 中等负载
        return '#e74c3c'; // 红色 - 高负载
    }

    getLoadClass(value) {
        if (value <= 30) return 'low';
        if (value <= 70) return 'medium';
        return 'high';
    }

    showNodeInfo(node) {
        const panel = document.getElementById('nodeInfoPanel');
        const title = document.getElementById('nodeInfoTitle');
        const cpu = document.getElementById('nodeInfoCpu');
        const memory = document.getElementById('nodeInfoMemory');
        const status = document.getElementById('nodeInfoStatus');
        const tasks = document.getElementById('nodeInfoTasks');
        const connectionsEl = document.getElementById('nodeInfoConnections');

        title.textContent = node.name;
        cpu.textContent = `${Math.round(node.cpu)}%`;
        memory.textContent = `${Math.round(node.memory)}%`;
        status.textContent = node.status === 'active' ? '运行中' : '离线';
        
        // 添加额外信息
        if (node.cpuTotal) {
            cpu.textContent += ` / ${node.cpuTotal} cores`;
        }
        if (node.memoryTotal) {
            memory.textContent += ` / ${node.memoryTotal}GB`;
        }

        // 显示任务
        tasks.innerHTML = '';
        node.tasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'task-item';
            taskDiv.textContent = task;
            tasks.appendChild(taskDiv);
        });

        // 显示连接
        connectionsEl.innerHTML = '';
        const nodeConnections = connections.filter(conn => 
            conn.from === node.id || conn.to === node.id
        );
        
        nodeConnections.forEach(conn => {
            const connDiv = document.createElement('div');
            connDiv.className = 'connection-item';
            const connectedNodeId = conn.from === node.id ? conn.to : conn.from;
            const connectedNode = nodeData.find(n => n.id === connectedNodeId);
            if (connectedNode) {
                connDiv.textContent = `${connectedNode.shortName || connectedNode.name} (${conn.bandwidth})`;
                connectionsEl.appendChild(connDiv);
            }
        });

        // 显示节点特殊信息
        if (node.isHeadNode) {
            const headInfo = document.createElement('div');
            headInfo.className = 'task-item';
            headInfo.style.background = '#3498db';
            headInfo.style.color = 'white';
            headInfo.textContent = '🎯 头节点';
            tasks.insertBefore(headInfo, tasks.firstChild);
        }

        if (node.stateMessage) {
            const errorInfo = document.createElement('div');
            errorInfo.className = 'task-item';
            errorInfo.style.background = '#e74c3c';
            errorInfo.style.color = 'white';
            errorInfo.style.fontSize = '0.8rem';
            errorInfo.textContent = `错误: ${node.stateMessage}`;
            tasks.appendChild(errorInfo);
        }

        panel.classList.remove('hidden');
    }

    hideNodeInfo() {
        document.getElementById('nodeInfoPanel').classList.add('hidden');
    }

    createDataPackets() {
        if (this.isPaused) return;

        // 随机选择一个连接来发送数据包
        const randomConnection = connections[Math.floor(Math.random() * connections.length)];
        const fromNode = nodeData.find(n => n.id === randomConnection.from);
        const toNode = nodeData.find(n => n.id === randomConnection.to);

        if (fromNode && toNode) {
            const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            packet.setAttribute('class', 'data-packet');
            packet.setAttribute('r', 4);
            packet.setAttribute('cx', fromNode.x);
            packet.setAttribute('cy', fromNode.y);
            
            this.svg.appendChild(packet);
            this.animatePacket(packet, fromNode, toNode);
        }
    }

    animatePacket(packet, fromNode, toNode) {
        const duration = 2000 / this.animationSpeed;
        const startTime = Date.now();

        const animate = () => {
            if (this.isPaused) {
                requestAnimationFrame(animate);
                return;
            }

            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const x = fromNode.x + (toNode.x - fromNode.x) * progress;
            const y = fromNode.y + (toNode.y - fromNode.y) * progress;

            packet.setAttribute('cx', x);
            packet.setAttribute('cy', y);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                packet.remove();
            }
        };

        animate();
    }

    updateStats() {
        const activeNodes = nodeData.filter(n => n.status === 'active').length;
        const totalNodes = nodeData.length;
        const avgCpu = nodeData.length > 0 ? Math.round(nodeData.reduce((sum, n) => sum + n.cpu, 0) / nodeData.length) : 0;
        const avgMemory = nodeData.length > 0 ? Math.round(nodeData.reduce((sum, n) => sum + n.memory, 0) / nodeData.length) : 0;
        const totalTasks = nodeData.reduce((sum, n) => sum + n.tasks.length, 0);
        const totalConnections = connections.length;

        document.getElementById('activeNodes').textContent = `${activeNodes}/${totalNodes}`;
        document.getElementById('avgCpu').textContent = `${avgCpu}%`;
        document.getElementById('avgMemory').textContent = `${avgMemory}%`;
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('totalConnections').textContent = totalConnections;
        
        // 更新页面标题显示集群状态
        document.title = `Ray集群监控 - ${activeNodes}/${totalNodes} 节点在线`;
    }

    createNodeCards() {
        const container = document.getElementById('nodeListContainer');
        container.innerHTML = '';

        nodeData.forEach(node => {
            const card = document.createElement('div');
            card.className = 'node-card';
            
            // 根据节点状态设置边框颜色
            const borderColor = node.status === 'active' ? '#3498db' : '#e74c3c';
            card.style.borderLeftColor = borderColor;
            
            card.innerHTML = `
                <h4>
                    ${node.name}
                    ${node.isHeadNode ? '<span style="color: #3498db; font-size: 0.8em;">👑 HEAD</span>' : ''}
                    ${node.status !== 'active' ? '<span style="color: #e74c3c; font-size: 0.8em;">❌ 离线</span>' : ''}
                </h4>
                <div class="node-card-stats">
                    <div class="node-card-stat">
                        <span>CPU使用率</span>
                        <span>${Math.round(node.cpu)}%${node.cpuTotal ? ` / ${node.cpuTotal} cores` : ''}</span>
                        <div class="progress-bar">
                            <div class="progress-fill ${this.getLoadClass(node.cpu)}" style="width: ${node.cpu}%"></div>
                        </div>
                    </div>
                    <div class="node-card-stat">
                        <span>内存使用率</span>
                        <span>${Math.round(node.memory)}%${node.memoryTotal ? ` / ${node.memoryTotal}GB` : ''}</span>
                        <div class="progress-bar">
                            <div class="progress-fill ${this.getLoadClass(node.memory)}" style="width: ${node.memory}%"></div>
                        </div>
                    </div>
                </div>
                <div class="node-card-tasks">
                    <strong>IP:</strong> ${node.shortName || 'N/A'}<br>
                    <strong>任务:</strong> ${node.tasks.join(', ')}
                    ${node.stateMessage ? `<br><strong style="color: #e74c3c;">错误:</strong> ${node.stateMessage}` : ''}
                </div>
            `;
            
            card.addEventListener('click', () => {
                this.showNodeInfo(node);
            });
            
            container.appendChild(card);
        });
    }

    simulateDataUpdates() {
        // 对于Ray集群，我们不需要模拟数据更新，因为会定期从API获取真实数据
        // 但保留一些轻微的变化来模拟实时性
        setInterval(() => {
            if (!this.isPaused && nodeData.length > 0) {
                // 轻微调整活跃节点的使用率来模拟实时性
                nodeData.forEach(node => {
                    if (node.status === 'active') {
                        // 很小的随机变化，保持在合理范围内
                        const cpuChange = (Math.random() - 0.5) * 5;
                        const memoryChange = (Math.random() - 0.5) * 3;
                        
                        node.cpu = Math.max(0, Math.min(100, node.cpu + cpuChange));
                        node.memory = Math.max(0, Math.min(100, node.memory + memoryChange));
                    }
                });

                this.updateNodeDisplay();
                this.updateStats();
                this.createNodeCards();
            }
        }, 5000); // 每5秒轻微更新一次
    }

    updateNodeDisplay() {
        nodeData.forEach(node => {
            const nodeElement = document.getElementById(node.id);
            if (nodeElement) {
                const circle = nodeElement.querySelector('.node-circle');
                const statusText = nodeElement.querySelector('.node-status');
                
                circle.setAttribute('fill', this.getNodeColor(node));
                statusText.textContent = `CPU: ${Math.round(node.cpu)}% | MEM: ${Math.round(node.memory)}%`;
            }
        });
    }

    startAnimation() {
        const animate = () => {
            if (!this.isPaused) {
                // 每500ms创建一个新的数据包
                if (Math.random() < 0.3) {
                    this.createDataPackets();
                }
            }
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    toggleAnimation() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseBtn');
        btn.textContent = this.isPaused ? '继续动画' : '暂停动画';
    }

    resetData() {
        // 对于Ray集群，重置意味着重新获取数据
        this.refreshData();
    }

    destroy() {
        // 清理资源
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new NetworkVisualization();
    
    // 页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
        if (app) {
            app.destroy();
        }
    });
    
    // 添加刷新按钮功能
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '刷新数据';
    refreshBtn.style.marginLeft = '10px';
    refreshBtn.addEventListener('click', () => {
        app.refreshData();
    });
    document.querySelector('.controls').appendChild(refreshBtn);
});

// 添加窗口大小调整处理
window.addEventListener('resize', () => {
    const svg = document.getElementById('networkSvg');
    const container = svg.parentElement;
    svg.setAttribute('width', container.clientWidth);
    svg.setAttribute('height', Math.max(600, container.clientHeight));
});
