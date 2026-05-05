import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import "swiper/css";
import "swiper/css/pagination";
import "./Slider.css";

export default function Slider({ sliderData }) {
  const navigate = useNavigate();

  if (!sliderData || sliderData.length === 0) return null;

  return (
    <div className="slider">
      <Swiper
        modules={[Autoplay]}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={"auto"}
        spaceBetween={50}
        loop={false}
        rewind={true}
        speed={1000}
        allowTouchMove={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        onSwiper={(swiper) => {
          setTimeout(() => {
            if (swiper.autoplay) {
              swiper.autoplay.stop();
              swiper.autoplay.start();
            }
          }, 100);
        }}
      >
        {sliderData.map((slide) => (
          <SwiperSlide
            key={slide.id}
            onClick={(e) => {
              if (document.startViewTransition) {
                const img = e.currentTarget.querySelector('img');
                const title = e.currentTarget.querySelector('.anime-title');
                if (img) img.style.viewTransitionName = `anime-card-${slide.id}`;
                if (title) title.style.viewTransitionName = `anime-title-${slide.id}`;

                const x = e.clientX;
                const y = e.clientY;

                document.startViewTransition(() => {
                  navigate(`/anime/${slide.id}`);
                }).ready.then(() => {
                  // Smooth fade transition
                  gsap.fromTo(
                    document.documentElement,
                    { '--reveal-radius': '0%', '--reveal-x': `${x}px`, '--reveal-y': `${y}px` },
                    { '--reveal-radius': '110%', duration: 0.7, ease: "power3.inOut" }
                  );
                });
              } else {
                navigate(`/anime/${slide.id}`);
              }
            }}
            className="anime-slide"
          >
            <img src={slide.img} alt={slide.name} />

            <div className="anime-info">
              <div className="anime-meta">
                <div className="anime-rating">
                  <ion-icon name="star"></ion-icon>
                  <span>{slide.rating}</span>
                </div>
                <span className={`anime-status ${slide.status?.toLowerCase()}`}>{slide.status}</span>
              </div>
              <p className="anime-title">{slide.name}</p>
              <div className="anime-genres">
                {slide.genres?.slice(0, 3).map((genre, index) => (
                  <span key={index} className="genre-tag">{genre}</span>
                ))}
              </div>
              <span className="anime-desc">{slide.description}</span>
              <div className="anime-additional-info">
                <div className="info-item">
                  <ion-icon name="film"></ion-icon>
                  <strong>{slide.episodes}</strong> Episodes
                </div>
                <div className="info-item">
                  <ion-icon name="person"></ion-icon>
                  {slide.studio}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
