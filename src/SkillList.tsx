import React, { useEffect, useState } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { type SuiObjectResponse } from '@mysten/sui/client';
import { List, Card, Typography, Image, Alert, Tooltip, message, Skeleton, Button, Tag, Space } from 'antd';
import { GithubOutlined, BookOutlined, DatabaseOutlined, LineChartOutlined, CopyOutlined, InfoCircleOutlined } from '@ant-design/icons';
import './styles.css';
import { apiClient } from './api/apiClient';
import { useNavigate } from 'react-router-dom';
import { getDocUrl } from './utils/linkUtils';

// 技能类型定义
interface Skill {
  id?: number;
  object_id: string;
  created_at?: string;
  // 从链上获取的数据
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
}

export function SkillList() {
  const currentAccount = useCurrentAccount();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const suiClient = useSuiClient();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      // 从后端获取技能列表
      const response = await apiClient.getSkills();
      
      if (response.success && response.skills) {
        // 获取每个技能的链上详情
        const skillsWithDetails = await Promise.all(
          response.skills.map(async (skill: Skill) => {
            const details = await getSkillDetails(skill.object_id);
            return { ...skill, ...details };
          })
        );
        
        setSkills(skillsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
      message.error('获取技能列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 将费用从MIST转换为SUI（最多三位小数，去除末尾0）
  const formatFee = (fee?: bigint): string => {
    if (!fee) return "0";
    const feeNumber = Number(fee) / 1000000000;
    // 格式化为最多3位小数
    let formattedFee = feeNumber.toFixed(3);
    // 移除末尾的0
    formattedFee = formattedFee.replace(/\.?0+$/, '');
    return formattedFee;
  };

  // 从智能合约中正确获取作者地址
  const getAuthorFromFields = (fields: Record<string, any> | undefined): string | undefined => {
    if (!fields || !fields.author) return undefined;
    return fields.author;
  };

  const getSkillDetails = async (objectId: string): Promise<Partial<Skill>> => {
    try {
      const response: SuiObjectResponse = await suiClient.getObject({
        id: objectId,
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

      // 获取作者地址
      const author = getAuthorFromFields(fields);

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
        owner: author
      };
    } catch (error) {
      console.error('Error fetching skill details:', error);
      return {};
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

  // 如果是docker image，添加DockerHub前缀，并去除版本号
  const getDockerUrl = (image?: string): string => {
    if (!image) return "#";
    // 去除版本号（冒号后面的部分）
    const imageWithoutTag = image.split(':')[0];
    return `https://hub.docker.com/r/${imageWithoutTag}`;
  };

  // 处理查看技能详情
  const handleViewSkillDetails = (skillId: string) => {
    navigate(`/skill/${skillId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <Typography.Title
          level={2}
          style={{ color: "white" }}
          className="text-center font-bold text-2xl mb-8"
        >
          Skills Marketplace
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
            dataSource={skills}
            renderItem={(skill) => (
              <List.Item>
                <Card
                  className="hover:bg-gray-800 transition-all duration-300 rounded-xl shadow-lg border-gray-700"
                  bodyStyle={{ padding: 0 }}
                  style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
                  title={
                    <Typography.Title level={4} style={{ color: "white", margin: 0 }}>
                      {skill.name || "未命名技能"}
                    </Typography.Title>
                  }
                  headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-4">
                      {/* 技能描述 - 添加悬浮提示 */}
                      <Tooltip 
                        title={skill.description} 
                        placement="top"
                        color="#111827"
                        overlayInnerStyle={{ color: "#d1d5db" }}
                      >
                        <Typography.Paragraph 
                          ellipsis={{ rows: 2 }}
                          style={{ color: "#d1d5db", cursor: "help" }}
                        >
                          {skill.description || "无描述"}
                        </Typography.Paragraph>
                      </Tooltip>
                      
                      {/* 技能费用 */}
                      <div className="flex items-center justify-between">
                        <Typography.Text style={{ color: "#d1d5db" }}>
                          费用:
                        </Typography.Text>
                        <Tag color="#1e40af">{formatFee(skill.fee)} SUI</Tag>
                      </div>
                      
                      {/* 技能创建者 */}
                      <div className="flex items-center justify-between">
                        <Typography.Text style={{ color: "#d1d5db" }}>
                          创建者:
                        </Typography.Text>
                        <Tooltip title={skill.owner}>
                          <Typography.Text
                            style={{ color: "#d1d5db", cursor: "pointer" }}
                            onClick={() => handleCopy(skill.owner || "")}
                          >
                            {skill.owner ? 
                              `${skill.owner.substring(0, 6)}...${skill.owner.substring(skill.owner.length - 4)}` : 
                              "未知"
                            }
                            <CopyOutlined style={{ marginLeft: "5px" }} />
                          </Typography.Text>
                        </Tooltip>
                      </div>
                      
                      {/* 技能链接 */}
                      <div className="flex justify-between items-center mt-4">
                        <Space size="middle">
                          {skill.github_repo && (
                            <Tooltip title="GitHub 仓库">
                              <a 
                                href={skill.github_repo} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="icon-link"
                              >
                                <GithubOutlined style={{ fontSize: '20px', color: "#93c5fd" }} />
                              </a>
                            </Tooltip>
                          )}
                          
                          {skill.doc && (
                            <Tooltip title="文档">
                              <a 
                                href={getDocUrl(skill.doc)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="icon-link"
                              >
                                <BookOutlined style={{ fontSize: '20px', color: "#93c5fd" }} />
                              </a>
                            </Tooltip>
                          )}
                          
                          {skill.docker_image && (
                            <Tooltip title="Docker 镜像">
                              <a 
                                href={getDockerUrl(skill.docker_image)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="icon-link"
                              >
                                <DatabaseOutlined style={{ fontSize: '20px', color: "#93c5fd" }} />
                              </a>
                            </Tooltip>
                          )}
                          
                          {skill.log_url && (
                            <Tooltip title="日志">
                              <a 
                                href={skill.log_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="icon-link"
                              >
                                <LineChartOutlined style={{ fontSize: '20px', color: "#93c5fd" }} />
                              </a>
                            </Tooltip>
                          )}
                        </Space>

                        {/* 修改查看详情按钮，使用带文字的按钮而不是图标 */}
                        <Button 
                          type="primary"
                          size="small"
                          onClick={() => handleViewSkillDetails(skill.object_id)}
                          style={{ backgroundColor: "#3b82f6", borderColor: "#2563eb" }}
                        >
                          查看详情
                        </Button>
                      </div>
                      
                      {/* Skill ID */}
                      <div className="mt-2">
                        <Tooltip title={skill.object_id}>
                          <Typography.Text
                            style={{ color: "#6b7280", fontSize: "12px", cursor: "pointer" }}
                            onClick={() => handleCopy(skill.object_id)}
                          >
                            ID: {skill.object_id.substring(0, 8)}...{skill.object_id.substring(skill.object_id.length - 8)}
                            <CopyOutlined style={{ marginLeft: "5px" }} />
                          </Typography.Text>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
}

export default SkillList; 