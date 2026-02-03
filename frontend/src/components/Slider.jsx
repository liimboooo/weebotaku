import React, { useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useNavigate } from "react-router-dom"; // ✅ IMPORT
import "swiper/css";
import "swiper/css/pagination";
import "./Slider.css";

export default function Slider() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate(); // ✅ DEFINE

  const slides = [
    { id: 1, title: "Naruto", img: "/beta-1.jpg" },
    { id: 2, title: "One Piece", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-2.jpg" },
    { id: 3, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-3.jpg" },
    { id: 4, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-1.jpg" },
    { id: 5, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-2.jpg" },
    { id: 6, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-3.jpg" },
    { id: 7, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-1.jpg" },
    { id: 8, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-3.jpg" },
    { id: 9, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-2.jpg" },
    { id: 10, title: "Demon Slayer", description: "A young ninja chasing his dream to become Hokage.",img: "/beta-1.jpg" }
    
  ];

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="slider">
      <audio
        ref={audioRef}
        id="background-music"
        loop
        src="https://github.com/ecemgo/mini-samples-great-tricks/raw/main/song-list/stranger-things-luxide-remix-no-copyright-music.mp3"
      />

      <button id="play-pause-button" onClick={togglePlayPause}>
        <ion-icon
          className={`audio-icon ${isPlaying ? "hidden" : ""}`}
          id="play-music"
          name="play"
        ></ion-icon>
        <ion-icon
          className={`audio-icon ${!isPlaying ? "hidden" : ""}`}
          id="pause-music"
          name="pause"
        ></ion-icon>
      </button>
      <Swiper
  modules={[Autoplay]}
  grabCursor={true}
  slidesPerView={"auto"}
  centeredSlides={true}
  spaceBetween={8}
  loop={false} // disable loop for proper starting order
  speed={1000}
  autoplay={{
    delay: 2000,
    disableOnInteraction: false,
  }}
>
  onSwiper={(swiper) => {
  setTimeout(() => {
    swiper.slideTo(0, 0, false); // jump to first real slide without animation
    swiper.autoplay.start();     // restart autoplay
  }, 100); // small delay to let Swiper finish mounting
}}



{slides.map((slide) => (
  <SwiperSlide
    key={slide.id}
    onClick={() => navigate(`/anime/${slide.id}`)}
    className="anime-slide"
  >
    <img src={slide.img} alt={slide.title} />

    <div className="anime-info">
      <span className="anime-desc">{slide.description}</span>
      <p className="anime-title">{slide.title}</p>
    </div>
  </SwiperSlide>
))}
</Swiper>

    </div>
  );
}
