import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Send,
  UserPlus,
  Clock,
  Eye,
  Edit3,
  Sparkles,
  Link2,
  Crown,
  Activity,
  BarChart3,
  FileText,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DatasetState } from "@/pages/DataAgent";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "owner" | "editor" | "viewer";
  status: "online" | "away" | "offline";
  lastActive?: string;
  cursor?: { x: number; y: number; color: string };
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  target?: {
    type: "column" | "row" | "cell" | "chart" | "insight";
    reference: string;
  };
  resolved?: boolean;
}

interface TeamCollaborationHubProps {
  dataset: DatasetState;
  sessionId?: string;
}

const CURSOR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"
];

const TeamCollaborationHub = ({ dataset, sessionId }: TeamCollaborationHubProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // Initialize with current user
    if (user) {
      setMembers([{
        id: user.id,
        name: user.email?.split("@")[0] || "You",
        email: user.email || "",
        role: "owner",
        status: "online",
        lastActive: new Date().toISOString(),
      }]);
    }

    // Generate share link
    const baseUrl = window.location.origin;
    const collabId = sessionId || crypto.randomUUID().slice(0, 8);
    setShareLink(`${baseUrl}/data-agent?collab=${collabId}`);
  }, [user, sessionId]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      toast.success("Share link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const inviteMember = () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }

    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: "editor",
      status: "offline",
    };

    setMembers(prev => [...prev, newMember]);
    setInviteEmail("");
    toast.success(`Invitation sent to ${inviteEmail}`);
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
    toast.success("Member removed");
  };

  const changeRole = (id: string, role: TeamMember["role"]) => {
    setMembers(prev => prev.map(m => 
      m.id === id ? { ...m, role } : m
    ));
  };

  const addComment = () => {
    if (!newComment.trim() || !user) return;

    const comment: Comment = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.email?.split("@")[0] || "User",
      content: newComment,
      timestamp: new Date().toISOString(),
    };

    setComments(prev => [...prev, comment]);
    setNewComment("");
  };

  const resolveComment = (id: string) => {
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, resolved: true } : c
    ));
  };

  const deleteComment = (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const onlineCount = members.filter(m => m.status === "online").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Collaboration</CardTitle>
                <CardDescription>
                  Work together in real-time on {dataset.name}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isLive ? "default" : "outline"} className={cn(
                isLive && "bg-green-500/20 text-green-500 border-green-500/30"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  isLive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                )} />
                {isLive ? "Live" : "Offline"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLive(!isLive)}
              >
                {isLive ? "Disconnect" : "Go Live"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Share & Invite */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Share Link */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Share Link</label>
              <div className="flex gap-2">
                <Input value={shareLink} readOnly className="text-sm" />
                <Button size="icon" variant="outline" onClick={copyShareLink}>
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Invite by Email */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Invite by Email</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  onKeyDown={(e) => e.key === "Enter" && inviteMember()}
                />
                <Button size="icon" onClick={inviteMember}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Team
              </CardTitle>
              <Badge variant="secondary">
                {onlineCount} online
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {members.map((member, idx) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback style={{ backgroundColor: CURSOR_COLORS[idx % CURSOR_COLORS.length] + "40" }}>
                          {member.name[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                        member.status === "online" ? "bg-green-500" :
                        member.status === "away" ? "bg-yellow-500" : "bg-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{member.name}</span>
                        {member.role === "owner" && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {member.role}
                    </Badge>
                    {member.id !== user?.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity Stats */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Session Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <div className="text-2xl font-bold text-primary">{members.length}</div>
                <div className="text-xs text-muted-foreground">Team Members</div>
              </div>
              <div className="p-3 rounded-lg bg-accent/10 text-center">
                <div className="text-2xl font-bold text-accent">{comments.length}</div>
                <div className="text-xs text-muted-foreground">Comments</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {dataset.rawData.length.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Rows Shared</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {dataset.columns.length}
                </div>
                <div className="text-xs text-muted-foreground">Columns</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comments Section */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Discussion Thread
            {comments.filter(c => !c.resolved).length > 0 && (
              <Badge variant="secondary">
                {comments.filter(c => !c.resolved).length} open
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment Input */}
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or insight..."
              className="min-h-[80px]"
            />
          </div>
          <Button onClick={addComment} disabled={!newComment.trim()} className="gap-2">
            <Send className="w-4 h-4" />
            Post Comment
          </Button>

          {/* Comments List */}
          {comments.length > 0 && (
            <ScrollArea className="h-[300px] mt-4">
              <div className="space-y-4">
                {comments.map(comment => {
                  const memberIdx = members.findIndex(m => m.id === comment.userId);
                  const color = CURSOR_COLORS[memberIdx >= 0 ? memberIdx : 0];

                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        "p-4 rounded-xl border transition-colors",
                        comment.resolved
                          ? "bg-muted/20 border-border/30 opacity-60"
                          : "bg-muted/30 border-border/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.userAvatar} />
                          <AvatarFallback style={{ backgroundColor: color + "40" }}>
                            {comment.userName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.userName}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {!comment.resolved && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => resolveComment(comment.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => deleteComment(comment.id)}
                              >
                                <Trash2 className="w-3 h-3 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                          {comment.target && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {comment.target.type}: {comment.target.reference}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {comments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs">Start a discussion about the data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamCollaborationHub;
