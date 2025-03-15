import React, { useEffect, useState } from 'react';
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useParams, useNavigate } from 'react-router-dom';
import { type SuiObjectResponse } from '@mysten/sui/client';
import { Typography, Skeleton, Button, Descriptions, Card, Tag, Divider, message, Tooltip, Progress, List, Empty, Row, Col, Space, Tabs, Collapse } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, WalletOutlined, HeartOutlined, LockOutlined, ClockCircleOutlined, PlusOutlined, ToolOutlined, SaveOutlined, ArrowRightOutlined, ArrowLeftOutlined as ArrowLeft, SafetyCertificateOutlined, CodeOutlined, FileTextOutlined, DashboardOutlined } from '@ant-design/icons';
import './styles.css';
import { apiClient } from './api/apiClient';
import { RoleManager } from '@anemonelab/sui-sdk';

// 定义Attestation类型
interface Certificate {
  subject: {
    common_name: string;
    organization: string | null;
    country: string | null;
    state: string | null;
    locality: string | null;
  };
  issuer: {
    common_name: string;
    organization: string;
    country: string | null;
  };
  serial_number: string;
  not_before: string;
  not_after: string;
  version: string;
  fingerprint: string;
  signature_algorithm: string;
  sans: any | null;
  is_ca: boolean;
  position_in_chain: number;
  quote: string | null;
}

interface EventLog {
  imr: number;
  event_type: number;
  digest: string;
  event: string;
  event_payload: string;
}

interface AttestationResponse {
  is_online: boolean;
  is_public: boolean;
  error: string | null;
  app_certificates: Certificate[];
  tcb_info: {
    mrtd: string;
    rootfs_hash: string;
    rtmr0: string;
    rtmr1: string;
    rtmr2: string;
    rtmr3: string;
    event_log: EventLog[];
  };
  compose_file: string;
}

// Agent相关类型定义
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

// Role链上数据类型定义
interface RoleData {
  id: string;
  bot_nft_id: string;
  health: bigint;
  is_active: boolean;
  is_locked: boolean;
  last_epoch: bigint;
  inactive_epochs: bigint;
  balance: bigint;
  bot_address: string;
  skills?: string[];
  app_id?: string;
}

// 完整Agent详情类型
interface AgentDetail extends Agent {
  roleData?: RoleData;
  nftData?: {
    name?: string;
    description?: string;
    url?: string;
    owner?: string;
  };
}

// 技能类型定义
interface Skill {
  object_id: string;
  name?: string;
  description?: string;
  endpoint?: string;
  doc?: string;
  github_repo?: string;
  docker_image?: string;
  quote?: string;
  log_url?: string;
  public_key?: string;
  fee?: bigint;
  owner?: string;
  is_enabled?: boolean;
}

// 定义NFT数据接口
interface NftData {
  url: string;
  name: string;
  description: string;
  owner?: string;
}

// 定义CVM系统状态类型
interface DiskInfo {
  name: string;
  mount_point: string;
  total_size: number;
  free_size: number;
}

interface SysInfo {
  os_name: string;
  os_version: string;
  kernel_version: string;
  cpu_model: string;
  num_cpus: number;
  total_memory: number;
  available_memory: number;
  used_memory: number;
  free_memory: number;
  total_swap: number;
  used_swap: number;
  free_swap: number;
  uptime: number;
  loadavg_one: number;
  loadavg_five: number;
  loadavg_fifteen: number;
  disks: DiskInfo[];
}

interface CvmStatsResponse {
  is_online: boolean;
  is_public: boolean;
  error: string | null;
  sysinfo: SysInfo;
}

export function AgentDetail() {
  const { roleId } = useParams<{ roleId: string }>();
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [allSkillsLoading, setAllSkillsLoading] = useState(false);
  const [agentSkills, setAgentSkills] = useState<Skill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState<string>("info");
  const [attestation, setAttestation] = useState<AttestationResponse | null>(null);
  const [attestationLoading, setAttestationLoading] = useState(false);
  const [cvmStats, setCvmStats] = useState<CvmStatsResponse | null>(null);
  const [cvmStatsLoading, setCvmStatsLoading] = useState(false);
  const navigate = useNavigate();
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { Panel } = Collapse;

  useEffect(() => {
    if (roleId) {
      fetchAgentDetailsByRoleId(roleId);
    }
  }, [roleId]);

  // 新增：获取CVM证明信息
  const fetchCvmAttestation = async (appId: string) => {
    if (!appId) {
      message.error('无法获取证明信息：缺少App ID');
      return;
    }
    
    setAttestationLoading(true);
    try {
      // 使用apiClient获取证明信息
      const attestationData = await apiClient.getCvmAttestation(appId);
      console.log('获取到CVM证明信息:', attestationData);
      
      if (attestationData.success && attestationData.data) {
        setAttestation(attestationData.data);
      } else {
        throw new Error(attestationData.message || '获取证明信息失败');
      }
    } catch (error) {
      console.error('获取CVM证明信息失败:', error);
      message.error('获取CVM证明信息失败');
    } finally {
      setAttestationLoading(false);
    }
  };

  // 新增：获取CVM状态信息
  const fetchCvmStats = async (appId: string) => {
    if (!appId) {
      message.error('无法获取系统状态信息：缺少App ID');
      return;
    }
    
    setCvmStatsLoading(true);
    try {
      // 使用apiClient获取CVM状态信息
      const statsData = await apiClient.getCvmStats(appId);
      console.log('获取到CVM状态信息:', statsData);
      
      if (statsData.success && statsData.data) {
        setCvmStats(statsData.data);
      } else {
        throw new Error(statsData.message || '获取系统状态信息失败');
      }
    } catch (error) {
      console.error('获取CVM系统状态信息失败:', error);
      message.error('获取CVM系统状态信息失败');
    } finally {
      setCvmStatsLoading(false);
    }
  };

  // 当标签页切换到CVM Overview标签页时，自动获取系统状态信息
  useEffect(() => {
    if (activeTabKey === "cvm-overview" && agent?.roleData?.app_id && !cvmStats) {
      fetchCvmStats(agent.roleData.app_id);
    }
  }, [activeTabKey, agent?.roleData?.app_id, cvmStats]);

  // 当标签页切换到证明信息标签页时，自动获取证明信息
  useEffect(() => {
    if (activeTabKey === "attestation" && agent?.roleData?.app_id && !attestation) {
      fetchCvmAttestation(agent.roleData.app_id);
    }
  }, [activeTabKey, agent?.roleData?.app_id, attestation]);

  // 根据roleId获取Agent详情
  const fetchAgentDetailsByRoleId = async (roleId: string) => {
    setLoading(true);
    try {
      console.log("开始获取Role数据:", roleId);
      
      // 首先获取Role链上数据
      const roleData = await fetchRoleData(roleId);
      console.log("获取到Role数据:", roleData);
      
      if (!roleData) {
        throw new Error('无法获取Role数据');
      }

      // 测试图片 - 确保有一个可用的URL
      const testImageUrl = "https://avatars.githubusercontent.com/u/86160567";

      // 获取NFT数据
      if (!roleData.bot_nft_id || roleData.bot_nft_id.length === 0) {
        console.error("Role数据中缺少有效的bot_nft_id");
        // 创建没有NFT数据的Agent，但使用测试图片
        const simpleAgent = {
          id: "unknown",
          role_id: roleId,
          nft_id: "unknown",
          address: roleData.bot_address,
          created_at: new Date().toISOString(),
          roleData,
          nftData: {
            name: "测试NFT",
            description: "这是一个测试NFT",
            url: testImageUrl
          }
        };
        console.log("设置带测试图片的Agent数据:", simpleAgent);
        setAgent(simpleAgent);
        setLoading(false);
        return;
      }

      console.log("开始获取NFT数据:", roleData.bot_nft_id);
      const nftData = await fetchNftData(roleData.bot_nft_id);
      console.log("获取到NFT数据:", nftData);
      
      // 如果NFT数据中没有URL，使用测试图片
      if (!nftData || !nftData.url || nftData.url.length === 0) {
        const updatedNftData = nftData ? {...nftData} : { url: '', name: '', description: '' };
        updatedNftData.url = testImageUrl;
        console.log("使用测试图片URL:", updatedNftData);
        
        // 通过API获取Agent信息（可选，如果API支持按roleId查询）
        try {
          const apiData = await apiClient.getAgentByRoleId(roleId);
          console.log("API返回的Agent数据:", apiData);
          
          if (apiData.success && apiData.agent) {
            const agent: AgentDetail = {
              ...apiData.agent,
              role_id: roleId,
              roleData,
              nftData: updatedNftData,
              isOwner: currentAccount && (updatedNftData as NftData).owner ? (updatedNftData as NftData).owner === currentAccount.address : false
            };
            console.log("设置完整Agent数据:", agent);
            setAgent(agent);
          } else {
            // 如果API没有返回数据，创建一个基本的Agent对象
            const basicAgent: AgentDetail = {
              id: "unknown",
              role_id: roleId,
              nft_id: roleData.bot_nft_id,
              address: roleData.bot_address,
              created_at: new Date().toISOString(),
              roleData,
              nftData: updatedNftData,
              isOwner: currentAccount && (updatedNftData as NftData).owner ? (updatedNftData as NftData).owner === currentAccount.address : false
            };
            console.log("设置基本Agent数据:", basicAgent);
            setAgent(basicAgent);
          }
        } catch (apiError) {
          console.error("获取API Agent数据出错:", apiError);
          // 创建一个基本的Agent对象
          const basicAgent: AgentDetail = {
            id: "unknown",
            role_id: roleId,
            nft_id: roleData.bot_nft_id,
            address: roleData.bot_address,
            created_at: new Date().toISOString(),
            roleData,
            nftData: updatedNftData,
            isOwner: currentAccount && (updatedNftData as NftData).owner ? (updatedNftData as NftData).owner === currentAccount.address : false
          };
          console.log("设置基本Agent数据:", basicAgent);
          setAgent(basicAgent);
        }
      } else {
        // 通过API获取Agent信息
        try {
          const apiData = await apiClient.getAgentByRoleId(roleId);
          console.log("API返回的Agent数据:", apiData);
          
          if (apiData.success && apiData.agent) {
            const agent: AgentDetail = {
              ...apiData.agent,
              role_id: roleId,
              roleData,
              nftData,
              isOwner: currentAccount && nftData.owner ? nftData.owner === currentAccount.address : false
            };
            console.log("设置完整Agent数据:", agent);
            setAgent(agent);
          } else {
            // 如果API没有返回数据，创建一个基本的Agent对象
            const basicAgent: AgentDetail = {
              id: "unknown",
              role_id: roleId,
              nft_id: roleData.bot_nft_id,
              address: roleData.bot_address,
              created_at: new Date().toISOString(),
              roleData,
              nftData,
              isOwner: currentAccount && nftData.owner ? nftData.owner === currentAccount.address : false
            };
            console.log("设置基本Agent数据:", basicAgent);
            setAgent(basicAgent);
          }
        } catch (apiError) {
          console.error("获取API Agent数据出错:", apiError);
          // 创建一个基本的Agent对象
          const basicAgent: AgentDetail = {
            id: "unknown",
            role_id: roleId,
            nft_id: roleData.bot_nft_id,
            address: roleData.bot_address,
            created_at: new Date().toISOString(),
            roleData,
            nftData,
            isOwner: currentAccount && nftData.owner ? nftData.owner === currentAccount.address : false
          };
          console.log("设置基本Agent数据:", basicAgent);
          setAgent(basicAgent);
        }
      }
    } catch (error) {
      console.error("获取Agent详情出错:", error);
      message.error('获取Agent详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取Role链上数据
  const fetchRoleData = async (roleId: string): Promise<RoleData | undefined> => {
    try {
      console.log("调用SUI API获取Role对象:", roleId);
      const response: SuiObjectResponse = await suiClient.getObject({
        id: roleId,
        options: {
          showContent: true,
          showOwner: true
        }
      });
      console.log("SUI API返回的Role数据:", response);

      // 正确处理Sui对象内容
      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        console.error("SUI API返回的Role数据格式不正确");
        return undefined;
      }
      
      // @ts-ignore 类型断言处理，确保能够正确访问moveObject的fields
      const fields = response.data.content.fields as Record<string, any> | undefined;
      console.log("Role对象的fields:", fields);
      
      if (!fields) {
        console.error("Role对象没有fields");
        return undefined;
      }

      // 确保能正确读取bot_nft_id
      let bot_nft_id = '';
      if (fields.bot_nft_id) {
        if (typeof fields.bot_nft_id === 'string') {
          bot_nft_id = fields.bot_nft_id;
        } else if (fields.bot_nft_id.id) {
          bot_nft_id = fields.bot_nft_id.id;
        } else {
          console.log("bot_nft_id结构:", JSON.stringify(fields.bot_nft_id));
        }
      }
      console.log("提取的NFT ID:", bot_nft_id);

      // 提取skills数组
      const skills: string[] = [];
      if (fields.skills && Array.isArray(fields.skills)) {
        for (const skill of fields.skills) {
          if (typeof skill === 'string') {
            skills.push(skill);
          }
        }
      }

      // 提取Role详细信息
      const roleData = {
        id: roleId,
        bot_nft_id: bot_nft_id,
        health: BigInt(fields.health || 0),
        is_active: fields.is_active || false,
        is_locked: fields.is_locked || false,
        last_epoch: BigInt(fields.last_epoch || 0),
        inactive_epochs: BigInt(fields.inactive_epochs || 0),
        balance: fields.balance && fields.balance.value ? BigInt(fields.balance.value) : BigInt(0),
        bot_address: fields.bot_address || '',
        skills: skills,
        app_id: fields.app_id || undefined
      };
      console.log("处理后的Role数据:", {...roleData, health: roleData.health.toString(), balance: roleData.balance.toString()});
      return roleData;
    } catch (error) {
      console.error('获取Role数据出错:', error);
      return undefined;
    }
  };

  // 获取NFT数据
  const fetchNftData = async (nftId: string) => {
    try {
      console.log("调用SUI API获取NFT对象:", nftId);
      const response: SuiObjectResponse = await suiClient.getObject({
        id: nftId,
        options: {
          showContent: true,
          showOwner: true,
          showDisplay: true
        }
      });
      console.log("SUI API返回的NFT数据:", response);

      if (!response.data) {
        console.error("SUI API返回的NFT数据为空");
        return { url: '', name: '', description: '', owner: '' };
      }

      // 提取NFT所有者信息 - 这是关键部分
      let owner = '';
      if (response.data.owner) {
        // @ts-ignore - 类型断言处理
        if (response.data.owner.AddressOwner) {
          // @ts-ignore - 类型断言处理
          owner = response.data.owner.AddressOwner;
          console.log("提取到NFT所有者地址:", owner);
        } else {
          console.log("NFT所有者结构:", JSON.stringify(response.data.owner));
        }
      }

      // 正确处理display和content
      let url = '';
      let name = '';
      let description = '';

      // 尝试从display获取
      if (response.data.display) {
        const display = response.data.display;
        // @ts-ignore - 类型断言处理，display的属性可能与类型定义不完全匹配
        url = display.image_url || display.imageUrl || '';
        // @ts-ignore
        name = display.name || '';
        // @ts-ignore
        description = display.description || '';
        console.log("从display中提取NFT数据:", { url, name, description });
      }

      // 如果display中没有数据，尝试从content.fields获取
      if ((!url || !name) && response.data.content && response.data.content.dataType === 'moveObject') {
        // @ts-ignore - 类型断言处理
        const fields = response.data.content.fields as Record<string, any> | undefined;
        if (fields) {
          url = fields.url || '';
          name = fields.name || '';
          description = fields.description || '';
          console.log("从content.fields中提取NFT数据:", { url, name, description });
        }
      }

      // 返回包含所有者信息的NFT数据
      return {
        url,
        name,
        description,
        owner  // 添加所有者信息
      };
    } catch (error) {
      console.error('获取NFT数据出错:', error);
      return { url: '', name: '', description: '', owner: '' };
    }
  };

  // 复制文本到剪贴板
  const handleCopy = (text: string | undefined) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        message.success('复制成功！');
      })
      .catch(() => {
        message.error('复制失败，请重试。');
      });
  };

  // 格式化SUI余额（从MIST转换为SUI）
  const formatSuiBalance = (balance: bigint): string => {
    try {
      if (!balance) return "0";
      const balanceNumber = Number(balance) / 1000000000;
      // 格式化为最多3位小数
      let formattedBalance = balanceNumber.toFixed(3);
      // 移除末尾的0
      formattedBalance = formattedBalance.replace(/\.?0+$/, '');
      return formattedBalance;
    } catch (e) {
      console.error("格式化SUI余额出错:", e);
      return "0";
    }
  };

  // 计算健康度百分比
  const calculateHealthPercentage = (health: bigint): number => {
    try {
      if (!health) return 0;
      // 假设最大健康度为100 SUI (100 * 10^9)
      const maxHealth = BigInt(100) * BigInt(1000000000);
      const percentage = Number((BigInt(health) * BigInt(100)) / maxHealth);
      return Math.min(Math.max(percentage, 0), 100);
    } catch (e) {
      console.error("计算健康度百分比出错:", e);
      return 0;
    }
  };

  // 获取Agent的技能详情
  const fetchAgentSkills = async (skillIds: string[]) => {
    if (!skillIds || skillIds.length === 0) return [];
    
    setSkillsLoading(true);
    try {
      const skills = await Promise.all(
        skillIds.map(async (skillId) => {
          try {
            const response: SuiObjectResponse = await suiClient.getObject({
              id: skillId,
              options: {
                showContent: true,
                showOwner: true
              }
            });

            if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
              return { object_id: skillId, name: '未知技能' };
            }
            
            // @ts-ignore 类型断言处理
            const fields = response.data.content.fields as Record<string, any> | undefined;
            if (!fields) return { object_id: skillId, name: '未知技能' };

            return {
              object_id: skillId,
              name: fields.name,
              description: fields.description,
              fee: fields.fee,
              owner: fields.author
            };
          } catch (error) {
            console.error(`获取技能 ${skillId} 详情出错:`, error);
            return { object_id: skillId, name: '未知技能' };
          }
        })
      );
      
      setAgentSkills(skills);
      return skills;
    } catch (error) {
      console.error('获取Agent技能详情出错:', error);
      return [];
    } finally {
      setSkillsLoading(false);
    }
  };

  // 获取所有可用技能
  const fetchAllSkills = async () => {
    setAllSkillsLoading(true);
    try {
      const response = await apiClient.getSkills();
      
      if (response.success && response.skills) {
        // 获取每个技能的链上详情
        const skillsWithDetails = await Promise.all(
          response.skills.map(async (skill: any) => {
            const details = await getSkillDetails(skill.object_id);
            return { ...skill, ...details };
          })
        );
        
        setAvailableSkills(skillsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      message.error('获取技能列表失败');
    } finally {
      setAllSkillsLoading(false);
    }
  };

  // 获取技能详情
  const getSkillDetails = async (objectId: string): Promise<Partial<Skill>> => {
    try {
      const response: SuiObjectResponse = await suiClient.getObject({
        id: objectId,
        options: {
          showContent: true,
          showOwner: true
        }
      });

      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        return {};
      }
      
      // 安全地获取字段数据
      const content = response.data.content;
      // @ts-ignore 类型断言处理
      const fields = content.fields as Record<string, any> | undefined;
      if (!fields) return {};

      // 提取技能详细信息
      return {
        name: fields.name,
        description: fields.description,
        endpoint: fields.endpoint,
        doc: fields.doc,
        github_repo: fields.github_repo,
        docker_image: fields.docker_image,
        quote: fields.quote,
        log_url: fields.log_url,
        public_key: fields.public_key,
        fee: fields.fee,
        owner: fields.author,
        is_enabled: fields.is_enabled
      };
    } catch (error) {
      console.error('Error fetching skill details:', error);
      return {};
    }
  };

  // 进入技能编辑模式
  const handleEditSkills = async () => {
    // 重置保存状态
    setSavingSkills(false);
    setEditingSkills(true);
    
    // 加载所有技能
    await fetchAllSkills();
    
    // 初始化已选技能
    if (agent?.roleData?.skills) {
      setSelectedSkills([...agent.roleData.skills]);
    }
  };

  // 取消技能编辑
  const handleCancelEdit = () => {
    setEditingSkills(false);
    // 重置保存状态
    setSavingSkills(false);
  };

  // 添加技能到已选列表
  const handleAddSkill = (skillId: string) => {
    if (!selectedSkills.includes(skillId)) {
      setSelectedSkills(prev => [...prev, skillId]);
    }
  };

  // 从已选列表移除技能
  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(prev => prev.filter(id => id !== skillId));
  };

  // 保存技能变更
  const handleSaveSkills = async () => {
    if (!agent || !agent.nft_id || !roleId) {
      message.error('缺少必要的Agent信息');
      return;
    }

    try {
      setSavingSkills(true);
      message.loading('准备提交交易...', 0);
      
      // 创建RoleManager实例
      const roleManager = new RoleManager();
      
      // 创建更新技能的交易
      // @ts-ignore - SDK类型定义问题，实际上updateSkills方法存在
      const tx = await roleManager.updateSkills(
        roleId,
        agent.nft_id,
        selectedSkills
      );
      
      // 提示用户签名
      message.destroy();
      message.loading('请在钱包中确认交易...', 0);
      
      // 使用onSuccess回调确保只有在交易成功后才更新技能列表
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            // 交易成功
            message.destroy();
            message.loading('交易已提交，等待确认...', 0);
            
            // 等待交易确认
            try {
              // 等待交易完成
              await suiClient.waitForTransaction({
                digest: result.digest,
              });
              
              // 交易成功，等待一些时间让区块链数据更新
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // 清空现有技能列表
              setAgentSkills([]);
              
              message.destroy();
              message.loading('正在获取最新角色数据...', 0);
              
              // 从区块链获取最新的角色数据，包括最新的技能列表
              const latestRoleData = await fetchRoleData(roleId);
              
              if (latestRoleData) {
                // 更新agent对象中的roleData和skills
                if (agent.roleData) {
                  agent.roleData.skills = latestRoleData.skills;
                } else {
                  agent.roleData = latestRoleData;
                }
                
                // 重新获取技能详情
                if (latestRoleData.skills && latestRoleData.skills.length > 0) {
                  message.destroy();
                  message.loading('正在获取最新技能数据...', 0);
                  await fetchAgentSkills(latestRoleData.skills);
                } else {
                  setAgentSkills([]);
                }
                
                message.destroy();
                message.success('技能列表已更新');
              } else {
                message.destroy();
                message.warning('无法获取最新角色数据，请刷新页面');
              }
              
              // 退出编辑模式
              setEditingSkills(false);
              // 重置保存按钮状态
              setSavingSkills(false);
            } catch (waitError) {
              message.destroy();
              console.error('等待交易确认失败:', waitError);
              message.error('交易可能已提交，但无法确认状态，请刷新页面检查最新数据');
              setSavingSkills(false);
            }
          },
          onError: (error) => {
            message.destroy();
            console.error('交易执行失败:', error);
            message.error('交易执行失败，技能列表未更新');
            setSavingSkills(false);
          }
        }
      );
    } catch (error) {
      message.destroy();
      console.error('更新技能列表出错:', error);
      message.error('更新技能列表失败');
      setSavingSkills(false);
    }
  };

  // 将费用从MIST转换为SUI
  const formatFee = (fee?: bigint): string => {
    if (!fee) return "0";
    const feeNumber = Number(fee) / 1000000000;
    // 格式化为最多3位小数
    let formattedFee = feeNumber.toFixed(3);
    // 移除末尾的0
    formattedFee = formattedFee.replace(/\.?0+$/, '');
    return formattedFee;
  };

  // 在获取Agent详情后，获取技能详情
  useEffect(() => {
    if (agent && agent.roleData && agent.roleData.skills) {
      fetchAgentSkills(agent.roleData.skills);
    }
  }, [agent?.roleData?.skills]);

  // 渲染证明信息标签页内容
  const renderAttestationTab = () => {
    if (attestationLoading) {
      return <Skeleton active paragraph={{ rows: 10 }} />;
    }
    
    if (!attestation) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: "#9ca3af" }}>
              无法获取CVM证明信息，可能原因：
              <ul style={{ textAlign: "left", marginTop: "10px" }}>
                <li>CVM未部署或离线</li>
                <li>没有App ID信息</li>
                <li>网络连接问题</li>
              </ul>
            </span>
          }
        />
      );
    }
    
    // 验证数据完整性
    if (!attestation.tcb_info) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: "#9ca3af" }}>
              CVM证明信息不完整，缺少TCB信息
            </span>
          }
        />
      );
    }
    
    return (
      <div className="space-y-6">
        {/* TCB信息部分 */}
        <Card
          style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
          headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
          title={
            <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
              <SafetyCertificateOutlined style={{ marginRight: "8px" }} />
              TCB信息
            </Typography.Title>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-gray-700 rounded">
              <span className="text-gray-300">MRTD</span>
              <div className="flex items-center">
                <span className="text-gray-300 text-sm font-mono">{attestation.tcb_info.mrtd || "N/A"}</span>
                {attestation.tcb_info.mrtd && (
                  <CopyOutlined 
                    style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }} 
                    onClick={() => handleCopy(attestation.tcb_info.mrtd)}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-700 rounded">
              <span className="text-gray-300">RootFS Hash</span>
              <div className="flex items-center">
                <span className="text-gray-300 text-sm font-mono">{attestation.tcb_info.rootfs_hash || "N/A"}</span>
                {attestation.tcb_info.rootfs_hash && (
                  <CopyOutlined 
                    style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                    onClick={() => handleCopy(attestation.tcb_info.rootfs_hash)}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-700 rounded">
              <span className="text-gray-300">RTMR0</span>
              <div className="flex items-center">
                <span className="text-gray-300 text-sm font-mono">{attestation.tcb_info.rtmr0 || "N/A"}</span>
                {attestation.tcb_info.rtmr0 && (
                  <CopyOutlined 
                    style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                    onClick={() => handleCopy(attestation.tcb_info.rtmr0)}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-700 rounded">
              <span className="text-gray-300">RTMR1</span>
              <div className="flex items-center">
                <span className="text-gray-300 text-sm font-mono">{attestation.tcb_info.rtmr1 || "N/A"}</span>
                {attestation.tcb_info.rtmr1 && (
                  <CopyOutlined 
                    style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                    onClick={() => handleCopy(attestation.tcb_info.rtmr1)}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-700 rounded">
              <span className="text-gray-300">RTMR2</span>
              <div className="flex items-center">
                <span className="text-gray-300 text-sm font-mono">{attestation.tcb_info.rtmr2 || "N/A"}</span>
                {attestation.tcb_info.rtmr2 && (
                  <CopyOutlined 
                    style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                    onClick={() => handleCopy(attestation.tcb_info.rtmr2)}
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-700 rounded">
              <span className="text-gray-300">RTMR3</span>
              <div className="flex items-center">
                <span className="text-gray-300 text-sm font-mono">{attestation.tcb_info.rtmr3 || "N/A"}</span>
                {attestation.tcb_info.rtmr3 && (
                  <CopyOutlined 
                    style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                    onClick={() => handleCopy(attestation.tcb_info.rtmr3)}
                  />
                )}
              </div>
            </div>
            
            {attestation.tcb_info.event_log && attestation.tcb_info.event_log.length > 0 && (
              <div className="mt-4">
                <Typography.Title level={5} style={{ color: "white", marginBottom: "16px" }}>
                  Event Log
                </Typography.Title>
                <div className="space-y-2">
                  {attestation.tcb_info.event_log.filter(event => event.event).map((event, index: number) => (
                    <div key={index} className="flex justify-between items-center mb-2 p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">{event.event}</span>
                      <div className="flex items-center">
                        <span className="text-gray-300 text-sm font-mono truncate max-w-md">{event.event_payload}</span>
                        <CopyOutlined 
                          style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                          onClick={() => handleCopy(event.event_payload)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
        
        {/* App Compose部分 */}
        {attestation.compose_file && (
          <Card
            style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
            headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
            title={
              <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                <CodeOutlined style={{ marginRight: "8px" }} />
                App Compose
              </Typography.Title>
            }
          >
            <div className="bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-white">
                {attestation.compose_file}
              </pre>
            </div>
          </Card>
        )}
        
        {/* 证书链部分 */}
        {attestation.app_certificates && attestation.app_certificates.length > 0 && (
          <Card 
            style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
            headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
            title={
              <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                <FileTextOutlined style={{ marginRight: "8px" }} />
                证书链
              </Typography.Title>
            }
          >
            {/* 应用证书 */}
            {attestation.app_certificates.filter(cert => cert.position_in_chain === 0).length > 0 && (
              <div className="mb-6">
                <Typography.Title level={5} style={{ color: "white", marginBottom: "16px" }}>
                  App Cert
                </Typography.Title>
                {attestation.app_certificates.filter(cert => cert.position_in_chain === 0).map((cert, index: number) => (
                  <div key={index} className="space-y-4 mt-4">
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Subject</span>
                      <span className="text-gray-300">
                        CN: {cert.subject?.common_name || "N/A"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Issuer</span>
                      <span className="text-gray-300">
                        CN: {cert.issuer?.common_name || "N/A"}
                        <br />
                        O: {cert.issuer?.organization || "N/A"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Validity</span>
                      <span className="text-gray-300">
                        From: {cert.not_before ? new Date(cert.not_before).toLocaleDateString() : "N/A"}
                        <br />
                        To: {cert.not_after ? new Date(cert.not_after).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Serial Number</span>
                      <div className="flex items-center">
                        <span className="text-gray-300 text-sm font-mono">{cert.serial_number || "N/A"}</span>
                        {cert.serial_number && (
                          <CopyOutlined 
                            style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                            onClick={() => handleCopy(cert.serial_number)}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Fingerprint</span>
                      <div className="flex items-center">
                        <span className="text-gray-300 text-sm font-mono">{cert.fingerprint || "N/A"}</span>
                        {cert.fingerprint && (
                          <CopyOutlined 
                            style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                            onClick={() => handleCopy(cert.fingerprint)}
                          />
                        )}
                      </div>
                    </div>
                    
                    {cert.quote && (
                      <>
                        <div className="mb-2">
                          <Button
                            type="primary"
                            style={{ backgroundColor: "#1e40af" }}
                            onClick={() => window.open(`https://ra-quote-explorer.vercel.app/r?hex=${cert.quote}`, '_blank')}
                          >
                            Check Attestation
                          </Button>
                        </div>
                        <div className="p-2 border border-gray-700 rounded bg-gray-800">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">Quote</span>
                            <CopyOutlined 
                              style={{ cursor: "pointer", color: "#9ca3af" }}
                              onClick={() => handleCopy(cert.quote || "")}
                            />
                          </div>
                          <div className="bg-gray-900 p-2 mt-2 rounded overflow-auto max-h-32">
                            <span className="text-gray-300 text-xs font-mono break-all">{cert.quote}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* KMS证书 */}
            {attestation.app_certificates.filter(cert => cert.position_in_chain === 1).length > 0 && (
              <div>
                <Typography.Title level={5} style={{ color: "white", marginBottom: "16px" }}>
                  KMS Cert
                </Typography.Title>
                {attestation.app_certificates.filter(cert => cert.position_in_chain === 1).map((cert, index: number) => (
                  <div key={index} className="space-y-4 mt-4">
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Subject</span>
                      <span className="text-gray-300">
                        CN: {cert.subject?.common_name || "N/A"}
                        <br />
                        O: {cert.subject?.organization || "N/A"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Issuer</span>
                      <span className="text-gray-300">
                        CN: {cert.issuer?.common_name || "N/A"}
                        <br />
                        O: {cert.issuer?.organization || "N/A"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Validity</span>
                      <span className="text-gray-300">
                        From: {cert.not_before ? new Date(cert.not_before).toLocaleDateString() : "N/A"}
                        <br />
                        To: {cert.not_after ? new Date(cert.not_after).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Serial Number</span>
                      <div className="flex items-center">
                        <span className="text-gray-300 text-sm font-mono">{cert.serial_number || "N/A"}</span>
                        {cert.serial_number && (
                          <CopyOutlined 
                            style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                            onClick={() => handleCopy(cert.serial_number)}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-2 border border-gray-700 rounded bg-gray-800">
                      <span className="text-gray-300">Fingerprint</span>
                      <div className="flex items-center">
                        <span className="text-gray-300 text-sm font-mono">{cert.fingerprint || "N/A"}</span>
                        {cert.fingerprint && (
                          <CopyOutlined 
                            style={{ cursor: "pointer", marginLeft: "8px", color: "#9ca3af" }}
                            onClick={() => handleCopy(cert.fingerprint)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  };

  // 渲染CVM Overview标签页内容
  const renderCvmOverviewTab = () => {
    if (cvmStatsLoading) {
      return <Skeleton active paragraph={{ rows: 10 }} />;
    }
    
    if (!cvmStats) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: "#9ca3af" }}>
              无法获取CVM系统状态信息，可能原因：
              <ul style={{ textAlign: "left", marginTop: "10px" }}>
                <li>CVM未部署或离线</li>
                <li>没有App ID信息</li>
                <li>网络连接问题</li>
              </ul>
            </span>
          }
        />
      );
    }
    
    // 计算内存使用百分比
    const memoryUsagePercent = cvmStats.sysinfo.total_memory > 0 ? 
      (cvmStats.sysinfo.used_memory / cvmStats.sysinfo.total_memory) * 100 : 0;
    
    // 获取主磁盘信息
    const mainDisk = cvmStats.sysinfo.disks && cvmStats.sysinfo.disks.length > 0 ? 
      cvmStats.sysinfo.disks[0] : null;
    
    // 计算磁盘使用百分比
    const diskUsagePercent = mainDisk && mainDisk.total_size > 0 ? 
      ((mainDisk.total_size - mainDisk.free_size) / mainDisk.total_size) * 100 : 0;
    
    // 格式化内存值为GB
    const bytesToGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(2);
    
    // 格式化运行时间
    const formatUptime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    };
    
    return (
      <div className="space-y-6">
        <Row gutter={16}>
          {/* 系统信息 */}
          <Col span={8}>
            <Card
              style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
              headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
              title={
                <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                  System Info
                </Typography.Title>
              }
            >
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-gray-400">Operating System</span>
                  <span className="text-white text-lg">{cvmStats.sysinfo.os_name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">DStack</span>
                  <span className="text-white text-lg">{cvmStats.sysinfo.os_version}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">CPU</span>
                  <span className="text-white text-lg">{cvmStats.sysinfo.num_cpus} vCPUs</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-400">Uptime</span>
                  <span className="text-white text-lg">{formatUptime(cvmStats.sysinfo.uptime)}</span>
                </div>
              </div>
            </Card>
          </Col>
          
          {/* 内存使用 */}
          <Col span={8}>
            <Card
              style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
              headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
              title={
                <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                  Memory Usage
                </Typography.Title>
              }
            >
              <div className="space-y-4">
                <Progress 
                  percent={memoryUsagePercent} 
                  showInfo={false}
                  strokeColor="#10B981"
                  trailColor="#6B7280"
                />
                <div className="text-white text-center">
                  Used: {bytesToGB(cvmStats.sysinfo.used_memory)} GB / {bytesToGB(cvmStats.sysinfo.total_memory)} GB ({memoryUsagePercent.toFixed(1)}%)
                </div>
              </div>
            </Card>
          </Col>
          
          {/* 存储 */}
          <Col span={8}>
            <Card
              style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
              headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
              title={
                <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                  Storage
                </Typography.Title>
              }
            >
              <div className="space-y-4">
                {mainDisk ? (
                  <>
                    <Progress 
                      percent={diskUsagePercent} 
                      showInfo={false}
                      strokeColor="#10B981"
                      trailColor="#6B7280"
                    />
                    <div className="text-white text-center">
                      Free: {bytesToGB(mainDisk.free_size)} GB / {bytesToGB(mainDisk.total_size)} GB
                    </div>
                  </>
                ) : (
                  <div className="text-white text-center">
                    No disk information available
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
          style={{ color: "#d1d5db", marginBottom: "16px" }}
        >
          返回
        </Button>

        {loading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : agent ? (
          <div className="flex flex-col gap-6">
            {/* Agent名称和基本信息 */}
            <Card
              style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
              headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
              title={
                <Typography.Title level={2} style={{ color: "white", margin: 0 }}>
                  {agent.name || agent.nftData?.name || "未命名Agent"}
                  {attestation ? 
                    (attestation.is_online ? 
                      <Tag color="success" style={{ marginLeft: 12 }}>在线</Tag> : 
                      <Tag color="error" style={{ marginLeft: 12 }}>离线</Tag>)
                    : 
                    (agent.roleData?.is_active ? 
                      <Tag color="success" style={{ marginLeft: 12 }}>已激活</Tag> : 
                      <Tag color="error" style={{ marginLeft: 12 }}>未激活</Tag>)
                  }
                  {agent.roleData?.is_locked && 
                    <Tag color="warning" style={{ marginLeft: 12 }}>已锁定</Tag>
                  }
                </Typography.Title>
              }
            >
              {/* 内容区域使用Flex布局，图片放在左侧 */}
              <div className="flex flex-wrap">
                {/* 左侧NFT图片区域 */}
                <div className="w-full md:w-1/4 pr-0 md:pr-6 mb-6 md:mb-0">
                  {agent.nftData?.url && agent.nftData.url.length > 0 ? (
                    <img 
                      src={agent.nftData.url} 
                      alt="Agent NFT" 
                      style={{ 
                        width: "100%",
                        maxWidth: "180px",
                        maxHeight: "180px",
                        borderRadius: "8px", 
                        border: "1px solid #374151",
                        objectFit: "cover"
                      }} 
                      onError={(e) => {
                        console.error("图片加载失败:", agent.nftData?.url);
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/180?text=Agent+NFT";
                      }}
                    />
                  ) : (
                    <img 
                      src="https://via.placeholder.com/180?text=Agent+NFT" 
                      alt="Agent NFT Placeholder" 
                      style={{ 
                        width: "100%",
                        maxWidth: "180px",
                        maxHeight: "180px",
                        borderRadius: "8px", 
                        border: "1px solid #374151",
                        objectFit: "cover"
                      }}
                    />
                  )}
                </div>
                
                {/* 右侧信息区域 */}
                <div className="w-full md:w-3/4">
                  <Typography.Paragraph style={{ color: "#d1d5db", fontSize: "16px", marginBottom: "24px" }}>
                    {agent.description || agent.nftData?.description || "无描述"}
                  </Typography.Paragraph>
                  
                  {/* 健康度指示器 */}
                  {agent.roleData?.health !== undefined && Number(agent.roleData.health) > 0 && (
                    <div className="mb-6">
                      <div className="flex justify-between mb-2">
                        <Typography.Text style={{ color: "#d1d5db" }}>健康度</Typography.Text>
                        <Typography.Text style={{ color: "#d1d5db" }}>
                          {Number(agent.roleData.health) / 1000000000} 点
                        </Typography.Text>
                      </div>
                      <Progress 
                        percent={calculateHealthPercentage(agent.roleData.health)} 
                        status={
                          calculateHealthPercentage(agent.roleData.health) > 50 ? "success" : 
                          calculateHealthPercentage(agent.roleData.health) > 20 ? "normal" : "exception"
                        }
                        strokeColor={
                          calculateHealthPercentage(agent.roleData.health) > 50 ? "#52c41a" : 
                          calculateHealthPercentage(agent.roleData.health) > 20 ? "#1890ff" : "#ff4d4f"
                        }
                      />
                    </div>
                  )}
                  
                  {/* SUI余额 */}
                  {agent.roleData?.balance !== undefined && Number(agent.roleData.balance) > 0 && (
                    <div className="mb-6 flex justify-between items-center">
                      <Typography.Text style={{ color: "#d1d5db", fontSize: "16px" }}>
                        <WalletOutlined style={{ marginRight: "8px" }} />
                        SUI余额
                      </Typography.Text>
                      <Tag color="#1e40af" style={{ fontSize: "14px" }}>
                        {formatSuiBalance(agent.roleData.balance)} SUI
                      </Tag>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 标签页切换 */}
              <Tabs
                activeKey={activeTabKey}
                onChange={setActiveTabKey}
                style={{ marginTop: "20px" }}
                className="custom-dark-tabs"
                tabBarStyle={{ color: "white", fontWeight: "bold" }}
                items={[
                  {
                    key: "info",
                    label: <span style={{ color: "white", fontWeight: "bold" }}>基本信息</span>,
                    children: (
                      <>
                        {/* 详细信息区域 - 独立占据整行 */}
                        <Descriptions
                          bordered
                          column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}
                          labelStyle={{ color: "#9ca3af", backgroundColor: "#111827" }}
                          contentStyle={{ color: "#d1d5db", backgroundColor: "#1f2937" }}
                          style={{ marginTop: "24px" }}
                        >
                          {/* Role ID */}
                          <Descriptions.Item label="Role ID" span={3}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ wordBreak: "break-all" }}>{agent.role_id}</span>
                              <CopyOutlined 
                                style={{ cursor: "pointer", marginLeft: "8px" }} 
                                onClick={() => handleCopy(agent.role_id)}
                              />
                            </div>
                          </Descriptions.Item>
                          
                          {/* NFT ID */}
                          <Descriptions.Item label="NFT ID" span={3}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ wordBreak: "break-all" }}>{agent.nft_id}</span>
                              <CopyOutlined 
                                style={{ cursor: "pointer", marginLeft: "8px" }} 
                                onClick={() => handleCopy(agent.nft_id)}
                              />
                            </div>
                          </Descriptions.Item>
                          
                          {/* 钱包地址 */}
                          <Descriptions.Item label="钱包地址" span={3}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ wordBreak: "break-all" }}>{agent.address}</span>
                              <CopyOutlined 
                                style={{ cursor: "pointer", marginLeft: "8px" }} 
                                onClick={() => handleCopy(agent.address)}
                              />
                            </div>
                          </Descriptions.Item>
                          
                          {/* App ID - 新增显示 */}
                          {agent.roleData?.app_id && (
                            <Descriptions.Item label="App ID" span={3}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ wordBreak: "break-all" }}>{agent.roleData.app_id}</span>
                                <CopyOutlined 
                                  style={{ cursor: "pointer", marginLeft: "8px" }} 
                                  onClick={() => handleCopy(agent.roleData?.app_id)}
                                />
                              </div>
                            </Descriptions.Item>
                          )}
                          
                          {/* 所有者 */}
                          <Descriptions.Item label="所有者" span={3}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ wordBreak: "break-all" }}>{agent.nftData?.owner || "未知"}</span>
                              {agent.nftData?.owner && (
                                <CopyOutlined 
                                  className="copy-icon" 
                                  onClick={() => handleCopy(agent.nftData?.owner)}
                                />
                              )}
                            </div>
                          </Descriptions.Item>
                          
                          {/* 创建时间 */}
                          {agent.created_at && !agent.created_at.includes('1970') && (
                            <Descriptions.Item label="创建时间" span={3}>
                              {new Date(agent.created_at).toLocaleString()}
                            </Descriptions.Item>
                          )}
                          
                          {/* 最后更新纪元 */}
                          <Descriptions.Item label="最后更新纪元" span={3}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <ClockCircleOutlined style={{ marginRight: "8px" }} />
                              {agent.roleData?.last_epoch ? String(agent.roleData.last_epoch) : "未知"}
                            </div>
                          </Descriptions.Item>
                          
                          {/* 不活跃纪元数 */}
                          <Descriptions.Item label="不活跃纪元数" span={3}>
                            {agent.roleData?.inactive_epochs ? String(agent.roleData.inactive_epochs) : "0"}
                          </Descriptions.Item>
                        </Descriptions>
                      </>
                    ),
                  },
                  {
                    key: "cvm-overview",
                    label: <span style={{ color: "white", fontWeight: "bold" }}><DashboardOutlined style={{ marginRight: "8px" }} />CVM Overview</span>,
                    children: renderCvmOverviewTab(),
                  },
                  {
                    key: "attestation",
                    label: <span style={{ color: "white", fontWeight: "bold" }}>CVM证明</span>,
                    children: renderAttestationTab(),
                  }
                ]}
              />
            </Card>
            
            {/* 技能列表卡片 */}
            <Card
              style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
              headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
              title={
                <div className="flex justify-between items-center">
                  <Typography.Title level={3} style={{ color: "white", margin: 0 }}>
                    <ToolOutlined style={{ marginRight: "8px" }} />
                    技能列表
                  </Typography.Title>
                  {/* 技能管理按钮 - 仅对NFT所有者显示 */}
                  {currentAccount && agent.nftData?.owner === currentAccount.address && !editingSkills && (
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={handleEditSkills}
                    >
                      管理技能
                    </Button>
                  )}
                  
                  {/* 保存/取消按钮 - 编辑模式下显示 */}
                  {editingSkills && (
                    <Space>
                      <Button onClick={handleCancelEdit}>
                        取消
                      </Button>
                      <Button 
                        type="primary" 
                        icon={<SaveOutlined />} 
                        onClick={handleSaveSkills}
                        loading={savingSkills}
                      >
                        保存
                      </Button>
                    </Space>
                  )}
                </div>
              }
            >
              {/* 非编辑模式 - 显示当前技能列表 */}
              {!editingSkills ? (
                skillsLoading ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : agentSkills.length > 0 ? (
                  <List
                    dataSource={agentSkills}
                    renderItem={skill => (
                      <List.Item
                        key={skill.object_id}
                        className="border-b border-gray-700 py-3 last:border-b-0"
                      >
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <Typography.Text style={{ color: "white", fontSize: "16px" }}>
                              {skill.name || "未命名技能"}
                            </Typography.Text>
                            {skill.description && (
                              <Typography.Paragraph style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>
                                {skill.description}
                              </Typography.Paragraph>
                            )}
                          </div>
                          <Button 
                            type="link" 
                            onClick={() => navigate(`/skill/${skill.object_id}`)}
                          >
                            查看详情
                          </Button>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty 
                    description={
                      <span style={{ color: "#9ca3af" }}>
                        该Agent尚未添加任何技能
                      </span>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  />
                )
              ) : (
                /* 编辑模式 - 左右两栏布局 */
                <Row gutter={24}>
                  {/* 左侧 - 已选技能 */}
                  <Col span={12}>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <Typography.Title level={4} style={{ color: "white", marginBottom: "16px" }}>
                        已选择的技能
                      </Typography.Title>
                      
                      {selectedSkills.length === 0 ? (
                        <Empty 
                          description={<span style={{ color: "#9ca3af" }}>尚未选择任何技能</span>}
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                      ) : (
                        <List
                          dataSource={[...agentSkills, ...availableSkills]
                            .filter((skill, index, self) => 
                              // 确保不重复
                              selectedSkills.includes(skill.object_id) && 
                              index === self.findIndex(s => s.object_id === skill.object_id)
                            )}
                          renderItem={skill => (
                            <List.Item
                              key={skill.object_id}
                              className="border border-gray-700 rounded-lg mb-2 hover:bg-gray-700 transition-all"
                            >
                              <div className="flex justify-between items-center w-full p-2">
                                <div>
                                  <Typography.Text style={{ color: "white", fontSize: "14px" }}>
                                    {skill.name || "未命名技能"}
                                  </Typography.Text>
                                  <div className="text-gray-400 text-xs mt-1">
                                    费用: {formatFee(skill.fee)} SUI
                                  </div>
                                </div>
                                <Button 
                                  type="text"
                                  icon={<ArrowRightOutlined />}
                                  onClick={() => handleRemoveSkill(skill.object_id)}
                                />
                              </div>
                            </List.Item>
                          )}
                        />
                      )}
                    </div>
                  </Col>
                  
                  {/* 右侧 - 可用技能 */}
                  <Col span={12}>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <Typography.Title level={4} style={{ color: "white", marginBottom: "16px" }}>
                        可用技能
                      </Typography.Title>
                      
                      {allSkillsLoading ? (
                        <Skeleton active paragraph={{ rows: 3 }} />
                      ) : (
                        <List
                          dataSource={[...agentSkills, ...availableSkills]
                            .filter((skill, index, self) => 
                              // 只显示未选择的技能，并确保不重复
                              !selectedSkills.includes(skill.object_id) && 
                              index === self.findIndex(s => s.object_id === skill.object_id)
                            )}
                          renderItem={skill => (
                            <List.Item
                              key={skill.object_id}
                              className="border border-gray-700 rounded-lg mb-2 hover:bg-gray-700 transition-all"
                            >
                              <div className="flex justify-between items-center w-full p-2">
                                <Button 
                                  type="text"
                                  icon={<ArrowLeft />}
                                  onClick={() => handleAddSkill(skill.object_id)}
                                />
                                <div className="text-right">
                                  <Typography.Text style={{ color: "white", fontSize: "14px" }}>
                                    {skill.name || "未命名技能"}
                                  </Typography.Text>
                                  <div className="text-gray-400 text-xs mt-1">
                                    费用: {formatFee(skill.fee)} SUI
                                  </div>
                                </div>
                              </div>
                            </List.Item>
                          )}
                        />
                      )}
                    </div>
                  </Col>
                </Row>
              )}
            </Card>
          </div>
        ) : (
          <Typography.Text style={{ color: "#d1d5db", fontSize: "16px" }}>
            未找到Agent信息
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

export default AgentDetail; 