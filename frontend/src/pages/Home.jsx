import React from "react";
import Header from "../components/Header";
import Slider from "../components/Slider";
import FeaturedAnime from "../components/FeaturedAnime";
import Categories from "../components/Categories";
import Background from "../components/Background";
import "./Home.css";

export default function Home() {
  const featuredAnime = [
    { id: 1, name: "Naruto", img: "/beta-1.jpg" },
    { id: 2, name: "One Piece", img: "/beta-2.jpg" },
    { id: 3, name: "Demon Slayer", img: "/beta-3.jpg" },
    { id: 4, name: "Attack on Titan", img: "/beta-1.jpg" },
    { id: 5, name: "Bleach", img: "/beta-2.jpg" },
    { id: 6, name: "Jujutsu Kaisen", img: "/beta-3.jpg" },
  ];

  const categories = ["Action", "Romance", "Shonen", "Slice of Life", "Fantasy"];

  return (
    <div className="home-container">
      {/* Reusable Background */}
      <Background />

      <Header />
      <Slider />
      <FeaturedAnime animeList={featuredAnime} />
      <Categories categories={categories} />
    </div>
  );
}
