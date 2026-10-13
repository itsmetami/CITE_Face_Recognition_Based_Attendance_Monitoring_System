type CiteBrandProps = { inverse?: boolean };

export function CiteBrand({ inverse = false }: CiteBrandProps) {
  return (
    <div className="inline-flex items-center gap-3" aria-label="CITE Faculty Attendance">
      <span
        aria-hidden="true"
        className={`grid size-11 grid-cols-2 grid-rows-2 gap-1 rounded-2xl p-2 shadow-lg ${
          inverse ? "bg-white/10 ring-1 ring-white/15" : "bg-[#18231b]"
        }`}
      >
        <span className="col-span-2 rounded-sm bg-[#ed7a2b]" />
        <span className="rounded-sm bg-white/90" />
        <span className="rounded-sm bg-[#5c9b68]" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-base font-extrabold tracking-[0.16em] ${inverse ? "text-white" : "text-foreground"}`}>
          CITE
        </span>
        <span className={`mt-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.15em] ${inverse ? "text-white/60" : "text-muted-foreground"}`}>
          Faculty attendance
        </span>
      </span>
    </div>
  );
}
