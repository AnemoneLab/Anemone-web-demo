import { Theme } from "@radix-ui/themes";
import { WalletProvider, ConnectButton, useSignAndExecuteTransaction, useCurrentAccount,useSuiClient } from "@mysten/dapp-kit";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { AgentMint } from "./AgentMint";
import { SkillCreate } from "./SkillCreate";
import { Chat } from "./Chat";
import { Box, Flex, Text } from "@radix-ui/themes";
import  AgentHub  from "./AgentHub";
import  SkillList  from "./SkillList";
import SkillDetail from "./SkillDetail";
import AgentDetail from "./AgentDetail";

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Flex justify="between" align="center" mb="6">
      <Flex gap="6" align="center">
        <Text size="5" weight="bold">Anemone</Text>
        <Flex gap="4">
          <button 
            className={`nav-button ${location.pathname === '/AgentHub' ? 'active' : ''}`}
            onClick={() => navigate("/AgentHub")}
          >
            Agent Hub
          </button>
          <button 
            className={`nav-button ${location.pathname === '/createAgent' ? 'active' : ''}`}
            onClick={() => navigate("/createAgent")}
          >
            Create Agent
          </button>
          <button 
            className={`nav-button ${location.pathname === '/createSkill' ? 'active' : ''}`}
            onClick={() => navigate("/createSkill")}
          >
            Create Skill
          </button>
          <button 
            className={`nav-button ${location.pathname === '/skills' ? 'active' : ''}`}
            onClick={() => navigate("/skills")}
          >
            Skills Marketplace
          </button>
        </Flex>
      </Flex>
      
      <Flex gap="3" align="center">
        <ConnectButton className="wallet-button" />
      </Flex>
    </Flex>
  );
}

export default function App() {
  return (
    <Theme appearance="dark">
      <WalletProvider>
        <BrowserRouter>
          <Box p="4">
            <Navigation />
            <Routes>
              <Route path="createAgent" element={<AgentMint />} />
              <Route path="createSkill" element={<SkillCreate />} />
              <Route path="chat/:roleId" element={<Chat />} />
              <Route path="AgentHub" element={<AgentHub />} />
              <Route path="skills" element={<SkillList />} />
              <Route path="/skill/:skillId" element={<SkillDetail />} />
              <Route path="/agent/:roleId" element={<AgentDetail />} />
              <Route path="*" element={<AgentHub />} />
            </Routes>
          </Box>
        </BrowserRouter>
      </WalletProvider>
    </Theme>
  );
}
