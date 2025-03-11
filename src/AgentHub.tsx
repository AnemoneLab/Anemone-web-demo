import React, { useEffect, useState } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { type SuiObjectResponse } from '@mysten/sui/client';
import { List, Card, Typography, Image, Alert, Tooltip, message, Skeleton, Button, Tabs, Tag } from 'antd';
import { CopyOutlined, UserOutlined, GlobalOutlined } from '@ant-design/icons';
import './styles.css'
import { useNavigate } from 'react-router-dom';

// Agent类型定义
interface Agent {
    id: string; 
    role_id: string; 
    nft_id: string; 
    address: string; 
    created_at: string; 
    url?: string; 
    description?: string; 
    name?: string; 
    owner?: string;
    isOwner?: boolean;
}

export function AgentHub() {
    const currentAccount = useCurrentAccount();
    const [allAgents, setAllAgents] = useState<Agent[]>([]);
    const [myAgents, setMyAgents] = useState<Agent[]>([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const suiClient = useSuiClient();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAgents = async () => {
            // 不论是否连接钱包，都获取所有Agent
            try {
                const response = await fetch('http://localhost:3000/agents');
                const data = await response.json();
                console.log('Data:', data);
                if (data.success) {
                    const updatedAgents = await Promise.all(data.agents.map(async (agent: { nft_id: string; }) => {
                        const { url, description, name, owner } = await getNftDetails(agent.nft_id) || {};
                        // 标记是否是当前用户拥有的Agent
                        const isOwner = owner === currentAccount?.address;
                        return { ...agent, url, description, name, owner, isOwner };
                    }));
                    
                    // 设置所有Agents
                    setAllAgents(updatedAgents);
                    
                    // 只有连接钱包时，才设置我的Agent
                    if (currentAccount) {
                        setIsLoggedIn(true);
                        const userAgents = updatedAgents.filter(agent => agent.isOwner);
                        setMyAgents(userAgents);
                        console.log('My Agents:', userAgents);
                    } else {
                        setIsLoggedIn(false);
                        setMyAgents([]);
                    }
                    
                    console.log('All Agents:', updatedAgents);
                }
            } catch (error) {
                console.error('Error fetching agents:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, [currentAccount]);

    const getNftDetails = async (nftId: string) => {
        try {
            const response: SuiObjectResponse = await suiClient.getObject({ 
                id: nftId, 
                options: { 
                    showContent: true,
                    showOwner: true
                }
            });
            
            // 正确处理Sui对象内容
            if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
                return {};
            }
            
            // 安全地获取字段数据
            const content = response.data.content;
            // @ts-ignore 类型断言处理，确保能够正确访问moveObject的fields
            const fields = content.fields as Record<string, any> | undefined;
            if (!fields) return {};
            
            const url = fields.url || null;
            const description = fields.description || null;
            const name = fields.name || null;
            
            // 处理所有者地址
            const owner = typeof response.data?.owner === 'object' ? 
                (response.data.owner as any)?.AddressOwner || null : null;
            
            return { url, description, name, owner };
        } catch (error) {
            console.error('Error fetching NFT details:', error);
            return null;
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                message.success('复制成功！');
            })
            .catch(() => {
                message.error('复制失败，请重试。');
            });
    };

    // 处理导航到Agent详情页
    const handleViewAgentDetails = (roleId: string) => {
        navigate(`/agent/${roleId}`);
    };

    // 处理导航到聊天页面
    const handleChatWithAgent = (roleId: string) => {
        navigate(`/chat/${roleId}`);
    };

    // 渲染Agent卡片
    const renderAgentCard = (agent: Agent) => (
        <List.Item>
            <Card
                className="hover:bg-gray-800 transition-all duration-300 rounded-xl shadow-lg border-gray-700"
                bodyStyle={{ padding: 0 }}
                style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
                title={
                    <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                        {agent.name || `Agent ${agent.id}`}
                        {agent.isOwner && <Tag color="#1e40af" style={{ marginLeft: '8px' }}>My Agent</Tag>}
                    </Typography.Title>
                }
                headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
            >
                <div className="p-6">
                    <div className="flex flex-col gap-4">
                        {/* Agent图像 */}
                        {agent.url && (
                            <div className="flex justify-center">
                                <Image
                                    width={100}
                                    height={100}
                                    src={agent.url}
                                    alt={agent.description}
                                    className="rounded-lg object-cover border-2 border-gray-600"
                                    fallback="https://via.placeholder.com/100?text=Agent"
                                    style={{ marginBottom: '12px' }}
                                />
                            </div>
                        )}
                        
                        {/* Agent描述 */}
                        <Tooltip title={agent.description}>
                            <Typography.Paragraph 
                                ellipsis={{ rows: 2 }}
                                style={{ color: "#d1d5db", cursor: "help" }}
                            >
                                {agent.description || "无描述"}
                            </Typography.Paragraph>
                        </Tooltip>
                        
                        {/* Role ID */}
                        <div className="flex items-center justify-between">
                            <Typography.Text style={{ color: "#d1d5db" }}>
                                Role ID:
                            </Typography.Text>
                            <Tooltip title={agent.role_id}>
                                <Typography.Text
                                    style={{ color: "#d1d5db", cursor: "pointer" }}
                                    onClick={() => handleCopy(agent.role_id)}
                                >
                                    {`${agent.role_id.substring(0, 6)}...${agent.role_id.substring(agent.role_id.length - 4)}`}
                                    <CopyOutlined style={{ marginLeft: "5px" }} />
                                </Typography.Text>
                            </Tooltip>
                        </div>
                        
                        {/* NFT ID */}
                        <div className="flex items-center justify-between">
                            <Typography.Text style={{ color: "#d1d5db" }}>
                                NFT ID:
                            </Typography.Text>
                            <Tooltip title={agent.nft_id}>
                                <Typography.Text
                                    style={{ color: "#d1d5db", cursor: "pointer" }}
                                    onClick={() => handleCopy(agent.nft_id)}
                                >
                                    {`${agent.nft_id.substring(0, 6)}...${agent.nft_id.substring(agent.nft_id.length - 4)}`}
                                    <CopyOutlined style={{ marginLeft: "5px" }} />
                                </Typography.Text>
                            </Tooltip>
                        </div>
                        
                        {/* 地址 */}
                        <div className="flex items-center justify-between">
                            <Typography.Text style={{ color: "#d1d5db" }}>
                                钱包地址:
                            </Typography.Text>
                            <Tooltip title={agent.address}>
                                <Typography.Text
                                    style={{ color: "#d1d5db", cursor: "pointer" }}
                                    onClick={() => handleCopy(agent.address)}
                                >
                                    {`${agent.address.substring(0, 6)}...${agent.address.substring(agent.address.length - 4)}`}
                                    <CopyOutlined style={{ marginLeft: "5px" }} />
                                </Typography.Text>
                            </Tooltip>
                        </div>
                        
                        {/* 创建时间 */}
                        <div className="flex items-center justify-between">
                            <Typography.Text style={{ color: "#d1d5db" }}>
                                创建时间:
                            </Typography.Text>
                            <Typography.Text style={{ color: "#d1d5db" }}>
                                {new Date(agent.created_at).toLocaleDateString()}
                            </Typography.Text>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex justify-between items-center mt-4">
                            <Button 
                                type="primary"
                                size="small"
                                onClick={() => handleViewAgentDetails(agent.role_id)}
                                style={{ backgroundColor: "#3b82f6", borderColor: "#2563eb" }}
                            >
                                查看详情
                            </Button>
                            
                            {agent.isOwner && (
                                <Button 
                                    type="primary"
                                    size="small"
                                    onClick={() => handleChatWithAgent(agent.role_id)}
                                    style={{ backgroundColor: "#10b981", borderColor: "#059669" }}
                                >
                                    开始聊天
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </List.Item>
    );

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                <Typography.Title 
                    level={2} 
                    style={{ color: "white" }} 
                    className="text-center font-bold text-2xl mb-8"
                >
                    Agent Hub
                </Typography.Title>
        
                {/* 我的Agent部分 */}
                <div className="mb-12">
                    <Typography.Title 
                        level={3} 
                        style={{ color: "white", marginBottom: "24px", display: "flex", alignItems: "center" }}
                    >
                        <UserOutlined style={{ marginRight: "8px" }} />
                        我的Agents ({myAgents.length})
                    </Typography.Title>
                    
                    {!isLoggedIn ? (
                        <Alert
                            message="连接提示"
                            description="请连接钱包以查看您的Agents"
                            type="warning"
                            showIcon
                            className="mb-8 bg-gray-800 border-gray-700 text-gray-300"
                        />
                    ) : loading ? (
                        <Skeleton 
                            active 
                            paragraph={{ rows: 4, width: '100%' }}
                            title={{ width: '80%' }}
                            className="bg-gray-700"
                        />
                    ) : myAgents.length > 0 ? (
                        <List
                            grid={{ 
                                gutter: 24,
                                xs: 1,
                                sm: 1,
                                md: 2,
                                lg: 2,
                                xl: 3,
                                xxl: 3
                            }}
                            dataSource={myAgents}
                            renderItem={renderAgentCard}
                        />
                    ) : (
                        <div className="text-center py-10">
                            <Typography.Text style={{ color: "#d1d5db" }}>
                                您还没有Agent，请先创建一个
                            </Typography.Text>
                            <div className="mt-4">
                                <Button 
                                    type="primary" 
                                    onClick={() => navigate('/createAgent')}
                                    style={{ backgroundColor: "#1e40af", borderColor: "#1e3a8a" }}
                                >
                                    创建Agent
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* 所有Agent部分 - 不论钱包连接状态都显示 */}
                <div>
                    <Typography.Title 
                        level={3} 
                        style={{ color: "white", marginBottom: "24px", display: "flex", alignItems: "center" }}
                    >
                        <GlobalOutlined style={{ marginRight: "8px" }} />
                        所有Agents ({allAgents.length})
                    </Typography.Title>
                    
                    {loading ? (
                        <Skeleton 
                            active 
                            paragraph={{ rows: 4, width: '100%' }}
                            title={{ width: '80%' }}
                            className="bg-gray-700"
                        />
                    ) : (
                        <List
                            grid={{ 
                                gutter: 24,
                                xs: 1,
                                sm: 1,
                                md: 2,
                                lg: 2,
                                xl: 3,
                                xxl: 3
                            }}
                            dataSource={allAgents}
                            renderItem={renderAgentCard}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default AgentHub; 