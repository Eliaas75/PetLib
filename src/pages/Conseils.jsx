import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Tag from "../components/Tag.jsx";

const categories = ["Tous", "Prévention", "Urgence", "NAC", "Nutrition", "Transport"];

const articles = [
  {
    id: "prepare-vet-visit",
    category: "Prévention",
    title: "Bien préparer une consultation vétérinaire",
    summary: "Les informations utiles à rassembler avant un rendez-vous : symptômes observés, traitements, alimentation et historique récent.",
    readTime: "4 min",
  },
  {
    id: "when-emergency",
    category: "Urgence",
    title: "Quand contacter rapidement un vétérinaire ?",
    summary: "Repérer les situations qui nécessitent une prise en charge rapide sans tenter de poser soi-même un diagnostic.",
    readTime: "5 min",
  },
  {
    id: "nac-visit",
    category: "NAC",
    title: "Trouver un vétérinaire adapté à un NAC",
    summary: "Lapins, oiseaux, reptiles, rongeurs ou furets : tous les praticiens ne prennent pas en charge les mêmes espèces.",
    readTime: "4 min",
  },
  {
    id: "food-transition",
    category: "Nutrition",
    title: "Changer l’alimentation de son animal progressivement",
    summary: "Pourquoi les changements alimentaires brusques sont à éviter et quelles informations demander à son vétérinaire.",
    readTime: "3 min",
  },
  {
    id: "safe-transport",
    category: "Transport",
    title: "Transporter son animal sans ajouter de stress inutile",
    summary: "Caisse, température, trajet et préparation : les bons réflexes avant de se rendre en consultation.",
    readTime: "4 min",
  },
  {
    id: "health-record",
    category: "Prévention",
    title: "Les informations santé à garder à portée de main",
    summary: "Vaccins, traitements, allergies, poids et identification : une fiche claire peut faire gagner du temps en consultation.",
    readTime: "3 min",
  },
];

export default function Conseils() {
  const [category, setCategory] = useState("Tous");

  const visibleArticles = useMemo(
    () => (category === "Tous" ? articles : articles.filter((article) => article.category === category)),
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
        {categories.map((item) => (
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
          <Card key={article.id} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <Tag>{article.category}</Tag>
              <span className="text-xs text-muted">{article.readTime}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{article.title}</h2>
            <p className="mt-2 text-sm text-muted leading-6">{article.summary}</p>
            <div className="mt-4 text-xs text-muted">
              Article détaillé bientôt disponible. Cette première version permet déjà d’organiser le centre de conseils par thème.
            </div>
          </Card>
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
