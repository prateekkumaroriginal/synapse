import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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

type FormValues = { confirmText: string };

export function ConfirmDangerDialog({
  action,
  projectName,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ConfirmDangerDialogProps) {
  const expectedText = `I confirm to ${action} ${projectName}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({ confirmText: z.literal(expectedText) }),
    ),
    defaultValues: { confirmText: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) form.reset();
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

        <form
          onSubmit={(event) => {
            void form.handleSubmit(onConfirm)(event);
          }}
          className="py-4 flex flex-col gap-4"
        >
          <Input
            autoFocus
            {...form.register("confirmText")}
            placeholder={expectedText}
            disabled={isPending}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!form.formState.isValid || isPending}
            >
              {isPending ? "Please wait..." : action}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
