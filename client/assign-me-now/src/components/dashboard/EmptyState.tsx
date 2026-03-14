export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-lg">
      <p className="text-sm text-muted-foreground">No tasks found in this view.</p>
    </div>
  );
}
