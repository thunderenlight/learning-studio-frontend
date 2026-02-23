export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-10 h-10 rounded-full"
        style={{
          border: "3px solid rgba(255,255,255,0.08)",
          borderTopColor: "hsl(244, 95%, 69%)",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <p className="text-secondary-custom text-sm">Loading your projects…</p>
    </div>
  );
}
