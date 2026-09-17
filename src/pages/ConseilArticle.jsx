import React, { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";
import { adviceArticles, getAdviceArticle } from "../data/adviceArticles.js";

export default function ConseilArticle() {
  const { id } = useParams();
  const article = getAdviceArticle(id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const previousTitle = document.title;
    document.title = article ? `${article.title} — PetLib` : "Conseil introuvable — PetLib";
    return () => {
      document.title = previousTitle;
    };
  }, [article]);

  const related = useMemo(() => {
    if (!article) return [];

    const sameCategory = adviceArticles.filter(
      (candidate) => candidate.id !== article.id && candidate.category === article.category
    );
    const others = adviceArticles.filter(
      (candidate) => candidate.id !== article.id && candidate.category !== article.category
    );

    return [...sameCategory, ...others].slice(0, 3);
  }, [article]);

  if (!article) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-10">
        <Card className="p-6">
          <div className="text-xl font-semibold">Conseil introuvable</div>
          <div className="mt-2 text-sm text-muted">
            Cet article n’existe pas ou n’est plus disponible.
          </div>
          <Link to="/conseils"><Button className="mt-5">Retour aux conseils</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 lg:px-20 py-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/conseils" className="text-sm text-brand font-medium hover:underline">
          ← Tous les conseils
        </Link>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <Tag>{article.category}</Tag>
          <span className="text-sm text-muted">Lecture {article.readTime}</span>
        </div>

        <h1 className="mt-4 text-3xl lg:text-4xl font-semibold leading-tight">{article.title}</h1>
        <p className="mt-4 text-lg text-muted leading-8">{article.intro}</p>

        {article.urgent ? (
          <Card className="mt-6 p-5 border-red-200">
            <div className="font-semibold">Si la situation paraît grave, n’attends pas.</div>
            <div className="mt-1 text-sm text-muted">
              Les informations ci-dessous sont générales. Si ton animal respire mal, perd connaissance, saigne beaucoup, convulse ou se dégrade rapidement, contacte immédiatement un vétérinaire ou un service de garde.
            </div>
            <Link to="/search?urgent=1"><Button className="mt-4">Chercher une urgence vétérinaire</Button></Link>
          </Card>
        ) : (
          <Card className="mt-6 p-5 border-amber-200">
            <div className="font-semibold">Conseil général</div>
            <div className="mt-1 text-sm text-muted">
              Cet article aide à préparer une démarche ou une consultation. Il ne remplace pas un examen vétérinaire ni un diagnostic.
            </div>
          </Card>
        )}

        <div className="mt-8 space-y-8">
          {article.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[15px] text-muted leading-7">
                  {paragraph}
                </p>
              ))}

              {section.bullets?.length ? (
                <ul className="mt-4 space-y-2 text-[15px] text-muted list-disc pl-5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="leading-6">{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <Card className="mt-10 p-6">
          <div className="text-lg font-semibold">Besoin d’un professionnel ?</div>
          <div className="mt-1 text-sm text-muted">
            PetLib peut t’aider à chercher un vétérinaire selon l’animal, le motif, le type de consultation et les disponibilités.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/search"><Button>Rechercher un vétérinaire</Button></Link>
            <Link to="/conseils"><Button variant="secondary">Voir les autres conseils</Button></Link>
          </div>
        </Card>
      </div>

      {related.length ? (
        <div className="mt-12">
          <div className="text-xl font-semibold">À lire aussi</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {related.map((item) => (
              <Link key={item.id} to={`/conseils/${item.id}`} className="block group">
                <Card className="p-5 h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <Tag>{item.category}</Tag>
                    <span className="text-xs text-muted">{item.readTime}</span>
                  </div>
                  <div className="mt-3 font-semibold group-hover:text-brand">{item.title}</div>
                  <div className="mt-2 text-sm text-muted leading-6">{item.summary}</div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
