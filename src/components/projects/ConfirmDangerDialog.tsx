import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ConfirmDangerDialogProps = {
  action: "Archive" | "Delete";
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
};

export function ConfirmDangerDialog({
  action,
  projectName,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ConfirmDangerDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const expectedText = `I confirm to ${action} ${projectName}`;
  const isMatch = confirmText === expectedText;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            {action} Project
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please type{" "}
            <span className="font-semibold text-foreground">
              {expectedText}
            </span>{" "}
            to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedText}
            className="w-full"
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isMatch && !isPending) {
                e.preventDefault();
                onConfirm();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!isMatch || isPending}
            onClick={onConfirm}
          >
            {isPending ? "Please wait..." : action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
