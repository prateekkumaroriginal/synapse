import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Search, UserPlus } from "lucide-react";
import { initialsFromViewer } from "@/lib/viewer-display";
import { useDebounce } from "@/hooks/use-debounce";

type UserResult = {
  _id: Id<"users">;
  name: string;
  email: string;
};

function UserResultItem({
  user,
  addingId,
  onAdd,
}: {
  user: UserResult;
  addingId: Id<"users"> | null;
  onAdd: (userId: Id<"users">) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-3 overflow-hidden">
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="bg-secondary text-xs font-medium">
            {initialsFromViewer(user.email, user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-medium">
            {user.name || "Unknown"}
          </span>
          {user.email && (
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          )}
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="shrink-0"
            disabled={addingId !== null}
            onClick={() => onAdd(user._id)}
          >
            {addingId === user._id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            <span className="sr-only">Add to Project</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add to Project</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function InviteMemberDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const results = useQuery(api.users.searchUsers, {
    query: debouncedQuery,
    projectId,
  });

  const addMember = useMutation(api.projectMembers.addMember);
  const [addingId, setAddingId] = useState<Id<"users"> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const handleAdd = async (userId: Id<"users">) => {
    setAddingId(userId);
    try {
      await addMember({ projectId, userId });
      toast.success("Member added to project");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add member";
      toast.error(msg);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex h-[240px] flex-col gap-2 overflow-y-auto">
            {debouncedQuery.length < 2 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : results === undefined ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              results.map((user) => (
                <UserResultItem
                  key={user._id}
                  user={user}
                  addingId={addingId}
                  onAdd={(id) => void handleAdd(id)}
                />
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
