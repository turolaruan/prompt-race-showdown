import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);

  const models = ["GPT-4", "Claude 3", "Gemini Pro", "LLaMA 3", "Mistral"];
  const tasks = ["Resumo", "Tradução", "Análise", "Criação", "Resposta"];
  const techniques = ["Few-shot", "Zero-shot", "Chain-of-thought", "Self-consistency", "ReAct"];

  const toggleSelection = (item: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleExport = () => {
    if (selectedModels.length === 0 || selectedTasks.length === 0 || selectedTechniques.length === 0) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione pelo menos um item de cada categoria.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Exportando modelo",
      description: `Exportando com ${selectedModels.length} modelo(s), ${selectedTasks.length} tarefa(s) e ${selectedTechniques.length} técnica(s).`,
    });

    // Aqui você implementaria a lógica real de exportação
    console.log({
      models: selectedModels,
      tasks: selectedTasks,
      techniques: selectedTechniques,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Exportação e análise de modelos</p>
        </div>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Selecione um modelo para exportar:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Models */}
            <div>
              <h3 className="text-sm font-medium mb-3">Modelos:</h3>
              <div className="flex flex-wrap gap-2">
                {models.map((model) => (
                  <Badge
                    key={model}
                    variant={selectedModels.includes(model) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => toggleSelection(model, selectedModels, setSelectedModels)}
                  >
                    {model}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="text-sm font-medium mb-3">Tarefa:</h3>
              <div className="flex flex-wrap gap-2">
                {tasks.map((task) => (
                  <Badge
                    key={task}
                    variant={selectedTasks.includes(task) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => toggleSelection(task, selectedTasks, setSelectedTasks)}
                  >
                    {task}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Techniques */}
            <div>
              <h3 className="text-sm font-medium mb-3">Técnica:</h3>
              <div className="flex flex-wrap gap-2">
                {techniques.map((technique) => (
                  <Badge
                    key={technique}
                    variant={selectedTechniques.includes(technique) ? "default" : "outline"}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => toggleSelection(technique, selectedTechniques, setSelectedTechniques)}
                  >
                    {technique}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleExport}
                className="gap-2"
                size="lg"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> A exportação gerará um arquivo contendo os modelos selecionados 
              com suas configurações de tarefa e técnica. O arquivo pode ser usado para implantação 
              ou análise posterior.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
