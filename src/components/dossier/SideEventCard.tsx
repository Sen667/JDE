import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FileText,
  MessageSquare,
  Calendar,
  ListTodo,
  StickyNote,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SideEventCardProps {
  event: {
    id: string;
    type: "document" | "comment" | "task" | "appointment" | "annotation";
    timestamp: string;
    title: string;
    description?: string;
    status?: string;
    metadata?: any;
    createdBy?: { display_name: string; avatar_url: string | null; email: string };
    assignedTo?: { display_name: string; avatar_url: string | null; email: string };
  };
  side: "left" | "right";
  onClick?: () => void;
}

const SideEventCard = ({ event, side, onClick }: SideEventCardProps) => {
  const getIcon = () => {
    switch (event.type) {
      case "document":
        return <FileText className="h-3.5 w-3.5 text-purple-500" />;
      case "comment":
        return <MessageSquare className="h-3.5 w-3.5 text-orange-500" />;
      case "task":
        return <ListTodo className="h-3.5 w-3.5 text-blue-500" />;
      case "appointment":
        return <Calendar className="h-3.5 w-3.5 text-green-500" />;
      case "annotation":
        return <StickyNote className="h-3.5 w-3.5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (event.type) {
      case "document":
        return "Document";
      case "comment":
        return "Commentaire";
      case "task":
        return "Tâche";
      case "appointment":
        return "Rendez-vous";
      case "annotation":
        return "Note";
      default:
        return "";
    }
  };

  return (
    <div className="relative">
      {/* Dotted connection line */}
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-6 border-t-2 border-dashed border-muted-foreground/40",
          side === "left" ? "right-full" : "left-full"
        )} 
      />
      
      {/* Compact Event card */}
      <Card
        className={cn(
          "w-full cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] border-l-2 shadow-sm",
          event.type === "document" && "border-l-purple-500",
          event.type === "comment" && "border-l-orange-500",
          event.type === "task" && "border-l-blue-500",
          event.type === "appointment" && "border-l-green-500",
          event.type === "annotation" && "border-l-yellow-500"
        )}
        onClick={onClick}
      >
        <CardContent className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium line-clamp-1 mb-0.5">{event.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(event.timestamp), "dd MMM HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SideEventCard;
