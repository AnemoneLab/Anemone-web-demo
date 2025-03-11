import React, { useEffect, useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { useParams, useNavigate } from 'react-router-dom';
import { type SuiObjectResponse } from '@mysten/sui/client';
import { Typography, Skeleton, Button, Descriptions, Card, Tag, Divider, message, Tooltip } from 'antd';
import { ArrowLeftOutlined, GithubOutlined, DatabaseOutlined, LineChartOutlined, CopyOutlined, SafetyOutlined } from '@ant-design/icons';
import { getDocUrl } from './utils/linkUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import './styles.css';

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
  fee?: bigint;
  author?: string;
  is_enabled?: boolean;
}

export function SkillDetail() {
  const { skillId } = useParams<{ skillId: string }>();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loadingDoc, setLoadingDoc] = useState(false);
  const navigate = useNavigate();
  const suiClient = useSuiClient();

  useEffect(() => {
    if (skillId) {
      fetchSkillDetails(skillId);
    }
  }, [skillId]);

  const fetchSkillDetails = async (objectId: string) => {
    setLoading(true);
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
        message.error('无法获取技能详情');
        return;
      }
      
      // 安全地获取字段数据
      const content = response.data.content;
      // @ts-ignore 类型断言处理，确保能够正确访问moveObject的fields
      const fields = content.fields as Record<string, any> | undefined;
      if (!fields) {
        message.error('无法获取技能字段');
        return;
      }

      // 提取技能详细信息
      const skillData: Skill = {
        object_id: objectId,
        name: fields.name,
        description: fields.description,
        endpoint: fields.endpoint,
        doc: fields.doc,
        github_repo: fields.github_repo,
        docker_image: fields.docker_image,
        quote: fields.quote,
        log_url: fields.log_url,
        fee: fields.fee,
        author: fields.author,
        is_enabled: fields.is_enabled
      };

      setSkill(skillData);

      // 如果有文档链接，加载文档内容
      if (skillData.doc) {
        fetchDocContent(getDocUrl(skillData.doc));
      }
    } catch (error) {
      console.error('Error fetching skill details:', error);
      message.error('获取技能详情时出错');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocContent = async (docUrl: string) => {
    setLoadingDoc(true);
    try {
      // 如果是GitHub链接，需要转换为raw链接来获取内容
      let fetchUrl = docUrl;
      
      // 处理GitHub网页链接，转换为raw链接来获取内容
      // 例如: https://github.com/AnemoneLab/Anemone-skill/blob/main/rex-swap/skilldoc.md
      // 转换为: https://raw.githubusercontent.com/AnemoneLab/Anemone-skill/main/rex-swap/skilldoc.md
      if (docUrl.includes('github.com') && docUrl.includes('/blob/')) {
        fetchUrl = docUrl
          .replace('github.com', 'raw.githubusercontent.com')
          .replace('/blob/', '/');
      }
      
      const response = await fetch(fetchUrl);
      const content = await response.text();
      setMarkdownContent(content);
    } catch (error) {
      console.error('Error fetching markdown content:', error);
      message.error('无法加载文档内容');
    } finally {
      setLoadingDoc(false);
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

  // 获取Docker Hub链接（去除版本号）
  const getDockerUrl = (image?: string): string => {
    if (!image) return "#";
    // 去除版本号（冒号后面的部分）
    const imageWithoutTag = image.split(':')[0];
    return `https://hub.docker.com/r/${imageWithoutTag}`;
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
        ) : skill ? (
          <div className="flex flex-col gap-6">
            {/* 技能标题和基本信息 */}
            <Card
              style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
              headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
              title={
                <Typography.Title level={2} style={{ color: "white", margin: 0 }}>
                  {skill.name || "未命名技能"}
                  {skill.is_enabled ? 
                    <Tag color="success" style={{ marginLeft: 12 }}>已启用</Tag> : 
                    <Tag color="error" style={{ marginLeft: 12 }}>已禁用</Tag>
                  }
                </Typography.Title>
              }
            >
              <Typography.Paragraph style={{ color: "#d1d5db", fontSize: "16px", marginBottom: "24px" }}>
                {skill.description || "无描述"}
              </Typography.Paragraph>
              
              <Descriptions
                bordered
                column={{ xxl: 4, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}
                labelStyle={{ color: "#9ca3af", backgroundColor: "#111827" }}
                contentStyle={{ color: "#d1d5db", backgroundColor: "#1f2937" }}
              >
                <Descriptions.Item label="技能ID" span={2}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ wordBreak: "break-all" }}>{skill.object_id}</span>
                    <CopyOutlined 
                      style={{ cursor: "pointer", marginLeft: "8px" }} 
                      onClick={() => handleCopy(skill.object_id)}
                    />
                  </div>
                </Descriptions.Item>
                
                <Descriptions.Item label="创建者" span={2}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{skill.author || "未知"}</span>
                    {skill.author && (
                      <CopyOutlined 
                        style={{ cursor: "pointer", marginLeft: "8px" }} 
                        onClick={() => handleCopy(skill.author || "")}
                      />
                    )}
                  </div>
                </Descriptions.Item>
                
                <Descriptions.Item label="费用" span={2}>
                  <Tag color="#1e40af" style={{ fontSize: "14px" }}>{formatFee(skill.fee)} SUI</Tag>
                </Descriptions.Item>
                
                <Descriptions.Item label="端点" span={2}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ wordBreak: "break-all" }}>{skill.endpoint || "无"}</span>
                    {skill.endpoint && (
                      <CopyOutlined 
                        style={{ cursor: "pointer", marginLeft: "8px" }} 
                        onClick={() => handleCopy(skill.endpoint || "")}
                      />
                    )}
                  </div>
                </Descriptions.Item>
              </Descriptions>
              
              {/* 链接区域 */}
              <div className="flex flex-wrap gap-4 mt-6">
                {skill.github_repo && (
                  <a 
                    href={skill.github_repo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded bg-gray-800 text-blue-300 hover:bg-gray-700"
                  >
                    <GithubOutlined style={{ marginRight: "8px" }} />
                    GitHub 仓库
                  </a>
                )}
                
                {skill.docker_image && (
                  <a 
                    href={getDockerUrl(skill.docker_image)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded bg-gray-800 text-blue-300 hover:bg-gray-700"
                  >
                    <DatabaseOutlined style={{ marginRight: "8px" }} />
                    Docker 镜像
                  </a>
                )}
                
                {skill.log_url && (
                  <a 
                    href={skill.log_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded bg-gray-800 text-blue-300 hover:bg-gray-700"
                  >
                    <LineChartOutlined style={{ marginRight: "8px" }} />
                    日志
                  </a>
                )}
                
                {skill.quote && (
                  <a 
                    href={`https://ra-quote-explorer.vercel.app/r?hex=${encodeURIComponent(skill.quote)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded bg-gray-800 text-green-300 hover:bg-gray-700"
                  >
                    <SafetyOutlined style={{ marginRight: "8px" }} />
                    Check Attestation
                  </a>
                )}
              </div>
            </Card>
            
            {/* 技能文档 */}
            {skill.doc && (
              <Card
                style={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
                headStyle={{ backgroundColor: "#111827", borderBottom: "1px solid #374151" }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography.Title level={3} style={{ color: "white", margin: 0 }}>
                      技能文档
                    </Typography.Title>
                    <a 
                      href={getDocUrl(skill.doc)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 rounded bg-gray-800 text-blue-300 hover:bg-gray-700"
                    >
                      在GitHub上查看
                    </a>
                  </div>
                }
              >
                {loadingDoc ? (
                  <Skeleton active paragraph={{ rows: 10 }} />
                ) : markdownContent ? (
                  <div className="markdown-container" style={{ backgroundColor: "#1f2937", color: "#d1d5db" }}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {markdownContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Typography.Text style={{ color: "#d1d5db" }}>无法加载文档内容</Typography.Text>
                )}
              </Card>
            )}
          </div>
        ) : (
          <Typography.Text style={{ color: "#d1d5db", fontSize: "16px" }}>
            未找到技能信息
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

export default SkillDetail; 