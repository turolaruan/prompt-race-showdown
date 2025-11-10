import { useMemo, useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Timer, ThumbsUp, Sparkles, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useChatHistory } from "@/context/ChatHistoryContext";
import type { ChatHistoryEntry, ChatTurn, ChatTurnOutput } from "@/context/ChatHistoryContext";
import { cn } from "@/lib/utils";

const PROMPT_SUGGESTIONS_BY_TASK: Record<string, string[]> = {
  strategy_qa: [
    "Aconselhe o presidente sobre como equilibrar segurança nacional e liberdades civis diante de uma nova ameaça, diagnosticando os principais riscos, apresentando uma matriz com três frentes prioritárias (medida, impacto esperado e riscos) e fechando com um plano de comunicação pública em dois passos.",
    "Mostre como priorizar a carteira de um time de vendas B2B: explique os critérios de segmentação, apresente-os em uma tabela para quatro perfis hipotéticos (receita potencial, ciclo, esforço) e finalize com recomendações operacionais para os próximos 30 dias.",
    "Distribua um orçamento anual de R$ 1 milhão para uma ONG climática listando três iniciativas com localização, público e custo, calculando a porcentagem destinada a cada uma, definindo métricas de sucesso e detalhando como medir o impacto em seis meses.",
  ],
  math_qa: [
    "Resolva o sistema 3x + 2y = 12 e x - y = 1 descrevendo o método escolhido, numerando os passos de substituição ou escalonamento e destacando os valores finais de x e y.",
    "Calcule o valor futuro de um investimento de R$ 8.000 a 1,2% ao mês durante 18 meses em juros compostos, explicando a fórmula, montando a expressão com números, chegando ao resultado e interpretando o significado financeiro.",
    "Encontre o perímetro de um triângulo isósceles em que a base mede 14 cm e cada lado igual é 5 cm maior, extraindo os dados do enunciado, montando a equação do perímetro e apresentando a resposta com unidades.",
  ],
  aqua_rat: [
    "Resolva 3x + 5 = 20 descrevendo o isolamento da incógnita, detalhando cada transformação algébrica com a justificativa e verificando o resultado ao substituir o valor de x.",
    "Calcule o desconto total de um produto que recebe reduções sucessivas de 10% e 5% sobre o preço original, mostrando a fórmula utilizada, o percentual final e por que a soma simples não chega ao mesmo valor.",
    "Determine x em 2(x - 4) = 3x + 1 distribuindo os termos, agrupando corretamente, isolando a incógnita, fornecendo o valor final e checando rapidamente com a substituição.",
  ],
  gsm8k: [
    "Calcule a velocidade média de um estudante que percorre 120 km em 2 horas, apresentando a fórmula, substituindo os valores, exibindo a unidade final e mantendo a explicação acessível ao ensino médio.",
    "Descubra quantos pontos são necessários para atingir 75% de aproveitamento em uma prova com 20 questões valendo 5 pontos cada, calculando o total possível, aplicando o percentual e interpretando o resultado.",
    "Ache a área de um retângulo cujos lados descritos em texto são 8 m e 3 m a mais que isso, traduzindo o enunciado para números, aplicando a fórmula da área, indicando as unidades e comentando o significado prático.",
  ],
  esnli: [
    "Resuma em duas frases o parágrafo: \"Desde 2019, o programa Energia Viva levou sistemas solares a 48 comunidades ribeirinhas no Amazonas, ajudou 6.200 famílias a cortar 70% do diesel, refrigerar vacinas e vender polpas; o novo desafio é manter a assistência técnica apesar das enchentes.\" Destaque conclusão e desafio futuro.",
    "Sentenças: A) \"Todos os sensores instalados no porto captam umidade acima de 80%.\" B) \"Alguns sensores no porto registram ar seco.\" Classifique B como implicação, contradição ou neutra em relação a A, cite o motivo e proponha contraexemplo se neutra.",
    "Resuma em até três frases este texto: \"O Ministério da Saúde lançou hoje, em Recife, o programa Sentinela Azul para equipar 120 UBS com testes rápidos de dengue, treinar 400 agentes e reduzir surtos em 35% até março/2025 usando dados do Inmet.\" Preserve quem anunciou, onde, números-chave e meta percentual.",
  ],
};

interface VirtualModelApiResult {
  model: string;
  model_name?: string;
  response: string;
  inference_seconds?: number | null;
}

interface VirtualApiResponse {
  results: VirtualModelApiResult[];
}

type ChoiceMessagePart =
  | string
  | {
      text?: string;
      content?: string;
    }
  | null
  | undefined;

const TASK_LABELS: Record<string, string> = {
  aqua_rat: "AquaRAT",
  esnli: "ESNLI",
  gsm8k: "GSM8K",
  math_qa: "MathQA",
  strategy_qa: "StrategyQA",
};

const MODEL_ALIAS_STRINGS = [
  "aqua_rat__Llama-3.2-3B-Instruct__grpo",
  "aqua_rat__Llama-3.2-3B-Instruct__grpo_on_lora",
  "aqua_rat__Llama-3.2-3B-Instruct__lora",
  "aqua_rat__Phi-4-mini-instruct__grpo",
  "aqua_rat__Phi-4-mini-instruct__grpo_on_lora",
  "aqua_rat__Phi-4-mini-instruct__lora",
  "aqua_rat__Qwen3-4B-Instruct-2507__grpo",
  "aqua_rat__Qwen3-4B-Instruct-2507__grpo_on_lora",
  "aqua_rat__Qwen3-4B-Instruct-2507__lora",
  "aqua_rat__gemma-3-4b-it__grpo",
  "aqua_rat__gemma-3-4b-it__grpo_on_lora",
  "aqua_rat__gemma-3-4b-it__lora",
  "esnli__Llama-3.2-3B-Instruct__grpo",
  "esnli__Llama-3.2-3B-Instruct__grpo_on_lora",
  "esnli__Llama-3.2-3B-Instruct__lora",
  "esnli__Phi-4-mini-instruct__grpo",
  "esnli__Phi-4-mini-instruct__grpo_on_lora",
  "esnli__Phi-4-mini-instruct__lora",
  "esnli__Qwen3-4B-Instruct-2507__grpo",
  "esnli__Qwen3-4B-Instruct-2507__grpo_on_lora",
  "esnli__Qwen3-4B-Instruct-2507__lora",
  "esnli__gemma-3-4b-it__grpo",
  "esnli__gemma-3-4b-it__grpo_on_lora",
  "esnli__gemma-3-4b-it__lora",
  "gsm8k__Llama-3.2-3B-Instruct__grpo",
  "gsm8k__Llama-3.2-3B-Instruct__grpo_on_lora",
  "gsm8k__Llama-3.2-3B-Instruct__lora",
  "gsm8k__Phi-4-mini-instruct__grpo",
  "gsm8k__Phi-4-mini-instruct__grpo_on_lora",
  "gsm8k__Phi-4-mini-instruct__lora",
  "gsm8k__Qwen3-4B-Instruct-2507__grpo",
  "gsm8k__Qwen3-4B-Instruct-2507__grpo_on_lora",
  "gsm8k__Qwen3-4B-Instruct-2507__lora",
  "gsm8k__gemma-3-4b-it__grpo",
  "gsm8k__gemma-3-4b-it__grpo_on_lora",
  "gsm8k__gemma-3-4b-it__lora",
  "math_qa__Llama-3.2-3B-Instruct__grpo",
  "math_qa__Llama-3.2-3B-Instruct__grpo_on_lora",
  "math_qa__Llama-3.2-3B-Instruct__lora",
  "math_qa__Phi-4-mini-instruct__lora",
  "math_qa__Qwen3-4B-Instruct-2507__grpo",
  "math_qa__Qwen3-4B-Instruct-2507__grpo_on_lora",
  "math_qa__Qwen3-4B-Instruct-2507__lora",
  "math_qa__gemma-3-4b-it__grpo",
  "math_qa__gemma-3-4b-it__grpo_on_lora",
  "math_qa__gemma-3-4b-it__lora",
  "strategy_qa__Llama-3.2-3B-Instruct__grpo",
  "strategy_qa__Llama-3.2-3B-Instruct__lora",
  "strategy_qa__Phi-4-mini-instruct__grpo",
  "strategy_qa__Phi-4-mini-instruct__grpo_on_lora",
  "strategy_qa__Phi-4-mini-instruct__lora",
  "strategy_qa__Qwen3-4B-Instruct-2507__grpo",
  "strategy_qa__Qwen3-4B-Instruct-2507__grpo_on_lora",
  "strategy_qa__Qwen3-4B-Instruct-2507__lora",
  "strategy_qa__gemma-3-4b-it__grpo",
  "strategy_qa__gemma-3-4b-it__grpo_on_lora",
  "strategy_qa__gemma-3-4b-it__lora",
] as const;

interface ModelAliasEntry {
  id: string;
  task: string;
  displayName: string;
}

const formatDisplayName = (rawTask: string, base: string, variant: string, suffix: string | undefined) => {
  const taskLabel = TASK_LABELS[rawTask] ?? rawTask.toUpperCase();
  const baseLabel = base
    .replace(/-/g, " ")
    .replace(/\b(\w)/g, char => char.toUpperCase())
    .replace(/\b3b\b/gi, "3B");
  const variantLabel = variant.replace(/_/g, " ").toUpperCase();
  const suffixLabel = suffix?.replace("merged_fp16-", "#").replace("merged_fp8-", "#") ?? "";
  return `${taskLabel} · ${baseLabel} (${variantLabel}${suffixLabel ? ` ${suffixLabel}` : ""})`;
};

const MODEL_ALIAS_ENTRIES: ModelAliasEntry[] = MODEL_ALIAS_STRINGS.map(raw => {
  const [task = "general", base = "Model", variant = "variant", suffix] = raw.split("__");
  return {
    id: raw,
    task,
    displayName: formatDisplayName(task, base, variant, suffix),
  };
});

const shuffleAliases = (entries: ModelAliasEntry[]): ModelAliasEntry[] => {
  const copy = [...entries];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

type ModelAliasPair = [ModelAliasEntry, ModelAliasEntry];

const renderAnswerWithThinkStyling = (text: string): ReactNode => {
  if (!text) return "";
  if (!text.includes("<think>")) {
    return text;
  }

  const segments: { type: "think" | "text"; content: string }[] = [];
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = thinkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "think", content: match[1] ?? "" });
    lastIndex = thinkRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments.map((segment, index) =>
    segment.type === "think" ? (
      <span key={`think-${index}`} className="block text-[1.1rem] text-muted-foreground/75">
        {segment.content.trim()}
      </span>
    ) : (
      <span key={`text-${index}`}>{segment.content}</span>
    )
  );
};

const shouldIncludeChainOfThought = (aliasId: string): boolean => aliasId.includes("__grpo");

const buildReasoningInstruction = (alias: ModelAliasEntry): string =>
  shouldIncludeChainOfThought(alias.id)
    ? "Inclua uma seção curta limitada por tags <think></think> com 2 a 3 passos de pensamento em primeira pessoa, antes de fornecer a resposta final. O pensamento deve incluir conclusões e tomadas de decisão, simulando o processo de raciocínio do modelo para resolver o problema em questão."
    : "Responda de forma direta, sem seções adicionais de raciocínio.";

const buildMockResponseText = (prompt: string, alias: ModelAliasEntry): string => {
  const baseAnswer = `Analisando o pedido "${prompt}", aqui está uma resposta resumida com foco no domínio ${alias.task.toUpperCase()}.`;
  if (!shouldIncludeChainOfThought(alias.id)) {
    return `${baseAnswer}\n\nResposta: A IA sugere abordar o problema enfatizando os pontos principais e oferecendo recomendações práticas.`;
  }
  return `${baseAnswer}\n\nRaciocínio:\n1. Identificar os dados e restrições principais do cenário.\n2. Aplicar o método específico do domínio ${alias.task.toUpperCase()} para estruturar a solução.\n3. Validar o resultado e comunicar de forma clara.\n\nResposta: A IA sugere abordar o problema enfatizando os pontos principais e oferecendo recomendações práticas.`;
};

const getNextAliasPair = (
  entries: ModelAliasEntry[],
  cursor: number
): { pair: ModelAliasPair; nextCursor: number } => {
  const totalAliasCount = entries.length;
  if (totalAliasCount < 2) {
    throw new Error("Alias catalog insuficiente para compor pares.");
  }

  const normalizeIndex = (index: number) => {
    const mod = index % totalAliasCount;
    return mod < 0 ? mod + totalAliasCount : mod;
  };

  const firstIndex = normalizeIndex(cursor);
  const firstAlias = entries[firstIndex];
  let secondIndex = normalizeIndex(firstIndex + 1);

  while (entries[secondIndex].task !== firstAlias.task) {
    secondIndex = normalizeIndex(secondIndex + 1);
    if (secondIndex === firstIndex) {
      // fallback: break to avoid infinite loop
      secondIndex = normalizeIndex(firstIndex + 1);
      break;
    }
  }

  const secondAlias = entries[secondIndex];
  const nextCursor = normalizeIndex(secondIndex + 1);
  return { pair: [firstAlias, secondAlias], nextCursor };
};

const ARENA_CONTAINER = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-16";
const normalizeApiResults = (
  payload: VirtualApiResponse | VirtualModelApiResult[] | null | undefined
): VirtualModelApiResult[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
};

const OPENAI_VIRTUAL_MODELS = [
  {
    id: "openai/gpt-4.1-mini-analitico",
    name: "GPT-4.1 Mini Analítico",
    systemInstruction:
      "Você é um especialista analítico. Estruture respostas em tópicos claros, justificando cada ponto com lógica e dados quando possível. O seu output deve ser conciso e direto, com NO MÁXIMO 40 palavras.",
    temperature: 0.6,
  },
  {
    id: "openai/gpt-4.1-mini-criativo",
    name: "GPT-4.1 Mini Criativo",
    systemInstruction:
      "Você é um comunicador criativo. Traga analogias, exemplos e um tom envolvente, mantendo a precisão das informações. O seu output deve ser conciso e direto, com NO MÁXIMO 40 palavras.",
    temperature: 0.8,
  },
] as const;

const SUGGESTION_CARD_ACCENTS = [
  "bg-gradient-to-br from-primary/25 via-primary/10 to-transparent",
  "bg-gradient-to-br from-purple-500/20 via-primary/10 to-transparent",
  "bg-gradient-to-br from-blue-500/15 via-sky-500/10 to-transparent",
  "bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent",
] as const;

const EXTRA_PROMPT_SUGGESTION =
  "Qual estratégia de IA você recomenda para diminuir churn em uma plataforma de assinatura?";

export interface ArenaInterfaceHandle {
  startNewChat: () => void;
  loadChat: (chat: ChatHistoryEntry) => void;
}
const getModelDisplayName = (modelId: string): string => {
  if (!modelId) {
    return "Modelo desconhecido";
  }
  const cleanId = modelId.trim();
  const parts = cleanId.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];
  if (lastSegment && lastSegment.length > 0) {
    return lastSegment;
  }
  return cleanId;
};
const ArenaInterface = forwardRef<ArenaInterfaceHandle>((_, ref) => {
  const {
    history: chatHistory,
    currentChatId,
    addChat,
    appendTurn,
    setTurnWinner,
    setCurrentChat,
  } = useChatHistory();
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [useMockData] = useState(false);
  const aliasEntriesRef = useRef<ModelAliasEntry[]>([]);
  if (aliasEntriesRef.current.length === 0) {
    aliasEntriesRef.current = shuffleAliases(MODEL_ALIAS_ENTRIES);
  }
  const aliasEntries = aliasEntriesRef.current;
  const aliasCursorRef = useRef(Math.floor(Math.random() * aliasEntries.length));
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustTextareaHeight = useCallback((element?: HTMLTextAreaElement | null) => {
    const textarea = element ?? textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);
  const activeChat = useMemo(
    () => chatHistory.find(chat => chat.id === currentChatId) ?? null,
    [chatHistory, currentChatId]
  );
  const promptSuggestions = useMemo(() => {
    const tasks = Object.keys(PROMPT_SUGGESTIONS_BY_TASK);
    const shuffledTasks = [...tasks].sort(() => Math.random() - 0.5);
    const suggestions: string[] = [];

    shuffledTasks.forEach(task => {
      const prompts = PROMPT_SUGGESTIONS_BY_TASK[task];
      if (!Array.isArray(prompts) || prompts.length === 0) return;
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
      if (randomPrompt) {
        suggestions.push(randomPrompt);
      }
    });

    return suggestions;
  }, [currentChatId, conversation.length]);
  useEffect(() => {
    if (!activeChat) {
      setConversation([]);
      return;
    }

    if (Array.isArray(activeChat.turns) && activeChat.turns.length > 0) {
      setConversation(
        activeChat.turns.map(turn => ({
          ...turn,
          outputs: Array.isArray(turn.outputs) ? [...turn.outputs] : [],
          winnerOutputId: turn.winnerOutputId ?? null,
          winnerModelId: turn.winnerModelId ?? null,
          winnerModelName: turn.winnerModelName ?? null,
        }))
      );
    } else {
      setConversation([]);
    }
  }, [activeChat]);

  const formatTime = (milliseconds: number): string => {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };
  const latestTurn = useMemo(() => {
    if (conversation.length === 0) return null;
    return conversation[conversation.length - 1];
  }, [conversation]);

  const latestOutputs = useMemo<ChatTurnOutput[]>(() => {
    if (!latestTurn) return [];
    return latestTurn.outputs ?? [];
  }, [latestTurn]);

  const outputsById = useMemo(() => {
    return latestOutputs.reduce<Record<string, ChatTurnOutput>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [latestOutputs]);

  const getWinnerInfoForTurn = useCallback(
    (turn: ChatTurn | null): { outputId: string | null; modelName: string | null } => {
      if (!turn) return { outputId: null, modelName: null };
      const outputs = Array.isArray(turn.outputs) ? turn.outputs : [];

      if (turn.winnerOutputId) {
        const matched = outputs.find(output => output.id === turn.winnerOutputId);
        return {
          outputId: turn.winnerOutputId,
          modelName:
            turn.winnerModelName ??
            matched?.modelName ??
            (matched ? getModelDisplayName(matched.modelId) : null),
        };
      }

      if (turn.winnerModelId) {
        const matchedByModelId = outputs.find(output => output.modelId === turn.winnerModelId);
        if (matchedByModelId) {
          return {
            outputId: matchedByModelId.id,
            modelName:
              turn.winnerModelName ??
              matchedByModelId.modelName ??
              getModelDisplayName(matchedByModelId.modelId),
          };
        }
      }

      if (turn.winnerModelName) {
        const normalized = turn.winnerModelName.trim().toLowerCase();
        const matchedByName = outputs.find(output => {
          const label =
            (output.modelName || getModelDisplayName(output.modelId)).trim().toLowerCase();
          return label === normalized;
        });
        if (matchedByName) {
          return {
            outputId: matchedByName.id,
            modelName: turn.winnerModelName,
          };
        }
        return {
          outputId: null,
          modelName: turn.winnerModelName,
        };
      }

      return { outputId: null, modelName: null };
    },
    []
  );

  const restoreVoteState = useCallback(
    (turn: ChatTurn | null) => {
      const winnerInfo = getWinnerInfoForTurn(turn);
      if (winnerInfo.outputId) {
        setHasVoted(true);
        setVotedFor(winnerInfo.outputId);
      } else {
        setHasVoted(false);
        setVotedFor(null);
      }
    },
    [getWinnerInfoForTurn]
  );

  useEffect(() => {
    restoreVoteState(latestTurn ?? null);
  }, [latestTurn, restoreVoteState]);
  const handleSuggestionSelect = (suggestion: string) => {
    if (!suggestion) return;
    setPrompt(suggestion);
  };

  const generateMockResponse = async (
    prompt: string,
    aliasPair: ModelAliasPair
  ): Promise<VirtualApiResponse> => {
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const results: VirtualModelApiResult[] = aliasPair.map(alias => ({
      model: alias.id,
      model_name: alias.displayName,
      response: buildMockResponseText(prompt, alias),
      inference_seconds: 0.5 + Math.random() * 2
    }));

    return { results };
  };

  const sendPromptToEndpoint = async (
    prompt: string,
    aliasPair: ModelAliasPair
  ): Promise<VirtualApiResponse> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "A chave da API da OpenAI não está configurada (VITE_OPENAI_API_KEY)."
      );
    }
    const configuredBaseRaw = import.meta.env.VITE_OPENAI_BASE_URL;
    const configuredBase =
      configuredBaseRaw && configuredBaseRaw.trim().length > 0
        ? configuredBaseRaw.trim().replace(/\/$/, "")
        : null;
    const openAiBaseUrl =
      configuredBase && configuredBase.length > 0 ? configuredBase : "https://api.openai.com/v1";
    const endpoint = `${openAiBaseUrl}/chat/completions`;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    const now = () =>
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();

    const results: VirtualModelApiResult[] = [];

    try {
      for (let index = 0; index < OPENAI_VIRTUAL_MODELS.length; index += 1) {
        const variant = OPENAI_VIRTUAL_MODELS[index];
        const alias = aliasPair[index % aliasPair.length];
        const reasoningInstruction = buildReasoningInstruction(alias);
        const requestStart = now();
        const response = await fetch(endpoint, {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            temperature: variant.temperature,
            messages: [
              {
                role: "system",
                content: `${variant.systemInstruction} ${reasoningInstruction}`,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 800,
          }),
        });

        const elapsed = now() - requestStart;

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}${
              responseText ? ` - ${responseText.slice(0, 200)}` : ""
            }`
          );
        }

        const data = await response.json();
        const choiceMessage = data?.choices?.[0]?.message;
        let choiceContent = "";
        if (typeof choiceMessage?.content === "string") {
          choiceContent = choiceMessage.content.trim();
        } else if (Array.isArray(choiceMessage?.content)) {
          choiceContent = choiceMessage.content
            .map((part: ChoiceMessagePart) => {
              if (typeof part === "string") return part;
              if (part && typeof part === "object") {
                if (typeof part.text === "string") return part.text;
                if (typeof part.content === "string") return part.content;
              }
              return "";
            })
            .join("")
            .trim();
        }

        results.push({
          model: alias.id,
          model_name: alias.displayName,
          response: choiceContent || "Resposta não disponível",
          inference_seconds: Math.max(elapsed / 1000, 0),
        });
      }

      return { results };
    } catch (error) {
      console.error("Error sending prompt to OpenAI:", error);
      throw error;
    }
  };
  const runArena = async () => {
    if (conversation.length > 0) {
      toast({
        title: "Inicie um novo chat",
        description: 'Para enviar outro prompt, clique em "Novo Chat".',
        variant: "destructive"
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um prompt para continuar.",
        variant: "destructive"
      });
      return;
    }
    const currentPrompt = prompt.trim();
    const existingChatId = currentChatId;
    let chatId = existingChatId ?? null;

    setIsRunning(true);
    setHasVoted(false);
    setVotedFor(null);
    setPendingPrompt(currentPrompt);

    try {
      const now = () =>
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const aliasInfo = getNextAliasPair(aliasEntries, aliasCursorRef.current);
      aliasCursorRef.current = aliasInfo.nextCursor;
      const requestStart = now();
      const apiResponse = useMockData
        ? await generateMockResponse(currentPrompt, aliasInfo.pair)
        : await sendPromptToEndpoint(currentPrompt, aliasInfo.pair);
      console.log("API TCC response:", apiResponse);
      const totalDuration = Math.round(now() - requestStart);
      const results = normalizeApiResults(apiResponse);
      if (results.length === 0) {
        throw new Error("Nenhuma resposta retornada pela API TCC.");
      }
      const processedOutputs: ChatTurnOutput[] = results.map((result: VirtualModelApiResult, index: number) => {
        const outputId = `output${index + 1}`;
        const rawModelId = typeof result?.model === "string" ? result.model : outputId;
        const providedModelName =
          typeof result?.model_name === "string" && result.model_name.trim().length > 0
            ? result.model_name.trim()
            : null;
        const modelName = providedModelName ?? getModelDisplayName(rawModelId);
        const inferenceSeconds =
          typeof result?.inference_seconds === "number" ? result.inference_seconds : null;
        const responseText =
          typeof result?.response === "string" && result.response.trim().length > 0
            ? result.response.trim()
            : "Resposta não disponível";
        return {
          id: outputId,
          modelId: rawModelId,
          modelName,
          response: responseText,
          responseTimeMs: inferenceSeconds !== null ? Math.round(inferenceSeconds * 1000) : totalDuration,
        };
      });

      if (!chatId) {
        chatId = addChat(currentPrompt);
      }

      const turnTimestamp = new Date().toISOString();
      const turn: ChatTurn = {
        id: `${chatId}-${turnTimestamp}`,
        prompt: currentPrompt,
        timestamp: turnTimestamp,
        outputs: processedOutputs,
        winnerOutputId: null,
        winnerModelId: null,
        winnerModelName: null,
      };

      appendTurn(chatId, turn);
      setConversation(prev => (chatId === existingChatId ? [...prev, turn] : [turn]));
      setPrompt("");
      setCurrentChat(chatId);
      toast({
        title: "Resposta Recebida!",
        description: "O prompt foi processado com sucesso pela API TCC."
      });
    } catch (error) {
      console.error("Error running arena:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o prompt para a API TCC.",
        variant: "destructive"
      });
    } finally {
      setPendingPrompt(null);
      setIsRunning(false);
    }
  };
  const handleVote = async (outputId: string) => {
    if (hasVoted) return;
    if (!latestTurn || !currentChatId) return;
    const selectedOutput = outputsById[outputId];
    const selectedModelName = selectedOutput?.modelName ?? outputId;
    const selectedModelId = selectedOutput?.modelId ?? outputId;
    
    setVotedFor(outputId);
    setHasVoted(true);
    setConversation(prev =>
      prev.map(turn =>
        turn.id === latestTurn.id
          ? {
              ...turn,
              winnerOutputId: outputId,
              winnerModelId: selectedModelId,
              winnerModelName: selectedModelName,
            }
          : turn
      )
    );

    // Save vote to database
    const allOutputs = latestOutputs;
    
    try {
      const { error } = await supabase.from("arena_votes").insert({
        winner_model_id: selectedModelId,
        prompt: latestTurn.prompt || activeChat?.prompt || "",
        model_a_id: allOutputs[0]?.modelId || "",
        model_b_id: allOutputs[1]?.modelId || "",
        technique: "Modelo base", // Default technique - can be enhanced later
        task: "Geração de Texto" // Default task - can be enhanced later
      });

      if (error) {
        console.error("Error saving vote:", error);
        toast({
          title: "Erro ao salvar voto",
          description: "O voto foi registrado localmente, mas não foi salvo no banco de dados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving vote:", error);
    }

    setTurnWinner(currentChatId, latestTurn.id, {
      outputId,
      modelId: selectedModelId,
      modelName: selectedModelName,
    });
    toast({
      title: "Voto Registrado!",
      description: selectedOutput
        ? `Você votou na resposta gerada pelo modelo ${selectedModelName}.`
        : "Voto registrado."
    });
  };

  const startNewChat = useCallback(() => {
    setPrompt("");
    setConversation([]);
    setPendingPrompt(null);
    setCurrentChat(null);
    setHasVoted(false);
    setVotedFor(null);
    setIsRunning(false);
  }, [setCurrentChat]);

  const loadChatFromHistory = useCallback((chat: ChatHistoryEntry) => {
    const turns = Array.isArray(chat.turns)
      ? chat.turns.map(turn => ({
          ...turn,
          outputs: Array.isArray(turn.outputs) ? [...turn.outputs] : [],
          winnerOutputId: turn.winnerOutputId ?? null,
          winnerModelId: turn.winnerModelId ?? null,
          winnerModelName: turn.winnerModelName ?? null,
        }))
      : [];

    setCurrentChat(chat.id);
    setConversation(turns);
    setPrompt("");
    setPendingPrompt(null);
    setIsRunning(false);
    const latestSavedTurn = turns.length > 0 ? turns[turns.length - 1] : null;
    restoreVoteState(latestSavedTurn ?? null);
  }, [restoreVoteState, setCurrentChat]);

  useImperativeHandle(
    ref,
    () => ({
      startNewChat,
      loadChat: loadChatFromHistory,
    }),
    [startNewChat, loadChatFromHistory]
  );


  const turnsForDisplay = useMemo(() => [...conversation].reverse(), [conversation]);
  const hasAnyResponses = conversation.length > 0;
  const outputsCount = latestOutputs.length;
  const isProcessing = isRunning;
  const hasPromptInteraction = hasAnyResponses || isProcessing || Boolean(pendingPrompt);

  const renderResultsSections = () => (
    <>
      {isProcessing && pendingPrompt && (
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/85 to-background shadow-[0_50px_140px_-80px_rgba(147,51,234,0.6)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute bottom-0 left-12 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          </div>
          <div className="relative space-y-6 p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">Processando</p>
                <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Gerando respostas...</h2>
                <p className="max-w-3xl text-lg text-muted-foreground/90 sm:text-xl">
                  Prompt enviado:{" "}
                  <span className="font-medium text-primary/85">{pendingPrompt}</span>
                </p>
              </div>
            </div>
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-lg font-semibold text-foreground">Consultando modelos...</p>
              <p className="mt-2 max-w-md text-lg text-muted-foreground/90 sm:text-xl">
                Estamos analisando as respostas dos modelos selecionados. Isso pode levar alguns segundos.
              </p>
            </div>
          </div>
        </section>
      )}

      {turnsForDisplay.map((turn, index) => {
        const isLatest = index === 0;
        const turnOutputs = Array.isArray(turn.outputs) ? turn.outputs : [];
        const turnOutputsCount = turnOutputs.length;
        const turnDate = new Date(turn.timestamp).toLocaleString();
        const storedWinner = getWinnerInfoForTurn(turn);
        const fallbackLatestWinnerId =
          !storedWinner.outputId && isLatest && hasVoted ? votedFor : null;
        const fallbackLatestWinnerName = (() => {
          if (storedWinner.modelName || !isLatest || !fallbackLatestWinnerId) return null;
          const fallbackOutput = outputsById[fallbackLatestWinnerId];
          if (!fallbackOutput) return null;
          return (
            fallbackOutput.modelName ||
            getModelDisplayName(fallbackOutput.modelId)
          );
        })();
        const resolvedWinnerOutputId = storedWinner.outputId ?? fallbackLatestWinnerId;
        const resolvedWinnerModelName =
          storedWinner.modelName ?? fallbackLatestWinnerName ?? null;
        const hasResolvedWinner = Boolean(resolvedWinnerOutputId);
        return (
          <section
            key={turn.id}
            className={cn(
              "relative w-full overflow-hidden rounded-3xl border bg-gradient-to-br shadow-[0_40px_120px_-80px_rgba(147,51,234,0.55)]",
              isLatest
                ? "border-primary/30 from-primary/10 via-background/85 to-background"
                : "border-white/10 from-background/80 via-background/95 to-background"
            )}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 right-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute bottom-0 left-10 h-60 w-60 rounded-full bg-accent/8 blur-3xl" />
            </div>
            <div className="relative space-y-8 p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-white/10 bg-white/5/60 px-5 py-4 shadow-[0_30px_80px_-60px_rgba(147,51,234,0.65)] backdrop-blur-lg">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em]">
                    <span className={cn(isLatest ? "text-primary/70" : "text-muted-foreground/70")}>
                      {isLatest ? "Resultado atual" : "Histórico"}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground/60">{turnDate}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <h2 className="text-xl font-semibold text-foreground sm:text-2xl md:text-[30px]">
                      Comparativo de Respostas
                    </h2>
                    <p className="text-lg text-muted-foreground sm:text-xl">
                      Prompt:{" "}
                      <span className="font-medium text-primary/85">{turn.prompt}</span>
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-lg font-semibold",
                    isLatest
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-muted-foreground/80"
                  )}
                >
                  {turnOutputsCount} {turnOutputsCount === 1 ? "resposta" : "respostas"}
                </div>
              </div>

              <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:gap-10 2xl:gap-12">
                {turnOutputs.map((item, turnIndex) => {
                  const outputId = item.id;
                  const modelLabel = item.modelName || getModelDisplayName(item.modelId);
                  const isWinner = hasResolvedWinner && resolvedWinnerOutputId === outputId;
                  const isRunnerUp = hasResolvedWinner && resolvedWinnerOutputId !== outputId;
                  const answerText =
                    item.response && item.response.length > 0
                      ? item.response.trim()
                      : "Resposta não disponível";
                  const durationMs = Number.isFinite(item.responseTimeMs) ? item.responseTimeMs : 0;

                  const accentGradient = isWinner
                    ? "from-primary/95 via-primary/70 to-accent/80"
                    : "from-white/40 via-white/15 to-transparent";
                  const shouldRevealModelLabel = !isLatest || hasResolvedWinner;

                  return (
                    <Card
                      key={outputId}
                      className={cn(
                        "relative flex h-full flex-col overflow-hidden rounded-[30px] border border-white/15 bg-white/10/80 backdrop-blur-xl transition-all duration-300",
                        isLatest
                          ? "shadow-[0_35px_110px_-70px_rgba(79,70,229,0.6)] hover:border-primary/50 hover:shadow-[0_45px_130px_-70px_rgba(147,51,234,0.7)]"
                          : "shadow-[0_28px_80px_-70px_rgba(79,70,229,0.35)]",
                        isWinner && "border-primary/60 bg-primary/20 shadow-[0_45px_140px_-80px_rgba(147,51,234,0.85)]"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b",
                          accentGradient
                        )}
                      />
                      <CardHeader className="flex flex-col gap-2 border-b border-white/10 bg-white/5/70 p-5 pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="text-2xl font-semibold text-foreground sm:text-3xl">
                              Modelo {String.fromCharCode(65 + turnIndex)}
                            </CardTitle>
                            {shouldRevealModelLabel ? (
                              <p className="text-lg text-muted-foreground/80">{modelLabel}</p>
                            ) : (
                              <p className="text-lg italic text-muted-foreground/70">
                                Nome revelado após o voto
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-sidebar-foreground/70">
                            <Timer className="h-4 w-4 text-primary" />
                            <span className="tracking-wide">{formatTime(durationMs)}</span>
                          </div>
                        </div>
                        {isWinner && (
                          <Badge className="w-fit border border-primary/50 bg-primary/20 text-primary">
                            Selecionado
                          </Badge>
                        )}
                        {isRunnerUp && (
                          <Badge className="w-fit border border-white/10 bg-white/5 text-muted-foreground">
                            Não selecionado
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col p-0">
                        <div className="flex-1 space-y-5 border-b border-white/10 px-5 py-5">
                          <p className="whitespace-pre-line text-xl leading-relaxed text-foreground sm:text-2xl">
                            {renderAnswerWithThinkStyling(answerText)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-4 px-5 py-4">
                          {isLatest && !hasResolvedWinner && (
                            <Button
                              onClick={() => handleVote(outputId)}
                              className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/70 py-4 text-lg font-semibold text-primary-foreground shadow-[0_20px_55px_-25px_rgba(147,51,234,0.7)] hover:from-primary/90 hover:to-accent"
                            >
                              <ThumbsUp className="mr-2 h-4 w-4" /> Votar nesta resposta
                            </Button>
                          )}
                          {hasResolvedWinner && resolvedWinnerOutputId === outputId && (
                            <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
                              <div className="mb-2 flex items-center gap-3">
                                <Trophy className="h-6 w-6 text-primary" />
                                <h4 className="text-xl font-semibold text-primary">Seu voto contabilizado</h4>
                              </div>
                              <p className="text-lg text-foreground">
                                Você escolheu{" "}
                                <span className="font-medium">
                                  {resolvedWinnerModelName ?? modelLabel}
                                </span>{" "}
                                como melhor resposta.
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );

  const renderPromptSection = () => {
    const baseSuggestions = promptSuggestions.slice(0, 5);
    const suggestionsSet = new Set<string>(baseSuggestions);
    suggestionsSet.add(EXTRA_PROMPT_SUGGESTION);
    const suggestions = Array.from(suggestionsSet).slice(0, 6);

    return (
      <section className="mx-auto flex w-full max-w-[1400px] flex-col items-center space-y-6 px-2 text-center sm:px-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-primary/70">Arena</p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Encontre a melhor IA para você
          </h1>
          <p className="mx-auto max-w-4xl text-lg text-muted-foreground/90 sm:text-xl">
            Faça perguntas, compare respostas entre modelos e registre seu feedback.
          </p>
          {outputsCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              {outputsCount} {outputsCount === 1 ? "resposta" : "respostas"} analisadas
            </span>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((suggestion, index) => {
              const accent = SUGGESTION_CARD_ACCENTS[index % SUGGESTION_CARD_ACCENTS.length];
              return (
                <button
                  key={`${suggestion}-${index}`}
                  type="button"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={cn(
                    "group relative flex h-full min-h-[220px] flex-col items-start gap-3 overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-6 py-6 text-left text-lg text-foreground transition-all duration-300 ease-out",
                    "hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_28px_80px_-60px_rgba(147,51,234,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.99]",
                    accent,
                    "backdrop-blur-xl"
                  )}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Ideia
                  </div>
                  <p className="flex-1 text-lg font-medium leading-snug text-foreground transition-colors group-hover:text-white group-focus:text-white">
                    {suggestion}
                  </p>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    Usar
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, adjustTextareaHeight]);

  const renderPromptComposer = () => (
    <div className="sticky bottom-0 z-30 w-full border-t border-white/10 bg-white/5/30 backdrop-blur-lg">
      <div className={cn(ARENA_CONTAINER, "flex justify-center py-4")}>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Pergunte qualquer coisa..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={1}
                className="min-h-[70px] w-full resize-none overflow-hidden rounded-2xl border border-white/10 bg-black/40 py-4 pr-16 text-lg text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isRunning}
                onInput={(e) => {
                  adjustTextareaHeight(e.currentTarget);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!isRunning && prompt.trim()) {
                      runArena();
                    }
                  }
                }}
              />
              <Button
                onClick={runArena}
                disabled={isRunning || !prompt.trim()}
                className="absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-0 text-primary-foreground shadow-[0_25px_60px_-30px_rgba(147,51,234,0.8)] transition hover:from-primary/90 hover:to-accent"
              >
                {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    const containerPadding = hasPromptInteraction ? "pb-36" : "pb-[260px]";
    const baseWrapperClasses = cn("flex w-full justify-center", hasPromptInteraction ? "" : "overflow-visible");
    const innerWrapperClasses = cn(
      "flex w-full flex-col gap-6",
      containerPadding,
      hasPromptInteraction ? "" : "max-h-[calc(100vh-180px)] overflow-hidden"
    );

    return hasPromptInteraction ? (
      <div className="flex min-h-full w-full items-center justify-center py-10">
        <div className={cn(ARENA_CONTAINER, baseWrapperClasses)}>
          <div className={innerWrapperClasses}>
            {renderResultsSections()}
          </div>
        </div>
      </div>
    ) : (
      <div className="flex min-h-full w-full items-center justify-center py-10">
        <div className={cn(ARENA_CONTAINER, baseWrapperClasses)}>
          <div className={innerWrapperClasses}>
            {renderPromptSection()}
            {renderResultsSections()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(140%_140%_at_0%_-20%,rgba(147,51,234,0.18)_0%,rgba(15,23,42,0.88)_45%,rgba(2,6,23,1)_100%)]">
      <div
        className={cn(
          "flex-1 overflow-x-hidden",
          hasPromptInteraction ? "custom-scrollbar overflow-y-auto" : "overflow-hidden"
        )}
      >
        {renderMainContent()}
      </div>
      {!hasPromptInteraction && renderPromptComposer()}
    </div>
  );
});

export default ArenaInterface;
