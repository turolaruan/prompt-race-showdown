export interface AnswerTypeStats {
  correct: number;
  total: number;
  acc: number;
}

export interface BenchmarkDetails {
  id: string;
  model_path: string;
  model_name?: string | null;
  model_family?: string | null;
  task?: string | null;
  benchmark_name?: string | null;
  technique?: string | null;
  created_at?: string | null;
  total: number;
  correct: number;
  accuracy_percent: number;
  by_answer_type?: Record<string, AnswerTypeStats> | null;
  mode: string;
  generated_max_new_tokens?: number | null;
  stop_on_answer?: boolean | null;
  runtime_seconds?: number | null;
  avg_seconds_per_example?: number | null;
  out_dir?: string | null;
  val_json: string;
}

export const mockBenchmarks: BenchmarkDetails[] = [
  {
    id: "benchmark-1",
    model_name: "Gemma 3-4B Instruct",
    model_family: "Gemma 3-4B Instruct",
    model_path: "/home/baggio/tcc-llm/models/outputs/grpo/gemma-3-4b-it/aqua_rat/merged_fp16",
    task: "aqua_rat",
    benchmark_name: "aqua_rat",
    technique: "GRPO",
    total: 100,
    correct: 58,
    accuracy_percent: 58,
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
    val_json: "/home/baggio/tcc-llm/data/tasks/aqua_rat/val.json",
    created_at: "2025-10-10T09:00:00Z",
  },
  {
    id: "benchmark-2",
    model_name: "LLaMA 3.1 8B",
    model_family: "LLaMA 3.1 8B",
    model_path: "/home/baggio/tcc-llm/models/outputs/lora/llama-3.1-8b/mmlu/merged_fp16",
    task: "mmlu",
    benchmark_name: "mmlu",
    technique: "Lora/QLora",
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
    val_json: "/home/baggio/tcc-llm/data/tasks/mmlu/val.json",
    created_at: "2025-10-10T20:15:00Z",
  },
  {
    id: "benchmark-3",
    model_name: "Mistral 7B",
    model_family: "Mistral 7B",
    model_path: "/home/baggio/tcc-llm/models/outputs/base/mistral-7b/gsm8k/merged_fp16",
    task: "gsm8k",
    benchmark_name: "gsm8k",
    technique: "Modelo base",
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
    val_json: "/home/baggio/tcc-llm/data/tasks/gsm8k/val.json",
    created_at: "2025-10-10T11:30:00Z",
  },
];
