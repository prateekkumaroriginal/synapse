import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ticketCreateFormSchema,
  type TicketCreateFormValues,
  type TicketCreateParsed,
} from "../../../convex/validations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function CreateTicketDialog({ projectId }: { projectId: Id<"projects"> }) {
  const [open, setOpen] = useState(false);
  const createTicket = useMutation(api.tickets.create);

  const form = useForm<TicketCreateFormValues, unknown, TicketCreateParsed>({
    resolver: zodResolver(ticketCreateFormSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: "",
      type: "TASK",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const onCreateSubmit = handleSubmit(async (data) => {
    try {
      await createTicket({
        projectId,
        title: data.title,
        description: data.description,
        type: data.type,
      });
      void reset({ title: "", description: "", type: data.type });
      setOpen(false);
      toast.success("Ticket created");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not create ticket.";
      toast.error(message);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="size-4" />
          Add Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void onCreateSubmit(e)}>
          <div className="py-4">
            <FieldGroup>
              <Field data-invalid={!!errors.title}>
                <FieldLabel htmlFor="dialog-ticket-title" required>
                  Title
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="dialog-ticket-title"
                    autoComplete="off"
                    placeholder="What needs to be done?"
                    disabled={isSubmitting}
                    aria-invalid={!!errors.title}
                    className="bg-muted"
                    {...register("title")}
                  />
                  <FieldError errors={[errors.title]} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.description}>
                <FieldLabel htmlFor="dialog-ticket-description">
                  Description
                </FieldLabel>
                <FieldContent>
                  <Textarea
                    id="dialog-ticket-description"
                    rows={3}
                    disabled={isSubmitting}
                    aria-invalid={!!errors.description}
                    className="bg-muted"
                    {...register("description")}
                  />
                  <FieldError errors={[errors.description]} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="dialog-ticket-type">Type</FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="dialog-ticket-type"
                          aria-invalid={!!errors.type}
                          className="bg-muted"
                        >
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TASK">Task</SelectItem>
                          <SelectItem value="BUG">Bug</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[errors.type]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
