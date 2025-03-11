import { AnemoneSDK, SkillManager } from '@anemonelab/sui-sdk'
import { type SuiObjectChange } from '@mysten/sui/client';
import { Box, Button, Container, Flex, Text } from "@radix-ui/themes";
import * as Form from "@radix-ui/react-form";
import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";

import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

import { Toast } from "./components/Toast";
import { useToast } from "./hooks/useToast";
import { apiClient } from "./api/apiClient";

export function SkillCreate() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [doc, setDoc] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [quote, setQuote] = useState("");
  const [logUrl, setLogUrl] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [fee, setFee] = useState("10000000"); // Default 0.01 SUI (10000000 MIST)
  
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, showToast, hideToast } = useToast();
  const sdk = new AnemoneSDK();
  const skillManager = new SkillManager();

  // 获取交易创建的对象
  async function getCreatedObjects(digest: string) {
    const txDetails = await suiClient.getTransactionBlock({
        digest,
        options: {
            showEffects: true,
            showEvents: true,
            showInput: true,
            showObjectChanges: true,
        },
    });

    return txDetails.objectChanges?.filter(
        (change): change is SuiObjectChange & { type: "created" } => 
            change.type === "created"
    ) || [];
  }

  const handleCreateSkill = async () => {
    try {
      if (!currentAccount) {
        showToast("Please connect your wallet", "error");
        return;
      }
      
      setIsLoading(true);
      showToast("Creating skill...", "info");

      // Convert fee to BigInt
      const feeBigInt = BigInt(fee);
      
      // Create skill transaction
      const tx = await skillManager.createSkill(
        name,
        description,
        endpoint,
        doc,
        githubRepo,
        dockerImage,
        quote,
        logUrl,
        publicKey,
        feeBigInt
      );

      // Sign and execute transaction
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            showToast("Creating skill...", "info");
            const txResult = await suiClient.waitForTransaction({
              digest: result.digest,
            });
            
            try {
              // 获取交易创建的所有对象
              const createdObjects = await getCreatedObjects(result.digest);
              console.log('Created Objects:', createdObjects);
              
              // 通过对象类型查找Skill对象
              const skillObject = createdObjects.find(obj => 
                obj.objectType.includes('::skill_manager::Skill'));
              
              if (skillObject) {
                const skillObjectId = skillObject.objectId;
                console.log('Created skill with ID:', skillObjectId);
                
                // 保存到后端
                await apiClient.addSkill(skillObjectId);
                showToast("Skill created and saved successfully!", "success");
              } else {
                showToast("Skill created on chain, but couldn't find Skill object", "info");
              }
            } catch (error) {
              console.error("Failed to save skill to backend:", error);
              showToast("Skill created on chain, but failed to save to backend", "info");
            }
            
            setIsLoading(false);
            
            // Reset form
            resetForm();
          },
          onError: (error) => {
            showToast(error.message || "Failed to create skill", "error");
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message, "error");
      } else {
        showToast("Failed to create skill", "error");
      }
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setName("");
    setDescription("");
    setEndpoint("");
    setDoc("");
    setGithubRepo("");
    setDockerImage("");
    setQuote("");
    setLogUrl("");
    setPublicKey("");
    setFee("10000000");
  };

  // Helper functions
  const getButtonText = () => {
    if (!currentAccount) {
      return "Connect Wallet";
    }
    return isLoading ? <ClipLoader size={20} color="white" /> : "Create Skill";
  };

  // Modify button disabled state check function
  const isButtonDisabled = () => {
    // Check all required fields
    const allRequiredFieldsFilled =
      name.trim() && 
      description.trim() && 
      endpoint.trim() && 
      fee.trim();

    if (!currentAccount) {
      return !allRequiredFieldsFilled;
    }
    return isLoading || !allRequiredFieldsFilled;
  };

  // Add button click handler
  const handleButtonClick = () => {
    if (!currentAccount) {
      // If wallet not connected, trigger wallet connection
      document.querySelector<HTMLButtonElement>(".wallet-button")?.click();
      return;
    }
    handleCreateSkill();
  };

  return (
    <Container size="1" mt="6">
      <Flex direction="column" gap="6">
        <Box>
          <Text size="5" weight="bold" align="center">
            Create Skill
          </Text>
        </Box>

        <Form.Root
          onSubmit={(e) => {
            e.preventDefault();
            handleButtonClick();
          }}
        >
          <Flex direction="column" gap="4">
            {/* Name */}
            <Form.Field name="name">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Skill Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={(e) => setName(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Description */}
            <Form.Field name="description">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Skill Description *"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={(e) => setDescription(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Endpoint */}
            <Form.Field name="endpoint">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Endpoint URL *"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  onBlur={(e) => setEndpoint(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Documentation */}
            <Form.Field name="doc">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Documentation URL"
                  value={doc}
                  onChange={(e) => setDoc(e.target.value)}
                  onBlur={(e) => setDoc(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* GitHub repo */}
            <Form.Field name="githubRepo">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="GitHub Repository URL"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  onBlur={(e) => setGithubRepo(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Docker image */}
            <Form.Field name="dockerImage">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Docker Image"
                  value={dockerImage}
                  onChange={(e) => setDockerImage(e.target.value)}
                  onBlur={(e) => setDockerImage(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Quote */}
            <Form.Field name="quote">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Quote"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  onBlur={(e) => setQuote(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Log URL */}
            <Form.Field name="logUrl">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Log URL"
                  value={logUrl}
                  onChange={(e) => setLogUrl(e.target.value)}
                  onBlur={(e) => setLogUrl(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Public Key */}
            <Form.Field name="publicKey">
              <Form.Control asChild>
                <input
                  className="text-field"
                  placeholder="Public Key"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  onBlur={(e) => setPublicKey(e.target.value.trim())}
                />
              </Form.Control>
            </Form.Field>
            
            {/* Fee */}
            <Form.Field name="fee">
              <Form.Control asChild>
                <input
                  className="text-field"
                  type="number"
                  placeholder="Usage Fee (MIST) *"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  min="0"
                />
              </Form.Control>
              <Form.Message className="text-xs text-gray-400 mt-1">
                Fee is in MIST units (1 SUI = 1,000,000,000 MIST)
              </Form.Message>
            </Form.Field>

            <Button
              size="3"
              className="swap-button"
              type="submit"
              disabled={isButtonDisabled()}
            >
              {getButtonText()}
            </Button>
          </Flex>
        </Form.Root>

        {/* Render Toasts */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => hideToast(toast.id)}
            txHash={toast.txHash}
            tokenUrl={toast.tokenUrl}
            duration={toast.type === "success" ? 6000 : 3000}
          />
        ))}
      </Flex>
    </Container>
  );
} 