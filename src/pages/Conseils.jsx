import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";
import { adviceArticles, adviceCategories } from "../data/adviceArticles.js";

export default function Conseils() {
  const [category, setCategory] = useState("Tous");

  const visibleArticles = useMemo(
    () => (category === "Tous" ? adviceArticles : adviceArticles.filter((article) => article.category === category)),
    [category]
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
      <div className="max-w-3xl">
        <Tag>Conseils PetLib</Tag>
        <h1 className="mt-3 text-3xl lg:text-4xl font-semibold">Mieux préparer la santé et les rendez-vous de ton animal.</h1>
        <p className="mt-3 text-muted">
          Des contenus pratiques pour t’aider à préparer une consultation, comprendre quand chercher un professionnel et trouver le bon type de prise en charge.
        </p>
      </div>

      <Card className="mt-6 p-5 border-amber-200">
        <div className="font-semibold">Information générale, pas diagnostic</div>
        <div className="mt-1 text-sm text-muted">
          Les conseils PetLib ne remplacent pas l’avis d’un vétérinaire. En cas de doute important ou de dégradation rapide de l’état de ton animal, contacte directement un professionnel.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/search?urgent=1"><Button>Trouver une urgence</Button></Link>
          <Link to="/search"><Button variant="secondary">Trouver un vétérinaire</Button></Link>
        </div>
      </Card>

      <div className="mt-8 flex flex-wrap gap-2">
        {adviceCategories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={[
              "px-4 py-2 rounded-xl border text-sm transition",
              category === item ? "bg-brand text-white border-brand" : "bg-white border-border hover:bg-black/2",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleArticles.map((article) => (
          <Link key={article.id} to={`/conseils/${article.id}`} className="block group">
            <Card className="p-5 h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <Tag>{article.category}</Tag>
                <span className="text-xs text-muted">{article.readTime}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold group-hover:text-brand">{article.title}</h2>
              <p className="mt-2 text-sm text-muted leading-6">{article.summary}</p>
              <div className="mt-5 text-sm font-medium text-brand">Lire l’article →</div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <div className="text-lg font-semibold">Tu cherches surtout un rendez-vous ?</div>
        <div className="mt-1 text-sm text-muted">
          Utilise directement le moteur PetLib pour filtrer par animal, motif, type de consultation et disponibilité.
        </div>
        <Link to="/search"><Button className="mt-4">Rechercher un praticien</Button></Link>
      </Card>
    </div>
  );
}
