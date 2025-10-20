export interface AnswerTypeStats {
  correct: number;
  total: number;
  acc: number;
}

export interface BenchmarkDetails {
  id: string;
  model_name: string;
  technique?: string;
  task_type: string;
  score: number;
  metric: string;
  dataset: string | null;
  created_at?: string | null;
  total?: number;
  correct?: number;
  accuracy_percent?: number;
  by_answer_type?: Record<string, AnswerTypeStats>;
  mode?: string;
  generated_max_new_tokens?: number;
  stop_on_answer?: boolean;
  runtime_seconds?: number;
  avg_seconds_per_example?: number;
  out_dir?: string;
  model_path?: string;
  val_json?: string;
}

export const mockBenchmarks: BenchmarkDetails[] = [
  {
    id: "benchmark-1",
    model_name: "Gemma 3-4B Instruct",
    technique: "GRPO",
    task_type: "aqua_rat",
    dataset: "aqua_rat",
    score: 58,
    metric: "accuracy_percent",
    accuracy_percent: 58,
    total: 100,
    correct: 58,
    by_answer_type: {
      mcq: {
        total: 100,
        correct: 58,
        acc: 57.9999999999,
      },
    },
    mode: "concise_cot",
    generated_max_new_tokens: 512,
    stop_on_answer: false,
    runtime_seconds: 2002.94,
    avg_seconds_per_example: 20.029,
    out_dir: "/home/baggio/tcc-llm/models/outputs/grpo/gemma-3-4b-it/aqua_rat/eval/aqua_rat",
    model_path: "/home/baggio/tcc-llm/models/outputs/grpo/gemma-3-4b-it/aqua_rat/merged_fp16",
    val_json: "/home/baggio/tcc-llm/data/tasks/aqua_rat/val.json",
    created_at: "2025-10-10T09:00:00Z",
  },
  {
    id: "benchmark-2",
    model_name: "LLaMA 3.1 8B",
    technique: "Lora/QLora",
    task_type: "mmlu",
    dataset: "mmlu",
    score: 71.3,
    metric: "accuracy_percent",
    accuracy_percent: 71.3,
    total: 500,
    correct: 357,
    by_answer_type: {
      multiple_choice: {
        total: 500,
        correct: 357,
        acc: 71.4,
      },
    },
    mode: "chain_of_thought",
    generated_max_new_tokens: 768,
    stop_on_answer: true,
    runtime_seconds: 6810.52,
    avg_seconds_per_example: 13.621,
    out_dir: "/home/baggio/tcc-llm/models/outputs/lora/llama-3.1-8b/mmlu/eval/mmlu",
    model_path: "/home/baggio/tcc-llm/models/outputs/lora/llama-3.1-8b/mmlu/merged_fp16",
    val_json: "/home/baggio/tcc-llm/data/tasks/mmlu/val.json",
    created_at: "2025-10-10T20:15:00Z",
  },
  {
    id: "benchmark-3",
    model_name: "Mistral 7B",
    technique: "Modelo base",
    task_type: "gsm8k",
    dataset: "gsm8k",
    score: 42.6,
    metric: "accuracy_percent",
    accuracy_percent: 42.6,
    total: 1319,
    correct: 562,
    by_answer_type: {
      reasoning: {
        total: 1319,
        correct: 562,
        acc: 42.6,
      },
    },
    mode: "concise_answer",
    generated_max_new_tokens: 256,
    stop_on_answer: false,
    runtime_seconds: 9534.87,
    avg_seconds_per_example: 7.23,
    out_dir: "/home/baggio/tcc-llm/models/outputs/base/mistral-7b/gsm8k/eval/gsm8k",
    model_path: "/home/baggio/tcc-llm/models/outputs/base/mistral-7b/gsm8k/merged_fp16",
    val_json: "/home/baggio/tcc-llm/data/tasks/gsm8k/val.json",
    created_at: "2025-10-10T11:30:00Z",
  },
];
