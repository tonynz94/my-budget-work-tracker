type Props = {
  title: string
  text: string
  step: string
}

// A simple page for the tabs I have not built yet.
export function Placeholder({ title, text, step }: Props) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <section className="card">
        <p className="card-label">{text}</p>
        <span className="chip">{step}</span>
      </section>
    </>
  )
}
