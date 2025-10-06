import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  modelName: string;
  technique: string;
}

const Leaderboard = () => {
  // Mock data - substituir com dados reais da API futuramente
  const [leaderboardData] = useState<LeaderboardEntry[]>([
    { rank: 1, modelName: "GPT-4", technique: "Few-shot" },
    { rank: 2, modelName: "Claude 3", technique: "Zero-shot" },
    { rank: 3, modelName: "Gemini Pro", technique: "Chain-of-thought" },
    { rank: 4, modelName: "LLaMA 3", technique: "Few-shot" },
    { rank: 5, modelName: "Mistral", technique: "Zero-shot" },
  ]);

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  const models = ["GPT-4", "Claude 3", "Gemini Pro", "LLaMA 3", "Mistral"];
  const tasks = ["Resumo", "Tradução", "Análise", "Criação", "Resposta"];
  const techniques = ["Few-shot", "Zero-shot", "Chain-of-thought", "Self-consistency", "ReAct"];

  const toggleModel = (model: string) => {
    setSelectedModels(prev =>
      prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  const handleExport = () => {
    // Implementar lógica de exportação
    console.log("Exportando dados...");
  };

  return (
    <div className="flex-1 flex flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-foreground mb-6">Leaderboard</h1>
      </div>

      {/* Filters - Top row */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-foreground">Filtros:</span>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Modelos ▼
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Tipo de redação ▼
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Tarefa ▼
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Técnica ▼
        </Badge>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-lg mb-8 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Rank</TableHead>
              <TableHead>Nome do modelo</TableHead>
              <TableHead>Técnica</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboardData.map((entry) => (
              <TableRow key={entry.rank}>
                <TableCell className="font-semibold text-lg">
                  {entry.rank}º
                </TableCell>
                <TableCell className="text-base">{entry.modelName}</TableCell>
                <TableCell className="text-base">{entry.technique}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Filter Selection Area */}
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione um modelo para exportar:
        </p>

        {/* Models */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Modelos:
          </label>
          <div className="flex flex-wrap gap-3">
            {models.map((model) => (
              <Button
                key={model}
                variant={selectedModels.includes(model) ? "default" : "outline"}
                onClick={() => toggleModel(model)}
                className="rounded-full px-6"
              >
                {model}
              </Button>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Tarefa:
          </label>
          <div className="flex flex-wrap gap-3">
            {tasks.map((task) => (
              <Button
                key={task}
                variant={selectedTask === task ? "default" : "outline"}
                onClick={() => setSelectedTask(task === selectedTask ? null : task)}
                className="rounded-full px-6"
              >
                {task}
              </Button>
            ))}
          </div>
        </div>

        {/* Techniques */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Técnica:
          </label>
          <div className="flex flex-wrap gap-3">
            {techniques.map((technique) => (
              <Button
                key={technique}
                variant={selectedTechnique === technique ? "default" : "outline"}
                onClick={() => setSelectedTechnique(technique === selectedTechnique ? null : technique)}
                className="rounded-full px-6"
              >
                {technique}
              </Button>
            ))}
            <Button
              onClick={handleExport}
              variant="default"
              className="rounded-full px-6 ml-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
