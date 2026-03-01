export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      className="p-3 rounded-lg text-sm text-destructive"
      style={{ background: "rgba(244,63,94,0.1)" }}
    >
      {message}
    </div>
  );
}
