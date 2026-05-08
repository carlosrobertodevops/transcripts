import { toast } from "sonner";

export function useToast() {
  return {
    toast: (opts: { title?: string; description?: string; variant?: "default" | "destructive" }) => {
      const msg = opts.title ?? opts.description ?? "";
      const desc = opts.title && opts.description ? opts.description : undefined;
      if (opts.variant === "destructive") return toast.error(msg, { description: desc });
      return toast.success(msg, { description: desc });
    },
  };
}

export { toast };
