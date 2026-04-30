import React, { useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import "swiper/css";
import "swiper/css/pagination";
import "./Slider.css";

export default function Slider({ sliderData }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!sliderData || sliderData.length === 0) return null;

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
        loop={false}
        speed={1000}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
      >
        {sliderData.map((slide) => (
          <SwiperSlide
            key={slide.id}
            onClick={() => navigate(`/anime/${slide.id}`)}
            className="anime-slide"
          >
            <img src={slide.img} alt={slide.name} />

            <div className="anime-info">
              <span className="anime-desc">{slide.description}</span>
              <p className="anime-title">{slide.name}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
