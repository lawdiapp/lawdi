type FormMessageProps = {
  children: string;
  type?: "error" | "success";
};

export function FormMessage({ children, type = "error" }: FormMessageProps) {
  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={
        type === "error"
          ? "rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          : "rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      }
    >
      {children}
    </p>
  );
}
