export function BgGrid() {
  return (
    <>
      <div className="fixed inset-0 -z-10 pointer-events-none bg-grid-faded" />
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>
    </>
  );
}
