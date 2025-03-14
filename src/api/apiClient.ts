// const BASE_URL = 'https://anemoneframe.com/api';
const BASE_URL = 'http://localhost:3000';

const fetcher = async ({
    url,
    method,
    body,
    headers,
}: {
    url: string;
    method?: "GET" | "POST" | "DELETE";
    body?: object | FormData;
    headers?: HeadersInit;
}) => {
    const options: RequestInit = {
        method: method ?? "GET",
        headers: headers
            ? headers
            : {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
    };

    if (method === "POST") {
        if (body instanceof FormData) {
            if (options.headers && typeof options.headers === 'object') {
                options.headers = Object.fromEntries(
                    Object.entries(options.headers as Record<string, string>)
                        .filter(([key]) => key !== 'Content-Type')
                );
            }
            options.body = body;
        } else {
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch(`${BASE_URL}${url}`, options);

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Error: ", errorText);

        let errorMessage = "An error occurred.";
        try {
            const errorObj = JSON.parse(errorText);
            errorMessage = errorObj.message || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
    }

    // 克隆响应以便可以多次读取
    const responseClone = response.clone();

    try {
        const data = await responseClone.json();
        console.log('Response data:', data);
        return data;
    } catch (error) {
        console.error('Error parsing JSON:', error);
        // 如果 JSON 解析失败，返回原始文本
        const text = await response.text();
        return { response: text };
    }
};

export const apiClient = {
    sendMessage: (roleId: string, message: string) => {
        return fetcher({
            url: `/chat`,
            method: "POST",
            body: { roleId, message },
        });
    },
    
    // Skills API
    getSkills: () => {
        return fetcher({
            url: `/skills`,
            method: "GET",
        });
    },
    
    addSkill: (objectId: string) => {
        return fetcher({
            url: `/skill`,
            method: "POST",
            body: { object_id: objectId },
        });
    },
    
    getSkillById: (id: number) => {
        return fetcher({
            url: `/skill/${id}`,
            method: "GET",
        });
    },
    
    deleteSkill: (objectId: string) => {
        return fetcher({
            url: `/skill/${objectId}`,
            method: "DELETE",
        });
    },

    // Agent API
    getAgentByRoleId: (roleId: string) => {
        return fetcher({
            url: `/agent/${roleId}`,
            method: "GET",
        });
    },
    
    getAllAgents: () => {
        return fetcher({
            url: `/agents`,
            method: "GET",
        });
    },
    
    generateAgentAddress: () => {
        return fetcher({
            url: `/generate-agent-address`,
            method: "POST",
        });
    },
    
    createAgent: (data: { address: string; nft_id: string; role_id: string; cvm_id: number }) => {
        return fetcher({
            url: `/create-agent`,
            method: "POST",
            body: data,
        });
    },
    
    // CVM Attestation API
    getCvmAttestation: (appId: string) => {
        return fetcher({
            url: `/cvm/attestation/${appId}`,
            method: "GET",
        });
    }
}; 