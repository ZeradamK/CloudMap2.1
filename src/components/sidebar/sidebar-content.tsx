"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {Icons} from "@/components/icons";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {useState} from "react";
import {useToast} from "@/hooks/use-toast";
import {generateArchitectureSuggestion} from "@/ai/flows/generate-architecture-suggestion";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

const SidebarArchitectureForm = () => {
  const [problemStatement, setProblemStatement] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {toast} = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await generateArchitectureSuggestion({problemStatement});
      toast({
        title: "Architecture Suggestion Generated",
        description: "Check diagram editor for the suggestion.",
      });
      console.log(result); // Handle the result
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Architecture Suggestion</CardTitle>
        <CardDescription>
          Enter a problem statement to generate an architecture suggestion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <Textarea
            placeholder="e.g. Build an AI-based e-commerce recommendation engine"
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
          />
          <Button disabled={isLoading} type="submit">
            {isLoading ? "Generating..." : "Generate Architecture"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const SidebarContentComponent = () => {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarHeader>
          <SidebarTrigger className="md:hidden">
            <Icons.panelLeft/>
          </SidebarTrigger>
        </SidebarHeader>
        <SidebarArchitectureForm/>
      </SidebarContent>
    </Sidebar>
  );
};

export default SidebarContentComponent;
