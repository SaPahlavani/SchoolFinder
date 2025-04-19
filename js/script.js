document.addEventListener("DOMContentLoaded", function () {
    const hamburgerBtn = document.querySelector(".label-hamberger");
    const mobileMenu = document.querySelector(".container-navbar-mobile");
    const closeBtn = document.querySelector(".close");

    // باز کردن منو با آیکون همبرگر
    hamburgerBtn.addEventListener("click", function () {
        mobileMenu.classList.add("show");
    });

    // بستن منو با دکمه "X"
    closeBtn.addEventListener("click", function () {
        mobileMenu.classList.remove("show");
    });

    // بستن منو با کلیک روی خارج از منو (اختیاری)
    document.addEventListener("click", function (e) {
        if (
            !mobileMenu.contains(e.target) &&
            !hamburgerBtn.contains(e.target)
        ) {
            mobileMenu.classList.remove("show");
        }
    });
});
