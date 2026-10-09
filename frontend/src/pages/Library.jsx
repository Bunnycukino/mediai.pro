import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { BookOpen, ExternalLink, Search } from "lucide-react";

// Link directory only. Publisher articles are not copied or supplied to AI.
import LIBRARY from "@/data/library.json";

export default function Library() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const categories = ["All topics", ...new Set(LIBRARY.map(item => item.category))];
  const results = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return LIBRARY.filter(item => (category === "All topics" || item.category === category) &&
      words.every(word => `${item.title} ${item.publisher} ${item.description} ${item.tags}`.toLocaleLowerCase().includes(word)));
  }, [query, category]);
  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A2E25]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-5 md:px-10 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-[#5C6A64] flex items-center gap-2"><BookOpen size={16} /> MediAI Library</p>
        <h1 className="font-heading text-4xl md:text-5xl mt-5">Explore trusted health resources</h1>
        <p className="text-[#5C6A64] text-lg mt-5 max-w-3xl">A growing directory of official health education, first aid and research resources. Read the original material on the publisher's website.</p>
        <aside className="mt-8 p-5 border border-[#E1DFDA] rounded-2xl bg-white" aria-label="Safety information">
          <h2 className="font-semibold">Education, with clear limits</h2>
          <p className="mt-2 text-sm leading-relaxed">MediAI is not a healthcare professional. AI responses can be inaccurate and cannot rule out serious illness. Do not change treatment or delay care because of an AI response. Discuss health decisions with a qualified professional. In a life-threatening emergency in the UK, call <a href="tel:999" className="underline font-semibold">999</a> or <a href="tel:112" className="underline font-semibold">112</a> immediately.</p>
          <p className="mt-3 text-sm text-[#5C6A64]">This directory links to external resources. It does not currently search their full articles or verify AI answers against them. Publishers do not endorse MediAI.</p>
        </aside>
        <div className="mt-9 grid md:grid-cols-[1fr_220px] gap-4">
          <div><label htmlFor="library-query" className="block text-sm font-medium mb-2">Search resources</label><div className="relative"><Search size={18} className="absolute left-4 top-4 text-[#5C6A64]" /><input id="library-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try first aid, research or pierwsza pomoc" className="w-full rounded-xl border border-[#E1DFDA] bg-white py-3 pl-11 pr-4" /></div></div>
          <div><label htmlFor="library-category" className="block text-sm font-medium mb-2">Category</label><select id="library-category" value={category} onChange={event => setCategory(event.target.value)} className="w-full rounded-xl border border-[#E1DFDA] bg-white p-3">{categories.map(value => <option key={value}>{value}</option>)}</select></div>
        </div>
        <p className="mt-5 text-sm text-[#5C6A64]" aria-live="polite">{results.length} {results.length === 1 ? "resource" : "resources"}</p>
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          {results.map(item => <article key={item.id} className="p-6 rounded-2xl border border-[#E1DFDA] bg-white flex flex-col"><p className="text-xs uppercase tracking-wide text-[#5C6A64]">{item.category}</p><h2 className="font-heading text-2xl mt-3">{item.title}</h2><p className="text-sm mt-2 font-medium">{item.publisher}</p><p className="text-[#5C6A64] mt-4 leading-relaxed flex-1">{item.description}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline mt-6 font-medium">Read original resource <ExternalLink size={15} /></a><p className="mt-3 text-xs text-[#5C6A64]">Link checked 9 October 2026 · English</p></article>)}
        </div>
        {results.length === 0 && <div className="rounded-2xl border border-[#E1DFDA] p-8 mt-5"><h2 className="font-semibold">No matching resources</h2><p className="mt-2 text-[#5C6A64]">Try a broader topic or another category. An empty result says nothing about your health.</p><button onClick={() => { setQuery(""); setCategory("All topics"); }} className="underline mt-4">Clear filters</button></div>}
        <footer className="mt-10 text-sm text-[#5C6A64]">Source selection prioritises official publishers. Clinical content stays with the original publisher, under its own terms. <Link to="/" className="underline ml-2">Back to MediAI</Link></footer>
      </main>
    </div>
  );
}
