import ConnectBar from "./components/ConnectBar";
import SearchHero from "./components/SearchHero";


export default function Page() {
  return (
    <main className="min-h-screen">
      <ConnectBar />
      <section className="px-4">
        <SearchHero />
      </section>
      <footer className="mt-24 py-10 text-center text-xs text-gray-400">
        SolGo • Built at a hackathon • Solana-first UX
      </footer>
    </main>
  )
}
