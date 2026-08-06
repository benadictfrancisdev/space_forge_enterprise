import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Link2, Plus, LogIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCollaborationContext } from "./CollaborationProvider";

interface JoinCollaborationDialogProps {
  datasetName?: string;
}

export const JoinCollaborationDialog = ({ datasetName }: JoinCollaborationDialogProps) => {
  const { joinRoom, isEnabled, roomId, leaveRoom, users } = useCollaborationContext();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [inputRoomId, setInputRoomId] = useState("");

  const generateRoomId = () => {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    joinRoom(newRoomId, datasetName);
    setOpen(false);
    toast({
      title: "Collaboration Started",
      description: "Share the room link with others to collaborate!"
    });
  };

  const handleJoinRoom = () => {
    if (!inputRoomId.trim()) {
      toast({
        title: "Enter Room ID",
        description: "Please enter a valid room ID to join",
        variant: "destructive"
      });
      return;
    }
    joinRoom(inputRoomId.trim(), datasetName);
    setOpen(false);
    toast({
      title: "Joined Room",
      description: "You've joined the collaboration session"
    });
  };

  const handleCopyLink = () => {
    if (!roomId) return;
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Share this link with collaborators"
    });
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    toast({
      title: "Left Room",
      description: "You've left the collaboration session"
    });
  };

  // If already in a room, show status/leave option
  if (isEnabled && roomId) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 py-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <Users className="h-3 w-3" />
          {users.length} online
        </Badge>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Copy className="h-3.5 w-3.5 mr-1" />
          Copy Link
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
          Leave
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Collaborate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Real-time Collaboration
          </DialogTitle>
          <DialogDescription>
            Work together on data analysis with your team in real-time
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 my-4">
          <Button
            variant={mode === "create" ? "default" : "outline"}
            onClick={() => setMode("create")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Room
          </Button>
          <Button
            variant={mode === "join" ? "default" : "outline"}
            onClick={() => setMode("join")}
            className="gap-2"
          >
            <LogIn className="h-4 w-4" />
            Join Room
          </Button>
        </div>

        {mode === "create" ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <h4 className="font-medium mb-2">What you can do together:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• See each other's cursors in real-time</li>
                <li>• Chat and discuss findings</li>
                <li>• Share queries and visualizations</li>
                <li>• Get AI assistance with @AI mentions</li>
              </ul>
            </div>
            <Button onClick={handleCreateRoom} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Start Collaboration Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomId">Room ID or Link</Label>
              <div className="flex gap-2">
                <Input
                  id="roomId"
                  placeholder="Enter room ID..."
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste the room ID or link shared by a collaborator
              </p>
            </div>
            <Button onClick={handleJoinRoom} className="w-full gap-2">
              <LogIn className="h-4 w-4" />
              Join Room
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
