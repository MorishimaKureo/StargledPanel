document.addEventListener("DOMContentLoaded", function() {
    const inputs = document.querySelectorAll("input");

    inputs.forEach(input => {
        input.addEventListener("input", function(event) {
            let lastChar = event.target.value.slice(-1);
            if (lastChar) {
                let span = document.createElement("span");
                span.classList.add("glowing-text");
                span.textContent = lastChar;

                // Tambahkan ke dalam input field sebagai span terpisah
                event.target.insertAdjacentHTML("beforeend", span.outerHTML);
                
                // Hapus efek setelah animasi selesai
                setTimeout(() => {
                    span.remove();
                }, 500);
            }
        });
    });
});