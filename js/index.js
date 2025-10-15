
$(document).ready(function() {
    $('.publication-mousecell').mouseover(function() {
        $(this).find('video').css('display', 'inline-block');
        // order of the next two lines matters
        $(this).find('img').css('display', 'none');
        $(this).find('.image2').css('display', 'inline-block');
    });
    $('.publication-mousecell').mouseout(function() {
        $(this).find('video').css('display', 'none');
        // order of the next two lines matters
        $(this).find('img').css('display', 'inline-block');
        $(this).find('.image2').css('display', 'none');

    });

    $('.publication-mousecell').on('touchend', function() {
        $(this).find('video').css('display', 'none');
        // order of the next two lines matters
        $(this).find('img').css('display', 'inline-block');
        $(this).find('.image2').css('display', 'none');

    });

    $('.publication-mousecell').on('touchstart touchcancel touchmove', function() {
        $(this).find('video').css('display', 'inline-block');
        // order of the next two lines matters
        $(this).find('img').css('display', 'none');
        $(this).find('.image2').css('display', 'inline-block');
    });

})

// fix from https://stackoverflow.com/questions/58146137/closing-a-dropdown-navbar-on-click-in-javascript
document.addEventListener('DOMContentLoaded', () => {
    const navbarBurgers = document.querySelectorAll('.navbar-burger');
    const navbarItems = document.querySelectorAll(".navbar-item");

    navbarBurgers.forEach(burger_el => {
        burger_el.addEventListener('click', (event) => {
            // Toggle burger-menu
            document.getElementById(burger_el.dataset.target).classList.toggle('is-active');
            event.target.classList.toggle('is-active');
        });
        navbarItems.forEach(item => {
            item.addEventListener("click", (event) => {
                // Close burger-menu
                document.getElementById(burger_el.dataset.target).classList.remove('is-active');
                event.target.classList.remove('is-active');
            });
        });
    });

    // Open all links in a separate tab, excluding anchor links on the same page
    var links = document.links;
    for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href");
        // Check if the href starts with "#" or is an anchor to the current page
        if (href && !href.startsWith("#") && !href.startsWith(window.location.pathname + "#")) {
            links[i].target = "_blank";
        }
    }
});

