import ray
import requests
import json
from datetime import datetime
import random

def get_node_stats_from_api(dashboard_url="http://10.30.2.11:8265"):
    """从 Ray Dashboard API 获取详细的节点统计信息"""
    try:
        # 获取节点信息
        nodes_response = requests.get(f"{dashboard_url}/api/v0/nodes", timeout=10)
        if nodes_response.status_code == 200:
            return nodes_response.json()
        else:
            print(f"API 请求失败: {nodes_response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"API 请求错误: {e}")
        return None

def simulate_usage(min_val=10, max_val=80):
    """模拟资源使用率"""
    return round(random.uniform(min_val, max_val), 1)

def extract_node_identifier(resources_total):
    """提取节点标识符"""
    standard_keys = [
        'CPU', 'memory', 'GPU', 'object_store_memory', 
        'accelerator_type:G', 'Wired', 'Wireless', 'node:10.30.2.11', 'node:__internal_head__'
    ]
    
    for key in resources_total:
        if key not in standard_keys:
            return key
    return None

def get_connection_type(resources_total):
    """获取连接类型"""
    if resources_total.get('Wired') == 1.0:
        return 'wired'
    elif resources_total.get('Wireless') == 1.0:
        return 'wireless'
    return 'unknown'

def generate_node_tasks(node, cpu_usage, memory_usage, gpu_usage):
    """生成节点任务信息"""
    tasks = []
    
    # 根据使用率生成任务
    if cpu_usage > 50:
        tasks.append("CPU密集任务")
    if memory_usage > 60:
        tasks.append("内存密集任务")
    if gpu_usage > 40:
        tasks.append("GPU计算任务")
    if node.get('is_head_node', False):
        tasks.append("集群管理")
    
    # 如果没有任务，添加空闲状态
    if not tasks:
        tasks.append("空闲")
    
    return tasks

def parse_ray_nodes_to_frontend_format(ray_nodes, cluster_resources, available_resources):
    """将 Ray 节点数据转换为前端期望的格式"""
    parsed_nodes = []
    
    for node in ray_nodes:
        # 获取节点标识符
        node_identifier = extract_node_identifier(node.get('resources_total', {}))
        
        # 检查连接类型
        connection_type = get_connection_type(node.get('resources_total', {}))
        
        # 模拟资源使用率（Ray API 不直接提供实时使用率）
        cpu_usage = simulate_usage(20, 80)
        memory_usage = simulate_usage(15, 75)
        gpu_usage = simulate_usage(10, 90) if node.get('resources_total', {}).get('GPU', 0) > 0 else 0
        
        # 生成任务
        tasks = generate_node_tasks(node, cpu_usage, memory_usage, gpu_usage)
        
        # 构造前端期望的节点数据格式
        parsed_node = {
            "id": node.get('node_id', '')[-8:],  # 使用node_id的最后8位作为短ID
            "name": node_identifier or f"节点-{node.get('node_ip', 'Unknown')}",
            "fullName": f"{node_identifier or '未知'} ({node.get('node_ip', 'Unknown')})",
            "nodeIp": node.get('node_ip', 'Unknown'),
            "nodeId": node.get('node_id', ''),
            "state": node.get('state', 'UNKNOWN'),
            "isHeadNode": node.get('is_head_node', False),
            "cpu": cpu_usage,
            "memory": memory_usage,
            "gpu": gpu_usage,
            "tasks": tasks,
            "status": "active" if node.get('state') == 'ALIVE' else "dead",
            "stateMessage": node.get('state_message'),
            "connectionType": connection_type,
            "resources": {
                "totalCpu": node.get('resources_total', {}).get('CPU', 0),
                "totalMemory": round((node.get('resources_total', {}).get('memory', 0)) / (1024**3)),  # 转换为GB
                "totalGpu": node.get('resources_total', {}).get('GPU', 0),
                "objectStore": round((node.get('resources_total', {}).get('object_store_memory', 0)) / (1024**3))
            }
        }
        
        parsed_nodes.append(parsed_node)
    
    return parsed_nodes

def create_cluster_summary(cluster_resources, available_resources, nodes_data):
    """创建集群摘要信息"""
    total_cpus = cluster_resources.get('CPU', 0)
    available_cpus = available_resources.get('CPU', 0)
    used_cpus = total_cpus - available_cpus
    
    total_memory = cluster_resources.get('memory', 0)
    available_memory = available_resources.get('memory', 0)
    used_memory = total_memory - available_memory
    
    total_gpus = cluster_resources.get('GPU', 0)
    available_gpus = available_resources.get('GPU', 0)
    used_gpus = total_gpus - available_gpus
    
    total_object_store = cluster_resources.get('object_store_memory', 0)
    available_object_store = available_resources.get('object_store_memory', 0)
    used_object_store = total_object_store - available_object_store
    
    # 统计节点状态
    alive_nodes = sum(1 for node in nodes_data if node['status'] == 'active')
    dead_nodes = sum(1 for node in nodes_data if node['status'] == 'dead')
    head_nodes = sum(1 for node in nodes_data if node['isHeadNode'])
    
    return {
        "totalNodes": len(nodes_data),
        "aliveNodes": alive_nodes,
        "deadNodes": dead_nodes,
        "headNodes": head_nodes,
        "resources": {
            "cpu": {
                "total": total_cpus,
                "used": used_cpus,
                "available": available_cpus,
                "usagePercent": round((used_cpus / total_cpus * 100) if total_cpus > 0 else 0, 1)
            },
            "memory": {
                "total": total_memory,
                "used": used_memory,
                "available": available_memory,
                "usagePercent": round((used_memory / total_memory * 100) if total_memory > 0 else 0, 1),
                "totalGB": round(total_memory / (1024**3), 2),
                "usedGB": round(used_memory / (1024**3), 2)
            },
            "gpu": {
                "total": total_gpus,
                "used": used_gpus,
                "available": available_gpus,
                "usagePercent": round((used_gpus / total_gpus * 100) if total_gpus > 0 else 0, 1)
            },
            "objectStore": {
                "total": total_object_store,
                "used": used_object_store,
                "available": available_object_store,
                "usagePercent": round((used_object_store / total_object_store * 100) if total_object_store > 0 else 0, 1),
                "totalGB": round(total_object_store / (1024**3), 2),
                "usedGB": round(used_object_store / (1024**3), 2)
            }
        }
    }

import ray
import requests
import json
from datetime import datetime
import random
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import socketserver

# 全局变量存储最新的集群数据
latest_cluster_data = None
data_lock = threading.Lock()

class RayClusterHandler(BaseHTTPRequestHandler):
    """HTTP 请求处理器"""
    
    def do_GET(self):
        """处理 GET 请求"""
        global latest_cluster_data
        
        # 设置响应头
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')  # 允许跨域
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        # 获取最新数据
        with data_lock:
            if latest_cluster_data is not None:
                response_data = latest_cluster_data
            else:
                response_data = {
                    "result": False,
                    "msg": "数据尚未准备就绪",
                    "timestamp": datetime.now().isoformat(),
                    "data": None
                }
        
        # 发送 JSON 响应
        response_json = json.dumps(response_data, ensure_ascii=False, indent=2)
        self.wfile.write(response_json.encode('utf-8'))
    
    def do_OPTIONS(self):
        """处理 OPTIONS 请求（CORS 预检）"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")

def get_node_stats_from_api(dashboard_url="http://10.30.2.11:8265"):
    """从 Ray Dashboard API 获取详细的节点统计信息"""
    try:
        # 获取节点信息
        nodes_response = requests.get(f"{dashboard_url}/api/v0/nodes", timeout=10)
        if nodes_response.status_code == 200:
            return nodes_response.json()
        else:
            print(f"API 请求失败: {nodes_response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"API 请求错误: {e}")
        return None

def simulate_usage(min_val=10, max_val=80):
    """模拟资源使用率"""
    return round(random.uniform(min_val, max_val), 1)

def extract_node_identifier(resources_total):
    """提取节点标识符"""
    standard_keys = [
        'CPU', 'memory', 'GPU', 'object_store_memory', 
        'accelerator_type:G', 'Wired', 'Wireless', 'node:10.30.2.11', 'node:__internal_head__'
    ]
    
    for key in resources_total:
        if key not in standard_keys:
            return key
    return None

def get_connection_type(resources_total):
    """获取连接类型"""
    if resources_total.get('Wired') == 1.0:
        return 'wired'
    elif resources_total.get('Wireless') == 1.0:
        return 'wireless'
    return 'unknown'

def generate_node_tasks(node, cpu_usage, memory_usage, gpu_usage):
    """生成节点任务信息"""
    tasks = []
    
    # 根据使用率生成任务
    if cpu_usage > 50:
        tasks.append("CPU密集任务")
    if memory_usage > 60:
        tasks.append("内存密集任务")
    if gpu_usage > 40:
        tasks.append("GPU计算任务")
    if node.get('is_head_node', False):
        tasks.append("集群管理")
    
    # 如果没有任务，添加空闲状态
    if not tasks:
        tasks.append("空闲")
    
    return tasks

def parse_ray_nodes_to_frontend_format(ray_nodes, cluster_resources, available_resources):
    """将 Ray 节点数据转换为前端期望的格式"""
    parsed_nodes = []
    
    for node in ray_nodes:
        # 获取节点标识符
        node_identifier = extract_node_identifier(node.get('resources_total', {}))
        
        # 检查连接类型
        connection_type = get_connection_type(node.get('resources_total', {}))
        
        # 模拟资源使用率（Ray API 不直接提供实时使用率）
        cpu_usage = simulate_usage(20, 80)
        memory_usage = simulate_usage(15, 75)
        gpu_usage = simulate_usage(10, 90) if node.get('resources_total', {}).get('GPU', 0) > 0 else 0
        
        # 生成任务
        tasks = generate_node_tasks(node, cpu_usage, memory_usage, gpu_usage)
        
        # 构造前端期望的节点数据格式
        parsed_node = {
            "id": node.get('node_id', '')[-8:],  # 使用node_id的最后8位作为短ID
            "name": node_identifier or f"节点-{node.get('node_ip', 'Unknown')}",
            "fullName": f"{node_identifier or '未知'} ({node.get('node_ip', 'Unknown')})",
            "nodeIp": node.get('node_ip', 'Unknown'),
            "nodeId": node.get('node_id', ''),
            "state": node.get('state', 'UNKNOWN'),
            "isHeadNode": node.get('is_head_node', False),
            "cpu": cpu_usage,
            "memory": memory_usage,
            "gpu": gpu_usage,
            "tasks": tasks,
            "status": "active" if node.get('state') == 'ALIVE' else "dead",
            "stateMessage": node.get('state_message'),
            "connectionType": connection_type,
            "resources": {
                "totalCpu": node.get('resources_total', {}).get('CPU', 0),
                "totalMemory": round((node.get('resources_total', {}).get('memory', 0)) / (1024**3)),  # 转换为GB
                "totalGpu": node.get('resources_total', {}).get('GPU', 0),
                "objectStore": round((node.get('resources_total', {}).get('object_store_memory', 0)) / (1024**3))
            }
        }
        
        parsed_nodes.append(parsed_node)
    
    return parsed_nodes

def create_cluster_summary(cluster_resources, available_resources, nodes_data):
    """创建集群摘要信息"""
    total_cpus = cluster_resources.get('CPU', 0)
    available_cpus = available_resources.get('CPU', 0)
    used_cpus = total_cpus - available_cpus
    
    total_memory = cluster_resources.get('memory', 0)
    available_memory = available_resources.get('memory', 0)
    used_memory = total_memory - available_memory
    
    total_gpus = cluster_resources.get('GPU', 0)
    available_gpus = available_resources.get('GPU', 0)
    used_gpus = total_gpus - available_gpus
    
    total_object_store = cluster_resources.get('object_store_memory', 0)
    available_object_store = available_resources.get('object_store_memory', 0)
    used_object_store = total_object_store - available_object_store
    
    # 统计节点状态
    alive_nodes = sum(1 for node in nodes_data if node['status'] == 'active')
    dead_nodes = sum(1 for node in nodes_data if node['status'] == 'dead')
    head_nodes = sum(1 for node in nodes_data if node['isHeadNode'])
    
    return {
        "totalNodes": len(nodes_data),
        "aliveNodes": alive_nodes,
        "deadNodes": dead_nodes,
        "headNodes": head_nodes,
        "resources": {
            "cpu": {
                "total": total_cpus,
                "used": used_cpus,
                "available": available_cpus,
                "usagePercent": round((used_cpus / total_cpus * 100) if total_cpus > 0 else 0, 1)
            },
            "memory": {
                "total": total_memory,
                "used": used_memory,
                "available": available_memory,
                "usagePercent": round((used_memory / total_memory * 100) if total_memory > 0 else 0, 1),
                "totalGB": round(total_memory / (1024**3), 2),
                "usedGB": round(used_memory / (1024**3), 2)
            },
            "gpu": {
                "total": total_gpus,
                "used": used_gpus,
                "available": available_gpus,
                "usagePercent": round((used_gpus / total_gpus * 100) if total_gpus > 0 else 0, 1)
            },
            "objectStore": {
                "total": total_object_store,
                "used": used_object_store,
                "available": available_object_store,
                "usagePercent": round((used_object_store / total_object_store * 100) if total_object_store > 0 else 0, 1),
                "totalGB": round(total_object_store / (1024**3), 2),
                "usedGB": round(used_object_store / (1024**3), 2)
            }
        }
    }

def fetch_cluster_data():
    """获取集群数据"""
    try:
        # 连接到 Ray 集群
        if not ray.is_initialized():
            ray.init(address='auto')
        
        # 获取基本集群资源信息
        cluster_resources = ray.cluster_resources()
        available_resources = ray.available_resources()
        
        # 从 Dashboard API 获取详细节点信息
        nodes_api_data = get_node_stats_from_api()
        
        if nodes_api_data and 'data' in nodes_api_data:
            # 解析 API 响应
            if 'result' in nodes_api_data['data'] and 'result' in nodes_api_data['data']['result']:
                ray_nodes = nodes_api_data['data']['result']['result']
            else:
                ray_nodes = []
        else:
            ray_nodes = []
        
        # 转换为前端格式
        frontend_nodes = parse_ray_nodes_to_frontend_format(ray_nodes, cluster_resources, available_resources)
        
        # 创建集群摘要
        cluster_summary = create_cluster_summary(cluster_resources, available_resources, frontend_nodes)
        
        # 构造最终的 JSON 输出
        output_data = {
            "result": True,
            "msg": "成功获取Ray集群信息",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "result": {
                    "total": len(frontend_nodes),
                    "num_after_truncation": len(frontend_nodes),
                    "num_filtered": len(frontend_nodes),
                    "result": ray_nodes  # 保持原始API格式以兼容前端
                },
                "summary": cluster_summary,
                "nodes": frontend_nodes,
                "dashboardUrl": "http://10.30.2.11:8265"
            }
        }
        
        return output_data
        
    except Exception as e:
        # 错误处理
        error_output = {
            "result": False,
            "msg": f"错误: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "data": None
        }
        return error_output

def update_data_periodically():
    """定期更新数据的后台线程"""
    global latest_cluster_data
    
    print("开始定期更新集群数据（每10秒一次）...")
    
    while True:
        try:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 正在更新集群数据...")
            new_data = fetch_cluster_data()
            
            with data_lock:
                latest_cluster_data = new_data
            
            if new_data['result']:
                node_count = len(new_data['data']['nodes']) if new_data['data'] and new_data['data']['nodes'] else 0
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 数据更新成功，共 {node_count} 个节点")
            else:
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 数据更新失败: {new_data['msg']}")
                
        except Exception as e:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 更新数据时发生错误: {e}")
            
        # 等待10秒
        time.sleep(10)

def main():
    """主函数"""
    global latest_cluster_data
    
    # 设置服务器端口，尝试多个端口
    PORTS_TO_TRY = [8888, 9999, 7777, 6666, 5555]
    
    print("Ray 集群监控服务启动中...")
    
    # 初始获取一次数据
    print("正在获取初始数据...")
    latest_cluster_data = fetch_cluster_data()
    
    # 启动后台数据更新线程
    update_thread = threading.Thread(target=update_data_periodically, daemon=True)
    update_thread.start()
    
    # 尝试启动 HTTP 服务器
    for PORT in PORTS_TO_TRY:
        try:
            with socketserver.TCPServer(("", PORT), RayClusterHandler) as httpd:
                print(f"服务器成功启动在端口 {PORT}")
                print(f"访问 URL: http://localhost:{PORT}")
                print(f"外部访问: http://10.30.2.11:{PORT}")
                print("按 Ctrl+C 停止服务器")
                httpd.serve_forever()
                break
        except OSError as e:
            if e.errno == 98:  # Address already in use
                print(f"端口 {PORT} 已被占用，尝试下一个端口...")
                continue
            else:
                print(f"端口 {PORT} 启动失败: {e}")
                continue
        except KeyboardInterrupt:
            print("\n服务器已停止")
            break
        except Exception as e:
            print(f"端口 {PORT} 启动失败: {e}")
            continue
    else:
        print("所有端口都被占用，无法启动服务器")

if __name__ == "__main__":
    main()