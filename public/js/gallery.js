document.addEventListener("DOMContentLoaded", () => {
  const gallerySwiper = new Swiper(".gallery-swiper", {
    loop: true,

    spaceBetween: 20,

    centeredSlides: true,

    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
    },

    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },

    keyboard: {
      enabled: true,
    },

    breakpoints: {
      1024: {
        slidesPerView: 2,
        centeredSlides: true,
      },
    },
  });
});
