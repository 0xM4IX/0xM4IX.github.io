document.addEventListener("DOMContentLoaded", () => {

    const progress = document.getElementById("reading-progress");

    if (!progress) return;

    const updateProgress = () => {

        const scrollTop =
            window.scrollY;

        const documentHeight =
            document.documentElement.scrollHeight -
            window.innerHeight;

        const percent =
            documentHeight > 0
                ? (scrollTop / documentHeight) * 100
                : 0;

        progress.style.width = `${percent}%`;
    };

    updateProgress();

    window.addEventListener("scroll", updateProgress);
    window.addEventListener("resize", updateProgress);

});