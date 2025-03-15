import { Box, Flex, Text, Button } from "@radix-ui/themes";
import { useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { RoleManager } from '@anemonelab/sui-sdk';
import { useParams } from 'react-router-dom';
import React from 'react';
import { notification } from 'antd';
import { AvatarIcon, DownloadIcon, UploadIcon } from "@radix-ui/react-icons";
import 'antd';

interface AgentInfo {
  name: string;
  description: string;
  url: string;
  balance: string;
}

export function AgentSidebar() {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("1");
  const [showDepositInput, setShowDepositInput] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("1");
  const [showWithdrawInput, setShowWithdrawInput] = useState(false);
  const roleManager = new RoleManager();
  const { roleId } = useParams();
  
  // 获取 nftId 的查询
  const { data: nftData } = useQuery({
    queryKey: ['nftId', roleId],
    queryFn: async () => {
      if (!roleId) return null;
      const response = await fetch(`http://localhost:3000/agent/nft-id/${roleId}`);
      const data = await response.json();
      return data.success ? data.nft_id : null;
    },
    enabled: !!roleId
  });

  // Agent 信息查询
  const { data: agentInfo, refetch } = useQuery<AgentInfo | null>({
    queryKey: ['agentInfo', roleId, nftData],
    queryFn: async () => {
      if (!roleId || !nftData) return null;

      const [roleData, nftObjData] = await Promise.all([
        suiClient.getObject({
          id: roleId,
          options: { showContent: true }
        }),
        suiClient.getObject({
          id: nftData,
          options: { showContent: true }
        })
      ]);

      const balance = (roleData.data?.content as any)?.fields?.balance || "0";
      const nftFields = (nftObjData.data?.content as any)?.fields;
      
      return {
        name: nftFields?.name || "Unknown",
        description: nftFields?.description || "No description",
        url: nftFields?.url || "https://placeholder.com/avatar.png",
        balance: (Number(balance) / 1e9).toFixed(2)
      };
    },
    enabled: !!roleId && !!nftData
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // 重新获取 agentInfo 的逻辑
      refetch(); // 假设您有一个 refetch 函数来重新获取 agentInfo
    }, 2000); // 每 2 秒刷新一次

    return () => clearInterval(interval); // 清理定时器
  }, []); // 空依赖数组，确保只在组件挂载时设置定时器

  const handleDepositAmountChange = (value: string) => {
    // 只允许数字和小数点
    const filtered = value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    // 限制小数位数为9位
    if (parts[1] && parts[1].length > 9) {
      return;
    }
    setDepositAmount(filtered);
  };

  const openNotification = (message: string, type: 'success' | 'error') => {
    notification[type]({
      message: type === 'success' ? 'success' : 'fail',
      description: message,
      placement: 'topRight',
      duration: 3,
    });
  };

  const handleDeposit = async () => {
    try {
      if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0 || !roleId) {
        return;
      }

      setIsDepositing(true);
      
      const amountInMist = BigInt(Math.floor(Number(depositAmount) * 1e9));
      
      const tx = await roleManager.depositSui(
        roleId,
        amountInMist
      );

      await signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            openNotification("Deposit successful!", "success");
            await suiClient.waitForTransaction({
              digest: result.digest,
            });
            setIsDepositing(false);
          },
          onError: (error: any) => {
            console.error('Deposit failed:', error);
            openNotification("Deposit failed: " + error.message, "error");
            setIsDepositing(false);
          },
        }
      );

      await refetch();
      setDepositAmount("1");
    } catch (error: any) {
      console.error('Deposit failed:', error);
      openNotification("Deposit failed: " + error.message, "error");
      setIsDepositing(false);
    }
  };

  const handleWithdrawAmountChange = (value: string) => {
    // 只允许数字和小数点
    const filtered = value.replace(/[^\d.]/g, '');
    // 确保只有一个小数点
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    // 限制小数位数为9位
    if (parts[1] && parts[1].length > 9) {
      return;
    }
    setWithdrawAmount(filtered);
  };

  const handleWithdraw = async () => {
    try {
      if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0 || !roleId || !nftData) {
        return;
      }

      setIsDepositing(true);
      
      const amountInMist = BigInt(Math.floor(Number(withdrawAmount) * 1e9));
      
      const tx = await roleManager.withdrawSuiWithNft(
        roleId,
        nftData,
        amountInMist
      );

      await signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            openNotification("Withdraw successful!", "success");
            await suiClient.waitForTransaction({
              digest: result.digest,
            });
            setIsDepositing(false);
          },
          onError: (error: any) => {
            console.error('Withdraw failed:', error);
            openNotification("Withdraw failed: " + error.message, "error");
            setIsDepositing(false);
          },
        }
      );

      await refetch();
      setWithdrawAmount("1");
    } catch (error: any) {
      console.error('Withdraw failed:', error);
      openNotification("Withdraw failed: " + error.message, "error");
      setIsDepositing(false);
    }
  };

  return (
    <>
      {/* 顶部标题 */}
      <div className="agent-header">
        <h2 className="text-xl font-semibold">Agent Profile</h2>
      </div>
      
      {/* Agent信息 */}
      <div className="agent-info">
        {/* Agent头像和名称 */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <img
              src={agentInfo?.url}
              alt="Agent"
              className="agent-avatar"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Agent";
              }}
            />
            <div className="agent-status"></div>
          </div>
          <h3 className="agent-name">{agentInfo?.name || "Loading Agent..."}</h3>
          <div className="agent-type">AI Assistant</div>
        </div>

        {/* Agent描述 */}
        <div className="agent-section">
          <h4 className="agent-section-title">Description</h4>
          <p className="agent-description">
            {agentInfo?.description || "Loading agent description..."}
          </p>
        </div>
        
        {/* 余额卡片 */}
        <div className="agent-balance-card">
          <h4 className="agent-balance-title">Balance</h4>
          <div className="agent-balance-amount">
            <AvatarIcon className="mr-2 text-blue-400" />
            <span className="agent-balance-value">{agentInfo?.balance || "0.00"}</span>
            <span className="agent-balance-currency">SUI</span>
          </div>
        </div>

        {/* 存款区域 */}
        <div className="agent-section">
          <h4 className="agent-section-title">Deposit SUI</h4>
          
          {showDepositInput ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={depositAmount}
                  onChange={(e) => handleDepositAmountChange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pl-3 pr-12 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter amount"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">SUI</span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount || Number(depositAmount) <= 0}
                  className="agent-action-button primary"
                >
                  <UploadIcon />
                  {isDepositing ? "Processing..." : "Deposit"}
                </button>
                
                <button
                  onClick={() => {
                    setShowDepositInput(false);
                    setDepositAmount("1");
                  }}
                  disabled={isDepositing}
                  className="agent-action-button secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDepositInput(true)}
              className="agent-action-button primary"
            >
              <UploadIcon />
              Deposit SUI
            </button>
          )}
        </div>

        {/* 取款区域 */}
        <div className="agent-section">
          <h4 className="agent-section-title">Withdraw SUI</h4>
          
          {showWithdrawInput ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={withdrawAmount}
                  onChange={(e) => handleWithdrawAmountChange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pl-3 pr-12 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter amount"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">SUI</span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleWithdraw}
                  disabled={isDepositing || !withdrawAmount || Number(withdrawAmount) <= 0}
                  className="agent-action-button primary"
                >
                  <DownloadIcon />
                  {isDepositing ? "Processing..." : "Withdraw"}
                </button>
                
                <button
                  onClick={() => {
                    setShowWithdrawInput(false);
                    setWithdrawAmount("1");
                  }}
                  disabled={isDepositing}
                  className="agent-action-button secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowWithdrawInput(true)}
              className="agent-action-button primary"
            >
              <DownloadIcon />
              Withdraw SUI
            </button>
          )}
        </div>
      </div>
      
      {/* 底部版本信息 */}
      <div className="agent-footer">
        <div className="agent-version">Anemone Agent v1.0</div>
      </div>
    </>
  );
}
